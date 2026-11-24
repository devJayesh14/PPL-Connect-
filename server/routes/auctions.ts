import { Router } from 'express';
import { db } from '../db/index.js';
import { auctionEngine } from '../services/auctionEngine.js';

const router = Router();

// GET dashboard statistics across tournaments & auctions (Section 2)
router.get('/stats/summary', (req, res) => {
  try {
    const totalTournaments = (db.prepare('SELECT COUNT(*) as count FROM tournaments').get() as any).count;
    const activeAuctions = (db.prepare("SELECT COUNT(*) as count FROM auctions WHERE status = 'LIVE'").get() as any).count;
    const upcomingAuctions = (db.prepare("SELECT COUNT(*) as count FROM auctions WHERE status IN ('DRAFT', 'REGISTRATION_OPEN', 'RETENTION_OPEN', 'AUCTION_SCHEDULED')").get() as any).count;
    const totalTeams = (db.prepare('SELECT COUNT(*) as count FROM teams').get() as any).count;
    const totalPlayers = (db.prepare('SELECT COUNT(*) as count FROM players').get() as any).count;

    const soldCount = (db.prepare("SELECT COUNT(*) as count FROM auction_players WHERE status = 'SOLD'").get() as any).count;
    const unsoldCount = (db.prepare("SELECT COUNT(*) as count FROM auction_players WHERE status = 'UNSOLD'").get() as any).count;

    const purseStats = db.prepare(`
      SELECT 
        COALESCE(SUM(initial_purse), 0) as total_initial_purse,
        COALESCE(SUM(spent_purse), 0) as total_spent,
        COALESCE(SUM(remaining_purse), 0) as total_remaining
      FROM teams
    `).get() as any;

    res.json({
      totalTournaments,
      activeAuctions,
      upcomingAuctions,
      totalTeams,
      totalRegisteredPlayers: totalPlayers,
      soldPlayers: soldCount,
      unsoldPlayers: unsoldCount,
      totalAmountSpent: purseStats.total_spent,
      totalRemainingPurse: purseStats.total_remaining,
      totalInitialPurse: purseStats.total_initial_purse,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all auctions
router.get('/', (req, res) => {
  try {
    const auctions = db.prepare(`
      SELECT a.*, COALESCE(t.name, 'No Tournament') as tournament_name,
        (SELECT COUNT(*) FROM teams WHERE auction_id = a.id) as team_count,
        (SELECT COUNT(*) FROM auction_players WHERE auction_id = a.id) as total_pool_players,
        (SELECT COUNT(*) FROM auction_players WHERE auction_id = a.id AND status = 'SOLD') as sold_players,
        (SELECT COUNT(*) FROM auction_players WHERE auction_id = a.id AND status = 'UNSOLD') as unsold_players
      FROM auctions a
      LEFT JOIN tournaments t ON a.tournament_id = t.id
      ORDER BY a.created_at DESC
    `).all();
    res.json(auctions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET auction by share link (Section 4)
router.get('/link/:shareLink', (req, res) => {
  try {
    const auction = db.prepare('SELECT * FROM auctions WHERE share_link = ?').get(req.params.shareLink) as any;
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.redirect(`/api/auctions/${auction.id}`);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single auction with configuration, teams, categories
router.get('/:id', (req, res) => {
  try {
    const auction = db.prepare(`
      SELECT a.*, t.name as tournament_name 
      FROM auctions a
      JOIN tournaments t ON a.tournament_id = t.id
      WHERE a.id = ?
    `).get(req.params.id) as any;

    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(req.params.id);
    const categories = db.prepare('SELECT * FROM player_categories WHERE auction_id = ? ORDER BY name ASC').all(req.params.id);
    const teams = db.prepare(`
      SELECT t.*, c.id as captain_record_id, c.name as captain_name, c.email as captain_email, c.mobile as captain_mobile, c.status as captain_status,
        (SELECT COUNT(*) FROM team_squads WHERE team_id = t.id AND auction_id = ?) as squad_count
      FROM teams t
      LEFT JOIN captains c ON t.id = c.team_id AND c.auction_id = ?
      WHERE t.auction_id = ?
    `).all(req.params.id, req.params.id, req.params.id);

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_pool,
        SUM(CASE WHEN status = 'SOLD' THEN 1 ELSE 0 END) as sold_count,
        SUM(CASE WHEN status = 'UNSOLD' THEN 1 ELSE 0 END) as unsold_count,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'IN_AUCTION' THEN 1 ELSE 0 END) as in_auction_count,
        COALESCE(SUM(final_bid), 0) as total_spent,
        COALESCE(MAX(final_bid), 0) as highest_bid
      FROM auction_players
      WHERE auction_id = ?
    `).get(req.params.id);

    res.json({
      ...auction,
      config,
      categories,
      teams,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Auction (Multi-step wizard submission)
router.post('/', (req, res) => {
  try {
    const {
      tournamentId,
      name,
      description,
      auctionDate,
      startTime,
      endTime,
      timezone = 'IST (+05:30)',
      logo,
      banner,
      // Teams & Captains array
      teams = [],
      // Purse & Pricing
      totalPursePerTeam = 20000,
      currency = 'INR',
      currencySymbol = '₹',
      allowDifferentPursePerTeam = false,
      startingPurse = 20000,
      allowPurseAdjustment = true,
      allowAdminManualPurseAdjustment = true,
      // Base Price & Increment
      minBasePrice = 100,
      defaultBasePrice = 500,
      maxBasePrice = 50000,
      allowIndividualBasePrice = true,
      bidIncrement = 100,
      bidIncrementType = 'FIXED',
      // Squad Rules
      minPlayersPerTeam = 11,
      maxPlayersPerTeam = 15,
      minOverseasPlayers = 0,
      maxOverseasPlayers = 4,
      // Retention Rules: 1 Player Only, 0 points deducted
      enableRetention = true,
      minRetentions = 0,
      maxRetentions = 1,
      retentionUsesPurse = false,
      retentionPriceModel = 'FLAT',
      retentionPriceConfig = [0],
      // Categories
      categories = [],
      // Auction Rules
      bidTimerSeconds = 30,
      autoExtension = true,
      extensionThresholdSeconds = 5,
      extensionDurationSeconds = 10,
      maxReauctionAttempts = 2,
      // Registration Rules
      registrationOpen = true,
      registrationDeadline,
      status = 'DRAFT',
    } = req.body;

    if (!name || !auctionDate || !startTime) {
      return res.status(400).json({ error: 'Auction Name, Date, and Start Time are required.' });
    }

    let finalTournamentId = tournamentId;
    if (!finalTournamentId) {
      const existing = db.prepare('SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1').get() as any;
      if (existing) {
        finalTournamentId = existing.id;
      } else {
        finalTournamentId = 'tour_' + Date.now();
        const nowTime = new Date().toISOString();
        db.prepare(`
          INSERT INTO tournaments (id, name, description, sport, status, created_at, updated_at)
          VALUES (?, 'Priyanka Premiere League (PPL)', 'Official PPL Championship Tournament', 'CRICKET', 'UPCOMING', ?, ?)
        `).run(finalTournamentId, nowTime, nowTime);
      }
    } else {
      const tourExists = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(finalTournamentId);
      if (!tourExists) {
        const nowTime = new Date().toISOString();
        db.prepare(`
          INSERT INTO tournaments (id, name, description, sport, status, created_at, updated_at)
          VALUES (?, 'Priyanka Premiere League (PPL)', 'Official PPL Championship Tournament', 'CRICKET', 'UPCOMING', ?, ?)
        `).run(finalTournamentId, nowTime, nowTime);
      }
    }

    const auctionId = 'auc_' + Date.now();
    const configId = 'cfg_' + Date.now();
    const now = new Date().toISOString();
    const safeRetentionModel = (retentionPriceModel === 'TIERED') ? 'TIERED' : 'FLAT';

    // Unique shareable slug/link
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substr(2, 4);
    const shareLink = `/auction/${slug}`;

    const createTx = db.transaction(() => {
      // 1. Insert Auction
      db.prepare(`
        INSERT INTO auctions (id, tournament_id, name, description, auction_date, start_time, end_time, timezone, status, logo, banner, share_link, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(auctionId, finalTournamentId, name, description || '', auctionDate, startTime, endTime || null, timezone, status, logo || '', banner || '', shareLink, now, now);

      // 2. Insert AuctionConfig
      db.prepare(`
        INSERT INTO auction_configs (
          id, auction_id, total_purse_per_team, currency, currency_symbol,
          allow_different_purse_per_team, starting_purse, allow_purse_adjustment, allow_admin_manual_purse_adjustment,
          min_base_price, default_base_price, max_base_price, allow_individual_base_price,
          bid_increment, bid_increment_type, min_players_per_team, max_players_per_team,
          min_overseas_players, max_overseas_players, enable_retention, min_retentions,
          max_retentions, retention_uses_purse, retention_price_model, retention_price_config,
          bid_timer_seconds, auto_extension, extension_threshold_seconds, extension_duration_seconds,
          max_reauction_attempts, registration_open, registration_deadline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        configId, auctionId, totalPursePerTeam, currency, currencySymbol,
        allowDifferentPursePerTeam ? 1 : 0, startingPurse, allowPurseAdjustment ? 1 : 0, allowAdminManualPurseAdjustment ? 1 : 0,
        minBasePrice, defaultBasePrice, maxBasePrice, allowIndividualBasePrice ? 1 : 0,
        bidIncrement, bidIncrementType, minPlayersPerTeam, maxPlayersPerTeam,
        minOverseasPlayers, maxOverseasPlayers, enableRetention ? 1 : 0, minRetentions,
        maxRetentions, retentionUsesPurse ? 1 : 0, safeRetentionModel, JSON.stringify(retentionPriceConfig),
        bidTimerSeconds, autoExtension ? 1 : 0, extensionThresholdSeconds, extensionDurationSeconds,
        maxReauctionAttempts, registrationOpen ? 1 : 0, registrationDeadline || null
      );

      // 3. Insert Categories
      for (const cat of categories) {
        const catId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        db.prepare(`
          INSERT INTO player_categories (id, auction_id, name, base_price, min_players, max_players, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(catId, auctionId, cat.name, cat.basePrice || defaultBasePrice, cat.minPlayers || 0, cat.maxPlayers || maxPlayersPerTeam, cat.description || '');
      }

      // 4. Attach or Create Teams
      for (const t of teams) {
        const teamInitialPurse = (allowDifferentPursePerTeam && t.purse) ? t.purse : totalPursePerTeam;
        let teamId = t.id;

        if (teamId) {
          // Update existing team to belong to this auction
          db.prepare(`
            UPDATE teams 
            SET auction_id = ?, initial_purse = ?, remaining_purse = ?
            WHERE id = ?
          `).run(auctionId, teamInitialPurse, teamInitialPurse, teamId);
        } else {
          // Create new team
          teamId = 'tm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          db.prepare(`
            INSERT INTO teams (id, tournament_id, auction_id, name, short_name, logo, color, initial_purse, spent_purse, remaining_purse, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
          `).run(teamId, finalTournamentId, auctionId, t.name, t.shortName || t.name.substring(0, 3).toUpperCase(), t.logo || '', t.color || '#2563EB', teamInitialPurse, teamInitialPurse, now);
        }

        // Add initial purse transaction
        const ptxId = 'ptx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        db.prepare(`
          INSERT INTO purse_transactions (id, auction_id, team_id, type, amount, balance_after, description, created_by, created_at)
          VALUES (?, ?, ?, 'INITIAL', ?, ?, 'Initial team auction purse configured', 'SYSTEM', ?)
        `).run(ptxId, auctionId, teamId, teamInitialPurse, teamInitialPurse, now);

        // Add Captain and user account if provided
        if (t.captainName && t.captainEmail) {
          const cleanCapEmail = t.captainEmail.trim().toLowerCase();
          let user = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanCapEmail) as any;
          let userId = user ? user.id : 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          if (user) {
            db.prepare("UPDATE users SET role = 'CAPTAIN', team_id = ? WHERE id = ?").run(teamId, userId);
          } else {
            db.prepare(`
              INSERT INTO users (id, name, email, mobile, password, role, team_id, status, created_at)
              VALUES (?, ?, ?, ?, 'admin123', 'CAPTAIN', ?, 'ACTIVE', ?)
            `).run(userId, t.captainName, cleanCapEmail, t.captainMobile || '', teamId, now);
          }

          const capId = 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          db.prepare(`
            INSERT INTO captains (id, user_id, team_id, auction_id, name, mobile, email, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
          `).run(capId, userId, teamId, auctionId, t.captainName, t.captainMobile || '', cleanCapEmail, now);

          db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(capId, teamId);
        }
      }

      // 5. Initial Audit Log
      const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      db.prepare(`
        INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, 'ADMIN', 'ADMIN', 'AUCTION_CREATED', ?, ?)
      `).run(auditId, auctionId, `Auction "${name}" created with ${teams.length} teams and purse ${currencySymbol}${totalPursePerTeam.toLocaleString('en-IN')}`, now);
    });

    createTx();

    const created = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Auction status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const now = new Date().toISOString();

    db.prepare('UPDATE auctions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);

    // Audit log
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    db.prepare(`
      INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
      VALUES (?, ?, 'ADMIN', 'ADMIN', 'STATUS_UPDATED', ?, ?)
    `).run(auditId, req.params.id, `Auction status changed to ${status}`, now);

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT Edit Auction & Rules (Auction CRUD)
router.put('/:id', (req, res) => {
  try {
    const {
      name,
      description,
      auctionDate,
      startTime,
      endTime,
      timezone,
      status,
      // Base Price & Increment configuration
      defaultBasePrice,
      bidIncrement,
      totalPursePerTeam,
      minPlayersPerTeam,
      maxPlayersPerTeam,
      bidTimerSeconds,
    } = req.body;

    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const now = new Date().toISOString();

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE auctions
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            auction_date = COALESCE(?, auction_date),
            start_time = COALESCE(?, start_time),
            end_time = COALESCE(?, end_time),
            timezone = COALESCE(?, timezone),
            status = COALESCE(?, status),
            updated_at = ?
        WHERE id = ?
      `).run(name, description, auctionDate, startTime, endTime, timezone, status, now, req.params.id);

      // Update config
      if (defaultBasePrice !== undefined || bidIncrement !== undefined || totalPursePerTeam !== undefined || minPlayersPerTeam !== undefined || maxPlayersPerTeam !== undefined || bidTimerSeconds !== undefined) {
        db.prepare(`
          UPDATE auction_configs
          SET default_base_price = COALESCE(?, default_base_price),
              bid_increment = COALESCE(?, bid_increment),
              total_purse_per_team = COALESCE(?, total_purse_per_team),
              min_players_per_team = COALESCE(?, min_players_per_team),
              max_players_per_team = COALESCE(?, max_players_per_team),
              bid_timer_seconds = COALESCE(?, bid_timer_seconds)
          WHERE auction_id = ?
        `).run(defaultBasePrice || null, bidIncrement || null, totalPursePerTeam || null, minPlayersPerTeam || null, maxPlayersPerTeam || null, bidTimerSeconds || null, req.params.id);
      }

      // Log in audit trail
      db.prepare(`
        INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, 'ADMIN', 'ADMIN', 'AUCTION_EDITED', ?, ?)
      `).run('aud_' + Date.now(), req.params.id, `Auction rules updated: Base Price ₹${defaultBasePrice || 'unchanged'}, Increment ₹${bidIncrement || 'unchanged'}`, now);
    });

    updateTx();

    const updated = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id);
    const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(req.params.id);
    res.json({ ...updated, config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST GO LIVE (Option to live the auction and guarantee all registered players participate)
router.post('/:id/go-live', (req, res) => {
  try {
    const auctionId = req.params.id;
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId) as any;
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const now = new Date().toISOString();

    const liveTx = db.transaction(() => {
      // 1. Set status to LIVE
      db.prepare("UPDATE auctions SET status = 'LIVE', updated_at = ? WHERE id = ?").run(now, auctionId);

      // 2. Sync all registered players so ALL registered players participate in this auction!
      const allPlayers = db.prepare('SELECT * FROM players').all() as any[];
      const config = db.prepare('SELECT default_base_price FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
      const defaultBase = config?.default_base_price || 500;

      for (const p of allPlayers) {
        const inPool = db.prepare('SELECT id FROM auction_players WHERE auction_id = ? AND player_id = ?').get(auctionId, p.id);
        if (!inPool) {
          const maxOrderRow = db.prepare('SELECT MAX(current_order) as maxOrder FROM auction_players WHERE auction_id = ?').get(auctionId) as any;
          const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;

          db.prepare(`
            INSERT INTO auction_players (id, auction_id, player_id, category_id, base_price, current_order, status, created_at)
            VALUES (?, ?, ?, NULL, ?, ?, 'PENDING', ?)
          `).run('ap_' + p.id + '_' + Date.now().toString(36), auctionId, p.id, defaultBase, nextOrder, now);
        }
      }

      // 3. Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, 'ADMIN', 'ADMIN', 'AUCTION_LIVE_STARTED', ?, ?)
      `).run('aud_' + Date.now(), auctionId, `Super Admin launched live auction for "${auction.name}". Pool synchronized with ${allPlayers.length} players.`, now);
    });

    liveTx();

    const updated = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
    res.json({
      success: true,
      message: `Auction "${auction.name}" is now LIVE! All registered players are enrolled in the auction pool.`,
      auction: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Auction (Auction CRUD)
router.delete('/:id', (req, res) => {
  try {
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM auction_configs WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM player_categories WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM auction_players WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM player_registrations WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM team_retentions WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM team_squads WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM auction_results WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM bids WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM purse_transactions WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM audit_logs WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM captains WHERE auction_id = ?').run(req.params.id);
      db.prepare('UPDATE teams SET auction_id = NULL WHERE auction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM auctions WHERE id = ?').run(req.params.id);
    });

    deleteTx();
    res.json({ success: true, message: `Auction "${auction.name}" has been deleted.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// LIVE AUCTION REST HTTP ENDPOINTS (RESILIENT CONTROLS)
// ==========================================

// GET room state
router.get('/:id/room-state', (req, res) => {
  try {
    const state = auctionEngine.getRoomState(req.params.id);
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST call next player
router.post('/:id/call-player', (req, res) => {
  try {
    const { playerId } = req.body;
    const result = auctionEngine.callNextPlayer(req.params.id, playerId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST place bid
router.post('/:id/place-bid', (req, res) => {
  try {
    const { teamId, captainId, customAmount } = req.body;
    const result = auctionEngine.placeBid(req.params.id, teamId, captainId, customAmount);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST mark sold (with team selection)
router.post('/:id/mark-sold', (req, res) => {
  try {
    const { teamId, amount } = req.body;
    const result = auctionEngine.markSold(req.params.id, teamId, amount);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST mark unsold
router.post('/:id/mark-unsold', (req, res) => {
  try {
    const result = auctionEngine.markUnsold(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST skip player
router.post('/:id/skip-player', (req, res) => {
  try {
    const result = auctionEngine.skipPlayer(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST undo last bid
router.post('/:id/undo-bid', (req, res) => {
  try {
    const result = auctionEngine.undoLastBid(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST toggle pause / resume
router.post('/:id/pause-clock', (req, res) => {
  try {
    const result = auctionEngine.pauseAuction(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/resume-clock', (req, res) => {
  try {
    const result = auctionEngine.resumeAuction(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST end auction
router.post('/:id/end-auction', (req, res) => {
  try {
    const result = auctionEngine.endAuction(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
