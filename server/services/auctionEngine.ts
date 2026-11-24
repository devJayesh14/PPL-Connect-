import { Server as SocketServer } from 'socket.io';
import { db } from '../db/index.js';
import { validateTeamBid } from './purseValidator.js';

export interface LivePlayerState {
  auctionPlayerId: string;
  playerId: string;
  fullName: string;
  photo?: string;
  playingRole: string;
  battingStyle?: string;
  bowlingStyle?: string;
  categoryName?: string;
  basePrice: number;
  currentOrder: number;
  isOverseas: boolean;
  age?: number;
  previousTeam?: string;
  experience?: string;
}

export interface LiveBid {
  id: string;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  teamColor?: string;
  captainName?: string;
  amount: number;
  timestamp: string;
}

export interface AuctionRoomState {
  auctionId: string;
  status: 'IDLE' | 'BIDDING' | 'PAUSED' | 'SOLD' | 'UNSOLD' | 'COMPLETED';
  currentPlayer: LivePlayerState | null;
  currentBid: number;
  highestBidder: {
    teamId: string;
    teamName: string;
    teamLogo?: string;
    teamColor?: string;
  } | null;
  nextBidAmount: number;
  bidHistory: LiveBid[];
  timerSeconds: number;
  isTimerRunning: boolean;
  totalPendingPlayers: number;
  totalSoldPlayers: number;
  totalUnsoldPlayers: number;
}

class AuctionEngine {
  private io: SocketServer | null = null;
  private rooms: Map<string, AuctionRoomState> = new Map();
  private timerIntervals: Map<string, NodeJS.Timeout> = new Map();

  public setSocketServer(io: SocketServer) {
    this.io = io;
  }

  public getRoomState(auctionId: string): AuctionRoomState {
    let state = this.rooms.get(auctionId);
    if (!state) {
      state = this.initializeRoomState(auctionId);
      this.rooms.set(auctionId, state);
    }
    return state;
  }

