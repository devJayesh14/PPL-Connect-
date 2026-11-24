import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET full auction report summary
router.get('/:auctionId/summary', (req, res) => {
  try {
    const auction = db.prepare('SELECT a.*, t.name as tournament_name FROM auctions a JOIN tournaments t ON a.tournament_id = t.id WHERE a.id = ?').get(req.params.auctionId) as any;
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(req.params.auctionId);

    // Teams overview
    const teams = db.prepare(`
      SELECT t.*, c.name as captain_name,
        (SELECT COUNT(*) FROM team_squads WHERE team_id = t.id AND auction_id = ?) as total_players,
        (SELECT COUNT(*) FROM team_retentions WHERE team_id = t.id AND auction_id = ?) as retained_count,
        (SELECT COUNT(*) FROM team_squads ts JOIN players p ON ts.player_id = p.id WHERE ts.team_id = t.id AND ts.auction_id = ? AND p.is_overseas = 1) as overseas_count
      FROM teams t
      LEFT JOIN captains c ON t.captain_id = c.id
      WHERE t.auction_id = ?
    `).all(req.params.auctionId, req.params.auctionId, req.params.auctionId, req.params.auctionId);

    // Sold players
    const soldPlayers = db.prepare(`
      SELECT ap.*, p.full_name, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas,
             pc.name as category_name, t.name as winning_team_name, t.logo as winning_team_logo,
             (SELECT COUNT(*) FROM bids WHERE player_id = p.id AND auction_id = ?) as bid_count
      FROM auction_players ap
      JOIN players p ON ap.player_id = p.id
      JOIN teams t ON ap.winning_team_id = t.id
      LEFT JOIN player_categories pc ON ap.category_id = pc.id
      WHERE ap.auction_id = ? AND ap.status = 'SOLD'
      ORDER BY ap.final_bid DESC
    `).all(req.params.auctionId, req.params.auctionId);

    // Unsold players
    const unsoldPlayers = db.prepare(`
      SELECT ap.*, p.full_name, p.playing_role, p.is_overseas, pc.name as category_name
      FROM auction_players ap
      JOIN players p ON ap.player_id = p.id
      LEFT JOIN player_categories pc ON ap.category_id = pc.id
      WHERE ap.auction_id = ? AND ap.status = 'UNSOLD'
      ORDER BY ap.current_order ASC
    `).all(req.params.auctionId);

    // Most expensive player
    const mostExpensive = soldPlayers.length > 0 ? soldPlayers[0] : null;

    // Highest bid overall
    const highestBidRecord = db.prepare(`
      SELECT b.*, p.full_name as player_name, t.name as team_name
      FROM bids b
      JOIN players p ON b.player_id = p.id
      JOIN teams t ON b.team_id = t.id
      WHERE b.auction_id = ?
      ORDER BY b.bid_amount DESC
      LIMIT 1
    `).get(req.params.auctionId);

    // Bid history
    const bidHistory = db.prepare(`
      SELECT b.*, p.full_name as player_name, t.name as team_name, c.name as captain_name
      FROM bids b
      JOIN players p ON b.player_id = p.id
      JOIN teams t ON b.team_id = t.id
      LEFT JOIN captains c ON b.captain_id = c.id
      WHERE b.auction_id = ?
      ORDER BY b.timestamp DESC
    `).all(req.params.auctionId);

    res.json({
      auction,
      config,
      teams,
      soldPlayers,
      unsoldPlayers,
      mostExpensive,
      highestBidRecord,
      totalBidsPlaced: bidHistory.length,
      bidHistory,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET final squads for all teams with compliance check (Section 22)
router.get('/:auctionId/final-squads', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(req.params.auctionId) as any;
    const teams = db.prepare('SELECT * FROM teams WHERE auction_id = ?').all(req.params.auctionId) as any[];

    const finalSquads = teams.map(team => {
      const players = db.prepare(`
        SELECT ts.acquisition_type, ts.price, ts.joined_at,
               p.id as player_id, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age
        FROM team_squads ts
        JOIN players p ON ts.player_id = p.id
        WHERE ts.team_id = ? AND ts.auction_id = ?
        ORDER BY ts.acquisition_type DESC, ts.price DESC
      `).all(team.id, req.params.auctionId) as any[];

      const totalCount = players.length;
      const overseasCount = players.filter(p => p.is_overseas === 1).length;
      const totalSpent = players.reduce((sum, p) => sum + p.price, 0);

      // Rule violations / Warnings
      const warnings: string[] = [];
      if (config) {
        if (totalCount < config.min_players_per_team) {
          warnings.push(`Squad has ${totalCount} players; minimum required is ${config.min_players_per_team}.`);
        }
        if (totalCount > config.max_players_per_team) {
          warnings.push(`Squad has ${totalCount} players; maximum allowed is ${config.max_players_per_team}.`);
        }
        if (overseasCount > config.max_overseas_players) {
          warnings.push(`Squad has ${overseasCount} overseas players; maximum allowed is ${config.max_overseas_players}.`);
        }
      }

      return {
        team,
        totalPlayers: totalCount,
        overseasPlayers: overseasCount,
        totalSpent,
        remainingPurse: team.remaining_purse,
        minRequired: config?.min_players_per_team || 11,
        maxAllowed: config?.max_players_per_team || 15,
        isValidSquad: warnings.length === 0,
        warnings,
        players,
      };
    });

    res.json(finalSquads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
