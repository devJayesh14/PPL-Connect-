import { Router } from 'express';
import { db } from '../db/index.js';
import { sendRetentionConfirmationEmail } from '../services/emailService.js';

const router = Router();

// GET retentions for a specific team (direct route)
router.get('/team/:teamId', (req, res) => {
  try {
    const retentions = db.prepare(`
      SELECT tr.*, p.full_name, p.photo, p.playing_role, p.is_overseas, p.email, p.mobile
      FROM team_retentions tr
      JOIN players p ON tr.player_id = p.id
      WHERE tr.team_id = ?
      ORDER BY tr.retention_order ASC
    `).all(req.params.teamId);

    res.json(retentions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all retentions for an auction
router.get('/:auctionId', (req, res) => {
  try {
    const { auctionId } = req.params;
    let query = `
      SELECT tr.*, t.name as team_name, t.logo as team_logo,
             p.full_name, p.photo, p.playing_role, p.is_overseas, p.batting_style, p.bowling_style
      FROM team_retentions tr
      JOIN teams t ON tr.team_id = t.id
      JOIN players p ON tr.player_id = p.id
    `;
    const params: any[] = [];

    if (auctionId && auctionId !== 'auc_default') {
      query += ` WHERE tr.auction_id = ?`;
      params.push(auctionId);
    }
    query += ` ORDER BY tr.team_id, tr.retention_order ASC`;

    const retentions = db.prepare(query).all(...params);
    res.json(retentions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET public retention details by confirmation token
router.get('/confirm/:token', (req, res) => {
  try {
    const retention = db.prepare(`
      SELECT tr.id, tr.status, tr.retention_price, tr.created_at, tr.confirmed_at,
             t.name as team_name, t.logo as team_logo,
             p.full_name as player_name, p.email as player_email, p.photo as player_photo, p.playing_role
      FROM team_retentions tr
      JOIN teams t ON tr.team_id = t.id
      JOIN players p ON tr.player_id = p.id
      WHERE tr.confirmation_token = ?
    `).get(req.params.token) as any;

    if (!retention) {
      return res.status(404).json({ error: 'Retention offer not found or link has expired.' });
    }

    res.json(retention);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Player Confirms or Declines Retention Offer
router.post('/confirm/:token', (req, res) => {
  try {
    const { action } = req.body; // 'ACCEPT' | 'DECLINE'
    const retention = db.prepare(`
      SELECT tr.*, p.full_name, t.name as team_name
      FROM team_retentions tr
      JOIN players p ON tr.player_id = p.id
      JOIN teams t ON tr.team_id = t.id
      WHERE tr.confirmation_token = ?
    `).get(req.params.token) as any;

    if (!retention) {
      return res.status(404).json({ error: 'Retention offer not found or link has expired.' });
    }

    if (retention.status === 'CONFIRMED') {
      return res.json({ success: true, message: 'You have already accepted this retention offer.', status: 'CONFIRMED' });
    }

    const now = new Date().toISOString();

    if (action === 'ACCEPT') {
      const confirmTx = db.transaction(() => {
        db.prepare("UPDATE team_retentions SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?").run(now, retention.id);

        const aucRec = db.prepare('SELECT tournament_id FROM auctions WHERE id = ?').get(retention.auction_id) as any;
        const tourId = aucRec?.tournament_id || (db.prepare('SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1').get() as any)?.id || 'tour_ppl_2026';

        // Add to team squad
        const squadId = 'sq_' + Date.now();
        db.prepare(`
          INSERT OR REPLACE INTO team_squads (id, tournament_id, auction_id, team_id, player_id, acquisition_type, price, joined_at)
          VALUES (?, ?, ?, ?, ?, 'RETENTION', 0, ?)
        `).run(squadId, tourId, retention.auction_id, retention.team_id, retention.player_id, now);

        // Mark as approved and remove from active auction pool
        db.prepare("UPDATE player_registrations SET status = 'APPROVED' WHERE player_id = ?").run(retention.player_id);
        db.prepare("DELETE FROM auction_players WHERE player_id = ?").run(retention.player_id);

        // Log audit
        db.prepare(`
          INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
          VALUES (?, ?, ?, ?, 'RETENTION_CONFIRMED_BY_PLAYER', ?, ?)
        `).run('aud_' + Date.now(), retention.auction_id, retention.player_id, retention.full_name, `Player ${retention.full_name} confirmed retention with ${retention.team_name}.`, now);
      });

      confirmTx();
      return res.json({
        success: true,
        message: `Congratulations! You have officially accepted the retention offer from ${retention.team_name}.`,
        status: 'CONFIRMED',
      });
    } else {
      // DECLINE: mark REJECTED and remove from team_retentions so team can retain someone else
      const declineTx = db.transaction(() => {
        db.prepare("UPDATE team_retentions SET status = 'REJECTED' WHERE id = ?").run(retention.id);
        db.prepare('DELETE FROM team_squads WHERE team_id = ? AND player_id = ? AND acquisition_type = "RETENTION"').run(retention.team_id, retention.player_id);
      });
      declineTx();
      return res.json({
        success: true,
        message: `You have declined the retention offer from ${retention.team_name}.`,
        status: 'REJECTED',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Retain Player (1 Player Limit, 0 Points Deducted, Sends Player Confirmation Email)
router.post('/', (req, res) => {
  try {
    let { auctionId, teamId, playerId } = req.body;
    if (!teamId || !playerId) {
      return res.status(400).json({ error: 'Team ID and Player ID are required.' });
    }

    // 1. Resolve Team
    let team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
    if (!team) {
      team = db.prepare(`
        SELECT t.* FROM teams t
        LEFT JOIN captains c ON c.team_id = t.id
        WHERE c.user_id = ? OR LOWER(t.name) = ?
        LIMIT 1
      `).get(teamId, String(teamId).toLowerCase()) as any;
    }
    if (!team) {
      return res.status(404).json({ error: 'Franchise team not found. Please ensure you are logged in with an approved captain account.' });
    }

    teamId = team.id;

    // 2. Resolve Player
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
    if (!player) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    // 3. Resolve active Auction & Tournament
    let targetAuction: any = null;
    if (auctionId && auctionId !== 'auc_default') {
      targetAuction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId);
    }
    if (!targetAuction && team.auction_id) {
      targetAuction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(team.auction_id);
    }
    if (!targetAuction) {
      targetAuction = db.prepare('SELECT * FROM auctions ORDER BY created_at DESC LIMIT 1').get();
    }

    const now = new Date().toISOString();

    if (!targetAuction) {
      const tourId = 'tour_ppl_2026';
      const aucId = 'auc_default';
      const existingTour = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(tourId);
      if (!existingTour) {
        db.prepare(`
          INSERT INTO tournaments (id, name, description, sport, status, created_at, updated_at)
          VALUES (?, 'Priyanka Premiere League (PPL)', 'Official PPL Championship', 'CRICKET', 'UPCOMING', ?, ?)
        `).run(tourId, now, now);
      }
      db.prepare(`
        INSERT INTO auctions (id, tournament_id, name, auction_date, start_time, status, created_at, updated_at)
        VALUES (?, ?, 'PPL Grand Auction 2026', '2026-12-10', '10:00 AM', 'REGISTRATION_OPEN', ?, ?)
      `).run(aucId, tourId, now, now);

      targetAuction = { id: aucId, tournament_id: tourId, name: 'PPL Grand Auction 2026' };
      db.prepare('UPDATE teams SET tournament_id = ?, auction_id = ? WHERE id = ?').run(tourId, aucId, teamId);
    }

    const resolvedAuctionId = targetAuction.id;

    // 4. RULE: Every captain can retain ONE player only
    const maxLimit = 1;
    const existingActiveRetentions = db.prepare(`
      SELECT * FROM team_retentions 
      WHERE team_id = ? AND status != 'REJECTED'
    `).all(teamId) as any[];

    if (existingActiveRetentions.length >= maxLimit) {
      return res.status(400).json({
        error: `Every team can retain a maximum of 1 player only. You already have an active retention slot.`,
      });
    }

    // 5. RULE: Check if player is already retained by ANY team
    const alreadyRetained = db.prepare(`
      SELECT tr.*, t.name as team_name 
      FROM team_retentions tr 
      JOIN teams t ON tr.team_id = t.id 
      WHERE tr.player_id = ? AND tr.status != 'REJECTED'
    `).get(playerId) as any;

    if (alreadyRetained) {
      return res.status(400).json({
        error: `Player "${player.full_name}" is already retained by ${alreadyRetained.team_name}.`,
      });
    }

    // 6. RULE: Retain will NOT deduct any points (0 points cost)
    const retentionPrice = 0;
    const retId = 'ret_' + Date.now();
    const confirmationToken = 'rtok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

    const retainTx = db.transaction(() => {
      // Insert retention record marked PENDING_CONFIRMATION
      db.prepare(`
        INSERT INTO team_retentions (id, auction_id, team_id, player_id, retention_order, retention_price, approved_by_admin, status, confirmation_token, created_at)
        VALUES (?, ?, ?, ?, 1, 0, 1, 'PENDING_CONFIRMATION', ?, ?)
      `).run(retId, resolvedAuctionId, teamId, playerId, confirmationToken, now);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, ?, ?, 'PLAYER_RETENTION_INITIATED', ?, ?)
      `).run('aud_' + Date.now(), resolvedAuctionId, team.captain_id || 'CAPTAIN', team.name, `Initiated retention offer for ${player.full_name}. Awaiting player email confirmation.`, now);
    });

    retainTx();

    // 7. Send confirmation email to player
    const host = req.get('host') || 'ppl-connect.vercel.app';
    const protocol = req.protocol === 'https' || host.includes('vercel.app') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const confirmationUrl = `${baseUrl}/confirm-retention/${confirmationToken}`;

    if (player.email) {
      sendRetentionConfirmationEmail({
        playerEmail: player.email,
        playerName: player.full_name,
        teamName: team.name,
        captainName: team.captain_name || 'Team Captain',
        confirmationUrl,
      }).catch((err) => console.error('[EMAIL ERROR]', err));
    }

    const updatedRetention = db.prepare(`
      SELECT tr.*, p.full_name, p.photo, p.playing_role, p.email, p.mobile
      FROM team_retentions tr
      JOIN players p ON tr.player_id = p.id
      WHERE tr.id = ?
    `).get(retId);

    res.status(201).json({
      success: true,
      message: `Retention offer initiated! A confirmation email has been sent to ${player.full_name} (${player.email}). Once confirmed, the retention will be finalized.`,
      retentionPrice: 0,
      confirmationUrl,
      retention: updatedRetention,
      player,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/retentions/:id (Release/Revoke a retention)
router.delete('/:id', (req, res) => {
  try {
    const retention = db.prepare('SELECT * FROM team_retentions WHERE id = ?').get(req.params.id) as any;
    if (!retention) return res.status(404).json({ error: 'Retention record not found.' });

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(retention.player_id) as any;

    const releaseTx = db.transaction(() => {
      db.prepare('DELETE FROM team_retentions WHERE id = ?').run(retention.id);
      db.prepare('DELETE FROM team_squads WHERE team_id = ? AND player_id = ? AND acquisition_type = "RETENTION"').run(retention.team_id, retention.player_id);

      // Restore to auction pool if was pending
      if (retention.auction_id) {
        const inPool = db.prepare('SELECT id FROM auction_players WHERE auction_id = ? AND player_id = ?').get(retention.auction_id, retention.player_id);
        if (!inPool) {
          const now = new Date().toISOString();
          db.prepare(`
            INSERT OR IGNORE INTO auction_players (id, auction_id, player_id, base_price, current_order, status, created_at)
            VALUES (?, ?, ?, 500, 999, 'PENDING', ?)
          `).run('ap_' + Date.now(), retention.auction_id, retention.player_id, now);
        }
      }
    });

    releaseTx();
    res.json({ success: true, message: `Retention removed for ${player?.full_name || 'player'}.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