  private initializeRoomState(auctionId: string): AuctionRoomState {
    const counts = db.prepare(`
      SELECT 
        SUM(CASE WHEN ap.status = 'PENDING' AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED') AND ap.player_id NOT IN (SELECT player_id FROM team_squads) AND ap.player_id NOT IN (SELECT p2.id FROM players p2 JOIN captains c ON (c.player_id = p2.id OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email)) OR (c.mobile != '' AND c.mobile = p2.mobile) OR LOWER(c.name) = LOWER(p2.full_name)) WHERE c.status != 'REJECTED') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN ap.status = 'SOLD' THEN 1 ELSE 0 END) as sold,
        SUM(CASE WHEN ap.status = 'UNSOLD' AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED') AND ap.player_id NOT IN (SELECT player_id FROM team_squads) AND ap.player_id NOT IN (SELECT p2.id FROM players p2 JOIN captains c ON (c.player_id = p2.id OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email)) OR (c.mobile != '' AND c.mobile = p2.mobile) OR LOWER(c.name) = LOWER(p2.full_name)) WHERE c.status != 'REJECTED') THEN 1 ELSE 0 END) as unsold,
        SUM(CASE WHEN ap.status = 'IN_AUCTION' AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED') AND ap.player_id NOT IN (SELECT player_id FROM team_squads) AND ap.player_id NOT IN (SELECT p2.id FROM players p2 JOIN captains c ON (c.player_id = p2.id OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email)) OR (c.mobile != '' AND c.mobile = p2.mobile) OR LOWER(c.name) = LOWER(p2.full_name)) WHERE c.status != 'REJECTED') THEN 1 ELSE 0 END) as inAuction
      FROM auction_players ap
      WHERE ap.auction_id = ?
    `).get(auctionId) as any;

    // Check if there is already an active player in auction (excluding sold/retained/captains)
    const activePlayerRow = db.prepare(`
      SELECT ap.*, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age, p.previous_team, p.experience, pc.name as category_name
      FROM auction_players ap
      JOIN players p ON ap.player_id = p.id
      LEFT JOIN player_categories pc ON ap.category_id = pc.id
      WHERE ap.auction_id = ? AND ap.status = 'IN_AUCTION'
        AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')
        AND ap.player_id NOT IN (SELECT player_id FROM team_squads)
        AND ap.player_id NOT IN (
          SELECT p2.id FROM players p2
          JOIN captains c ON (
            c.player_id = p2.id
            OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email))
            OR (c.mobile != '' AND c.mobile = p2.mobile)
            OR LOWER(c.name) = LOWER(p2.full_name)
          )
          WHERE c.status != 'REJECTED'
        )
    `).get(auctionId) as any;

    let currentPlayer: LivePlayerState | null = null;
    let currentBid = 0;
    let highestBidder = null;
    let bidHistory: LiveBid[] = [];
    let nextBidAmount = 0;

    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
    const bidIncrement = config ? config.bid_increment : 5000;

    if (activePlayerRow) {
      currentPlayer = {
        auctionPlayerId: activePlayerRow.id,
        playerId: activePlayerRow.player_id,
        fullName: activePlayerRow.full_name,
        photo: activePlayerRow.photo,
        playingRole: activePlayerRow.playing_role,
        battingStyle: activePlayerRow.batting_style,
        bowlingStyle: activePlayerRow.bowling_style,
        categoryName: activePlayerRow.category_name,
        basePrice: activePlayerRow.base_price,
        currentOrder: activePlayerRow.current_order,
        isOverseas: activePlayerRow.is_overseas === 1,
        age: activePlayerRow.age,
        previousTeam: activePlayerRow.previous_team,
        experience: activePlayerRow.experience,
      };

      // Fetch bids for this player
      const bids = db.prepare(`
        SELECT b.*, t.name as team_name, t.logo as team_logo, t.color as team_color, c.name as captain_name
        FROM bids b
        JOIN teams t ON b.team_id = t.id
        LEFT JOIN captains c ON b.captain_id = c.id
        WHERE b.auction_id = ? AND b.player_id = ?
        ORDER BY b.bid_amount ASC
      `).all(auctionId, activePlayerRow.player_id) as any[];

      if (bids.length > 0) {
        bidHistory = bids.map(b => ({
          id: b.id,
          teamId: b.team_id,
          teamName: b.team_name,
          teamLogo: b.team_logo,
          teamColor: b.team_color,
          captainName: b.captain_name,
          amount: b.bid_amount,
          timestamp: b.timestamp,
        }));
        const lastBid = bids[bids.length - 1];
        currentBid = lastBid.bid_amount;
        highestBidder = {
          teamId: lastBid.team_id,
          teamName: lastBid.team_name,
          teamLogo: lastBid.team_logo,
          teamColor: lastBid.team_color,
        };
        nextBidAmount = currentBid + bidIncrement;
      } else {
        currentBid = activePlayerRow.base_price;
        nextBidAmount = activePlayerRow.base_price;
      }
    }

    const timerDefault = config ? config.bid_timer_seconds : 30;

    return {
      auctionId,
      status: currentPlayer ? 'BIDDING' : 'IDLE',
      currentPlayer,
      currentBid,
      highestBidder,
      nextBidAmount,
      bidHistory,
      timerSeconds: timerDefault,
      isTimerRunning: false,
      totalPendingPlayers: counts?.pending || 0,
      totalSoldPlayers: counts?.sold || 0,
      totalUnsoldPlayers: counts?.unsold || 0,
    };
  }

  public broadcast(auctionId: string) {
    if (!this.io) return;
    const state = this.getRoomState(auctionId);
    this.io.to(`auction:${auctionId}`).emit('AUCTION_STATE', state);
  }

  // 1. Start Auction / Call Next Player
  public callNextPlayer(auctionId: string, specificPlayerId?: string): { success: boolean; message?: string } {
    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
    if (!config) return { success: false, message: 'Auction configuration not found' };

    // Update auction status to LIVE if draft or scheduled
    db.prepare(`UPDATE auctions SET status = 'LIVE', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), auctionId);

    // If another player is currently marked IN_AUCTION, cannot start another until resolved
    const currentInAuction = db.prepare(`SELECT * FROM auction_players WHERE auction_id = ? AND status = 'IN_AUCTION'`).get(auctionId) as any;
    if (currentInAuction && (!specificPlayerId || currentInAuction.player_id !== specificPlayerId)) {
      return { success: false, message: 'Another player is currently active in auction. Mark them SOLD or UNSOLD first.' };
    }

    let nextRow: any;
    if (specificPlayerId) {
      // Guard: Player must NOT be already SOLD, RETAINED, or in a SQUAD
      const isSoldOrRetained = db.prepare(`
        SELECT 1 FROM auction_players WHERE auction_id = ? AND player_id = ? AND status = 'SOLD'
        UNION
        SELECT 1 FROM team_retentions WHERE player_id = ? AND status != 'REJECTED'
        UNION
        SELECT 1 FROM team_squads WHERE player_id = ?
      `).get(auctionId, specificPlayerId, specificPlayerId, specificPlayerId);

      if (isSoldOrRetained) {
        return { success: false, message: 'This player is already sold or retained and cannot enter the auction.' };
      }

      nextRow = db.prepare(`
        SELECT ap.*, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age, p.previous_team, p.experience, pc.name as category_name
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        LEFT JOIN player_categories pc ON ap.category_id = pc.id
        WHERE ap.auction_id = ? AND ap.player_id = ? AND ap.status != 'SOLD'
      `).get(auctionId, specificPlayerId);
    } else {
      nextRow = db.prepare(`
        SELECT ap.*, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age, p.previous_team, p.experience, pc.name as category_name
        FROM auction_players ap
        JOIN players p ON ap.player_id = p.id
        LEFT JOIN player_categories pc ON ap.category_id = pc.id
        WHERE ap.auction_id = ? 
          AND (ap.status = 'PENDING' OR ap.status = 'IN_AUCTION')
          AND ap.status != 'SOLD'
          AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')
          AND ap.player_id NOT IN (SELECT player_id FROM team_squads)
          AND ap.player_id NOT IN (
            SELECT p2.id FROM players p2
            JOIN captains c ON (
              c.player_id = p2.id
              OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email))
              OR (c.mobile != '' AND c.mobile = p2.mobile)
              OR LOWER(c.name) = LOWER(p2.full_name)
            )
            WHERE c.status != 'REJECTED'
          )
        ORDER BY ap.current_order ASC, ap.created_at ASC
        LIMIT 1
      `).get(auctionId);
    }

    if (!nextRow) {
      // Auto-enroll any registered players not yet in auction_players, STRICTLY excluding retained, squad, and captain players
      const unseeded = db.prepare(`
        SELECT p.* FROM players p 
        WHERE p.id NOT IN (SELECT player_id FROM auction_players WHERE auction_id = ?)
          AND p.id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')
          AND p.id NOT IN (SELECT player_id FROM team_squads)
          AND p.id NOT IN (
            SELECT p2.id FROM players p2
            JOIN captains c ON (
              c.player_id = p2.id
              OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email))
              OR (c.mobile != '' AND c.mobile = p2.mobile)
              OR LOWER(c.name) = LOWER(p2.full_name)
            )
            WHERE c.status != 'REJECTED'
          )
      `).all(auctionId) as any[];

      if (unseeded.length > 0) {
        const now = new Date().toISOString();
        const maxOrderRow = db.prepare('SELECT MAX(current_order) as maxOrder FROM auction_players WHERE auction_id = ?').get(auctionId) as any;
        let nextOrder = (maxOrderRow?.maxOrder || 0) + 1;
        for (const p of unseeded) {
          db.prepare(`
            INSERT INTO auction_players (id, auction_id, player_id, category_id, base_price, current_order, status, created_at)
            VALUES (?, ?, ?, NULL, ?, ?, 'PENDING', ?)
          `).run('ap_' + p.id + '_' + Date.now().toString(36), auctionId, p.id, config.default_base_price || 500, nextOrder++, now);
        }
        // Re-query with strict exclusion
        nextRow = db.prepare(`
          SELECT ap.*, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age, p.previous_team, p.experience, pc.name as category_name
          FROM auction_players ap
          JOIN players p ON ap.player_id = p.id
          LEFT JOIN player_categories pc ON ap.category_id = pc.id
          WHERE ap.auction_id = ? 
            AND ap.status = 'PENDING'
            AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')
            AND ap.player_id NOT IN (SELECT player_id FROM team_squads)
            AND ap.player_id NOT IN (
              SELECT p2.id FROM players p2
              JOIN captains c ON (
                c.player_id = p2.id
                OR (c.email != '' AND LOWER(c.email) = LOWER(p2.email))
                OR (c.mobile != '' AND c.mobile = p2.mobile)
                OR LOWER(c.name) = LOWER(p2.full_name)
              )
              WHERE c.status != 'REJECTED'
            )
          ORDER BY ap.current_order ASC, ap.created_at ASC
          LIMIT 1
        `).get(auctionId);
      }
    }

    if (!nextRow) {
      // Check if unsold players exist that can be re-auctioned
      const unsoldExists = db.prepare(`SELECT COUNT(*) as count FROM auction_players WHERE auction_id = ? AND status = 'UNSOLD'`).get(auctionId) as any;
      if (unsoldExists && unsoldExists.count > 0) {
        return { success: false, message: 'All pending players are processed. Unsold players are available in the Unsold pool.' };
      }
      return { success: false, message: 'No more players available in the auction pool.' };
    }

    // Set status to IN_AUCTION
    db.prepare(`UPDATE auction_players SET status = 'IN_AUCTION' WHERE id = ?`).run(nextRow.id);

    // Stop existing timer
    this.stopTimer(auctionId);

    const room = this.getRoomState(auctionId);
    room.status = 'BIDDING';
    room.currentPlayer = {
      auctionPlayerId: nextRow.id,
      playerId: nextRow.player_id,
      fullName: nextRow.full_name,
      photo: nextRow.photo,
      playingRole: nextRow.playing_role,
      battingStyle: nextRow.batting_style,
      bowlingStyle: nextRow.bowling_style,
      categoryName: nextRow.category_name,
      basePrice: nextRow.base_price,
      currentOrder: nextRow.current_order,
      isOverseas: nextRow.is_overseas === 1,
      age: nextRow.age,
      previousTeam: nextRow.previous_team,
      experience: nextRow.experience,
    };
    room.currentBid = nextRow.base_price;
    room.highestBidder = null;
    room.nextBidAmount = nextRow.base_price;
    room.bidHistory = [];
    room.timerSeconds = config.bid_timer_seconds || 30;
    room.isTimerRunning = true;

    // Log to audit
    this.addAuditLog(auctionId, 'ADMIN', 'ADMIN', 'PLAYER_CALLED', `Called ${nextRow.full_name} to the auction block at base price ₹${nextRow.base_price.toLocaleString('en-IN')}`);

    this.startTimer(auctionId);
    this.broadcast(auctionId);

    return { success: true };
  }

  // 2. Place Bid (Server-validated & Race-condition safe)
  public placeBid(
    auctionId: string,
    teamId?: string,
    captainId?: string,
    customBidAmount?: number
  ): { success: boolean; message?: string } {
    const room = this.getRoomState(auctionId);

    if (room.status !== 'BIDDING' || !room.currentPlayer) {
      return { success: false, message: 'Bidding is not currently active for any player.' };
    }

    const proposedBid = customBidAmount || room.nextBidAmount;

    // Verify proposedBid is higher than current bid
    if (proposedBid <= room.currentBid && room.currentBid > 0) {
      return { success: false, message: `Bid must be higher than current bid of ₹${room.currentBid.toLocaleString('en-IN')}` };
    }

    // Team info (optional: admin can increase bid without picking a team upfront)
    let team: any = null;
    if (teamId && teamId.trim() !== '') {
      team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
      if (team) {
        // Prevent team bidding against itself
        if (room.highestBidder && room.highestBidder.teamId === team.id) {
          return { success: false, message: 'Your team already holds the highest bid.' };
        }
        // SMART PURSE & SQUAD VALIDATION
        const validation = validateTeamBid(auctionId, team.id, room.currentPlayer.playerId, proposedBid);
        if (!validation.allowed) {
          return { success: false, message: validation.reason || 'Bid rejected by purse/squad validation rules.' };
        }
      }
    }

    const captain = captainId ? db.prepare('SELECT name FROM captains WHERE id = ?').get(captainId) as any : null;

    const bidId = 'bid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const timestamp = new Date().toISOString();

    if (team) {
      db.prepare(`
        INSERT INTO bids (id, auction_id, player_id, team_id, captain_id, bid_amount, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(bidId, auctionId, room.currentPlayer.playerId, team.id, captainId || null, proposedBid, timestamp);
    }

    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
    let increment = config?.bid_increment || 100;
    if (config?.bid_increment_type === 'PERCENTAGE') {
      increment = Math.round((proposedBid * (config.bid_increment / 100)) / 100) * 100;
    }

    const newBidEntry: LiveBid = {
      id: bidId,
      teamId: team?.id || '',
      teamName: team?.name || 'Bid Raised',
      teamLogo: team?.logo || '',
      teamColor: team?.color || '#2563EB',
      captainName: captain?.name,
      amount: proposedBid,
      timestamp,
    };

    room.currentBid = proposedBid;
    room.highestBidder = team ? {
      teamId: team.id,
      teamName: team.name,
      teamLogo: team.logo,
      teamColor: team.color,
    } : null;
    room.nextBidAmount = proposedBid + increment;
    room.bidHistory.push(newBidEntry);

    // AUTO-EXTENSION TIMER RULE (Section 16)
    if (config?.auto_extension && room.timerSeconds <= (config.extension_threshold_seconds || 5)) {
      room.timerSeconds = Math.max(room.timerSeconds + (config.extension_duration_seconds || 10), config.extension_duration_seconds || 10);
      this.io?.to(`auction:${auctionId}`).emit('TIMER_EXTENDED', {
        newTime: room.timerSeconds,
        reason: 'Auto-extended due to late bid',
      });
    }

    this.addAuditLog(
      auctionId,
      captainId || 'ADMIN',
      captain?.name || team?.name || 'AUCTIONEER',
      'BID_PLACED',
      `Bid raised to ₹${proposedBid.toLocaleString('en-IN')}${team ? ` by ${team.name}` : ''}`
    );
      `Bid placed by ${team.name} for ${room.currentPlayer.fullName}: ₹${proposedBid.toLocaleString('en-IN')}`
    );

    this.broadcast(auctionId);
    return { success: true };
  }

  // 3. Mark Player SOLD (Section 18) - Supports custom winning team selection
  public markSold(auctionId: string, targetTeamId?: string, soldAmount?: number): { success: boolean; message?: string } {
    const room = this.getRoomState(auctionId);

    if (!room.currentPlayer) {
      return { success: false, message: 'No active player to sell.' };
    }

    const winningTeamId = targetTeamId || room.highestBidder?.teamId;
    if (!winningTeamId) {
      return { success: false, message: 'Please select a winning team to sell this player to.' };
    }

    const finalAmount = soldAmount || room.currentBid || room.currentPlayer.basePrice || 500;
    const playerId = room.currentPlayer.playerId;
    const timestamp = new Date().toISOString();

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(winningTeamId) as any;
    if (!team) {
      return { success: false, message: 'Selected team not found.' };
    }
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId) as any;

    // Database transaction to guarantee atomic deduction, squad addition, and result logging
    const sellTransaction = db.transaction(() => {
      // 1. Update AuctionPlayer status
      db.prepare(`
        UPDATE auction_players 
        SET status = 'SOLD', final_bid = ?, winning_team_id = ?, sold_at = ?
        WHERE auction_id = ? AND player_id = ?
      `).run(finalAmount, winningTeamId, timestamp, auctionId, playerId);

      // 2. Create AuctionResult
      const resultId = 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      db.prepare(`
        INSERT INTO auction_results (id, auction_id, player_id, winning_team_id, final_bid, bid_count, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(resultId, auctionId, playerId, winningTeamId, finalAmount, room.bidHistory.length, timestamp);

      // 3. Deduct amount from team's purse
      const newSpent = team.spent_purse + finalAmount;
      const newRemaining = team.remaining_purse - finalAmount;
      db.prepare(`
        UPDATE teams 
        SET spent_purse = ?, remaining_purse = ?
        WHERE id = ?
      `).run(newSpent, newRemaining, winningTeamId);

      // 4. Create PurseTransaction
      const txId = 'ptx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      db.prepare(`
        INSERT INTO purse_transactions (id, auction_id, team_id, type, amount, balance_after, description, created_by, created_at)
        VALUES (?, ?, ?, 'BID_PURCHASE', ?, ?, ?, 'SYSTEM', ?)
      `).run(
        txId,
        auctionId,
        winningTeamId,
        finalAmount,
        newRemaining,
        `Purchased ${room.currentPlayer?.fullName} in auction`,
        timestamp
      );

      // 5. Connect to TeamSquad (both auction and tournament!)
      const squadId = 'sq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      db.prepare(`
        INSERT OR REPLACE INTO team_squads (id, tournament_id, auction_id, team_id, player_id, acquisition_type, price, joined_at)
        VALUES (?, ?, ?, ?, ?, 'AUCTION', ?, ?)
      `).run(squadId, auction.tournament_id, auctionId, winningTeamId, playerId, finalAmount, timestamp);
    });

    sellTransaction();

    this.stopTimer(auctionId);

    const soldData = {
      player: room.currentPlayer,
      winningTeam: room.highestBidder,
      finalAmount,
      timestamp,
    };

    this.addAuditLog(
      auctionId,
      'ADMIN',
      'ADMIN',
      'PLAYER_SOLD',
      `Sold ${room.currentPlayer.fullName} to ${room.highestBidder.teamName} for ₹${finalAmount.toLocaleString('en-IN')}`
    );

    room.status = 'SOLD';
    room.totalSoldPlayers += 1;
    room.totalPendingPlayers = Math.max(0, room.totalPendingPlayers - 1);

    this.io?.to(`auction:${auctionId}`).emit('PLAYER_SOLD_CELEBRATION', soldData);
    this.broadcast(auctionId);

    return { success: true };
  }

  // 4. Mark Player UNSOLD (Section 19)
  public markUnsold(auctionId: string): { success: boolean; message?: string } {
    const room = this.getRoomState(auctionId);

    if (!room.currentPlayer) {
      return { success: false, message: 'No active player to mark unsold.' };
    }

    const playerId = room.currentPlayer.playerId;

    db.prepare(`
      UPDATE auction_players
      SET status = 'UNSOLD', reauction_count = reauction_count + 1
      WHERE auction_id = ? AND player_id = ?
    `).run(auctionId, playerId);

    this.stopTimer(auctionId);

    this.addAuditLog(
      auctionId,
      'ADMIN',
      'ADMIN',
      'PLAYER_UNSOLD',
      `Marked ${room.currentPlayer.fullName} as UNSOLD at base price ₹${room.currentPlayer.basePrice.toLocaleString('en-IN')}`
    );

    const unsoldData = {
      player: room.currentPlayer,
    };

    room.status = 'UNSOLD';
    room.totalUnsoldPlayers += 1;
    room.totalPendingPlayers = Math.max(0, room.totalPendingPlayers - 1);

    this.io?.to(`auction:${auctionId}`).emit('PLAYER_UNSOLD_EVENT', unsoldData);
    this.broadcast(auctionId);

    return { success: true };
  }

  // 5. Skip Player
  public skipPlayer(auctionId: string): { success: boolean; message?: string } {
    const room = this.getRoomState(auctionId);
    if (!room.currentPlayer) return { success: false, message: 'No active player to skip.' };

    db.prepare(`UPDATE auction_players SET status = 'SKIPPED' WHERE auction_id = ? AND player_id = ?`).run(auctionId, room.currentPlayer.playerId);
    this.stopTimer(auctionId);
    room.status = 'IDLE';
    room.currentPlayer = null;
    room.highestBidder = null;
    room.bidHistory = [];

    this.addAuditLog(auctionId, 'ADMIN', 'ADMIN', 'PLAYER_SKIPPED', 'Skipped current player to later in the pool');
    this.broadcast(auctionId);
    return { success: true };
  }

  // 6. Re-auction Player (Move from Unsold back to Pool)
  public reauctionPlayer(auctionId: string, playerId: string): { success: boolean; message?: string } {
    const ap = db.prepare('SELECT * FROM auction_players WHERE auction_id = ? AND player_id = ?').get(auctionId, playerId) as any;
    if (!ap) return { success: false, message: 'Player not found in auction pool' };

    // STRICT CHECK: Sold and retained players can NEVER be re-auctioned
    if (ap.status === 'SOLD') {
      return { success: false, message: 'This player is already SOLD and cannot be re-auctioned.' };
    }
    const isRetained = db.prepare("SELECT 1 FROM team_retentions WHERE player_id = ? AND status != 'REJECTED'").get(playerId);
    if (isRetained) {
      return { success: false, message: 'This player is retained by a franchise team and cannot be re-auctioned.' };
    }
    const inSquad = db.prepare('SELECT 1 FROM team_squads WHERE player_id = ?').get(playerId);
    if (inSquad) {
      return { success: false, message: 'This player is already a member of a team squad and cannot be re-auctioned.' };
    }

    const config = db.prepare('SELECT max_reauction_attempts FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
    const maxAttempts = config?.max_reauction_attempts || 2;

    if (ap.reauction_count >= maxAttempts) {
      return { success: false, message: `Player has already reached maximum re-auction limit (${maxAttempts}).` };
    }

    db.prepare(`UPDATE auction_players SET status = 'PENDING' WHERE auction_id = ? AND player_id = ?`).run(auctionId, playerId);

    this.addAuditLog(auctionId, 'ADMIN', 'ADMIN', 'PLAYER_REAUCTIONED', `Moved player ${playerId} back to active pool for re-auction.`);
    const room = this.getRoomState(auctionId);
    room.totalUnsoldPlayers = Math.max(0, room.totalUnsoldPlayers - 1);
    room.totalPendingPlayers += 1;
    this.broadcast(auctionId);
    return { success: true };
  }

  // 7. Undo Last Bid
  public undoLastBid(auctionId: string): { success: boolean; message?: string } {
    const room = this.getRoomState(auctionId);
    if (!room.currentPlayer || room.bidHistory.length === 0) {
      return { success: false, message: 'No bids to undo.' };
    }

    const removedBid = room.bidHistory.pop();
    if (removedBid) {
      db.prepare('DELETE FROM bids WHERE id = ?').run(removedBid.id);
    }

    const config = db.prepare('SELECT bid_increment FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
    const bidIncrement = config?.bid_increment || 5000;

    if (room.bidHistory.length > 0) {
      const prevBid = room.bidHistory[room.bidHistory.length - 1];
      room.currentBid = prevBid.amount;
      room.highestBidder = {
        teamId: prevBid.teamId,
        teamName: prevBid.teamName,
        teamLogo: prevBid.teamLogo,
        teamColor: prevBid.teamColor,
      };
      room.nextBidAmount = prevBid.amount + bidIncrement;
    } else {
      room.currentBid = room.currentPlayer.basePrice;
      room.highestBidder = null;
      room.nextBidAmount = room.currentPlayer.basePrice;
    }

    this.addAuditLog(
      auctionId,
      'ADMIN',
      'ADMIN',
      'BID_CANCELLED',
      `Admin undid bid of ₹${removedBid?.amount.toLocaleString('en-IN')} by ${removedBid?.teamName}`
    );

    this.broadcast(auctionId);
    return { success: true };
  }

  // 8. Admin Increase Bid / Custom Bid
  public adminIncreaseBid(auctionId: string, amount: number): { success: boolean; message?: string } {
    const room = this.getRoomState(auctionId);
    if (!room.currentPlayer) return { success: false, message: 'No active player' };

    room.nextBidAmount = Math.max(room.currentBid + 1000, amount);
    this.broadcast(auctionId);
    return { success: true };
  }

  // 9. Pause / Resume Timer & Auction
  public pauseAuction(auctionId: string): { success: boolean } {
    const room = this.getRoomState(auctionId);
    room.isTimerRunning = false;
    room.status = 'PAUSED';
    this.stopTimer(auctionId);
    this.addAuditLog(auctionId, 'ADMIN', 'ADMIN', 'AUCTION_PAUSED', 'Auction paused by admin');
    this.broadcast(auctionId);
    return { success: true };
  }

  public resumeAuction(auctionId: string): { success: boolean } {
    const room = this.getRoomState(auctionId);
    room.isTimerRunning = true;
    room.status = 'BIDDING';
    this.startTimer(auctionId);
    this.addAuditLog(auctionId, 'ADMIN', 'ADMIN', 'AUCTION_RESUMED', 'Auction resumed by admin');
    this.broadcast(auctionId);
    return { success: true };
  }

  // 10. End Auction
  public endAuction(auctionId: string): { success: boolean } {
    this.stopTimer(auctionId);
    db.prepare(`UPDATE auctions SET status = 'COMPLETED', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), auctionId);

    const room = this.getRoomState(auctionId);
    room.status = 'COMPLETED';
    room.isTimerRunning = false;
    room.currentPlayer = null;

    this.addAuditLog(auctionId, 'ADMIN', 'ADMIN', 'AUCTION_COMPLETED', 'Auction marked as COMPLETED by admin');
    this.broadcast(auctionId);
    return { success: true };
  }

  // Timer Tick implementation
  private startTimer(auctionId: string) {
    this.stopTimer(auctionId);

    const interval = setInterval(() => {
      const room = this.rooms.get(auctionId);
      if (!room || !room.isTimerRunning) {
        this.stopTimer(auctionId);
        return;
      }

      if (room.timerSeconds > 0) {
        room.timerSeconds -= 1;
        this.io?.to(`auction:${auctionId}`).emit('TIMER_TICK', {
          seconds: room.timerSeconds,
        });

        if (room.timerSeconds === 0) {
          room.isTimerRunning = false;
          this.stopTimer(auctionId);
          this.io?.to(`auction:${auctionId}`).emit('TIMER_EXPIRED', {
            currentBid: room.currentBid,
            highestBidder: room.highestBidder,
          });
        }
      }
    }, 1000);

    this.timerIntervals.set(auctionId, interval);
  }

  private stopTimer(auctionId: string) {
    const interval = this.timerIntervals.get(auctionId);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(auctionId);
    }
    const room = this.rooms.get(auctionId);
    if (room) {
      room.isTimerRunning = false;
    }
  }

  private addAuditLog(auctionId: string, userId: string, userName: string, action: string, details: string) {
    try {
      const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      db.prepare(`
        INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, auctionId, userId, userName, action, details, new Date().toISOString());
    } catch (e) {
      console.error('[AUDIT ERROR]', e);
    }
  }
}

export const auctionEngine = new AuctionEngine();
