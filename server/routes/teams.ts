import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET all teams for an auction
router.get('/', (req, res) => {
  try {
    const { auctionId, tournamentId } = req.query;

    if (auctionId) {
      // Auto-link any existing teams that don't have an auction_id to this active auction
      try {
        db.prepare(`
          UPDATE teams 
          SET auction_id = ? 
          WHERE auction_id IS NULL OR auction_id = ''
        `).run(auctionId);
      } catch (e) {}
    }

    let query = `
      SELECT t.*, 
        COALESCE(c.name, c_fallback.name) as captain_name, 
        COALESCE(c.email, c_fallback.email) as captain_email, 
        COALESCE(c.mobile, c_fallback.mobile) as captain_mobile, 
        COALESCE(c.status, c_fallback.status, 'APPROVED') as captain_status,
        (SELECT COUNT(*) FROM team_squads WHERE team_id = t.id) as squad_count,
        (SELECT COUNT(*) FROM team_retentions WHERE team_id = t.id) as retention_count
      FROM teams t
      LEFT JOIN captains c ON t.captain_id = c.id
      LEFT JOIN captains c_fallback ON c_fallback.team_id = t.id
    `;
    const params: any[] = [];
    if (auctionId) {
      query += " WHERE (t.auction_id = ? OR t.auction_id IS NULL OR t.auction_id = '')";
      params.push(auctionId);
    } else if (tournamentId) {
      query += " WHERE (t.tournament_id = ? OR t.tournament_id IS NULL OR t.tournament_id = '')";
      params.push(tournamentId);
    }
    query += ' GROUP BY t.id ORDER BY t.name ASC';

    const teams = db.prepare(query).all(...params);
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single team details: squad, retentions, purchases, purse history
router.get('/:id', (req, res) => {
  try {
    const team = db.prepare(`
      SELECT t.*, 
        COALESCE(c.id, c_fallback.id) as captain_id, 
        COALESCE(c.name, c_fallback.name) as captain_name, 
        COALESCE(c.email, c_fallback.email) as captain_email, 
        COALESCE(c.mobile, c_fallback.mobile) as captain_mobile, 
        COALESCE(c.status, c_fallback.status, 'APPROVED') as captain_status
      FROM teams t
      LEFT JOIN captains c ON t.captain_id = c.id
      LEFT JOIN captains c_fallback ON c_fallback.team_id = t.id
      WHERE t.id = ?
    `).get(req.params.id) as any;

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Squad players
    const squad = db.prepare(`
      SELECT ts.id as squad_record_id, ts.acquisition_type, ts.price, ts.joined_at,
             p.id as player_id, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age
      FROM team_squads ts
      JOIN players p ON ts.player_id = p.id
      WHERE ts.team_id = ?
      ORDER BY ts.acquisition_type DESC, ts.price DESC
    `).all(req.params.id);

    // Purse transactions
    const purseHistory = db.prepare(`
      SELECT * FROM purse_transactions
      WHERE team_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({
      ...team,
      squad,
      purseHistory,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST create team
router.post('/', (req, res) => {
  try {
    let { tournamentId, auctionId, name, shortName, logo, color, initialPurse = 20000, captainName, captainEmail, captainMobile } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const now = new Date().toISOString();

    // 1. Resolve Tournament safely
    let targetTourId = tournamentId;
    let tour = targetTourId ? db.prepare('SELECT id FROM tournaments WHERE id = ?').get(targetTourId) as any : null;
    if (!tour) {
      tour = db.prepare('SELECT id FROM tournaments WHERE id = ?').get('tour_ppl_2026') as any;
    }
    if (!tour) {
      tour = db.prepare('SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1').get() as any;
    }
    if (!tour) {
      targetTourId = 'tour_ppl_2026';
      db.prepare(`
        INSERT OR IGNORE INTO tournaments (id, name, description, sport, status, start_date, end_date, location, logo, banner, created_at, updated_at)
        VALUES (?, 'Priyanka Premiere League (PPL)', 'Official PPL Championship Tournament', 'CRICKET', 'UPCOMING', '2026-12-10', '2026-12-25', 'Surat, Gujarat', '/logo.png', '', ?, ?)
      `).run(targetTourId, now, now);
      tour = { id: targetTourId };
    }
    targetTourId = tour.id;

    // 2. Resolve Auction safely
    let targetAucId = auctionId;
    let auc = targetAucId ? db.prepare('SELECT id FROM auctions WHERE id = ?').get(targetAucId) as any : null;
    if (!auc) {
      auc = db.prepare('SELECT id FROM auctions WHERE id = ?').get('auc_default') as any;
    }
    if (!auc) {
      auc = db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any;
    }
    if (!auc) {
      const aucId = 'auc_default';
      const shareLink = `/auction/ppl-2026`;
      db.prepare(`
        INSERT OR IGNORE INTO auctions (id, tournament_id, name, description, auction_date, start_time, end_time, timezone, status, logo, banner, share_link, created_at, updated_at)
        VALUES (?, ?, 'PPL Grand Auction 2026', 'Official Player Auction for Priyanka Premiere League', '2026-12-10', '10:00 AM', '06:00 PM', 'IST (+05:30)', 'REGISTRATION_OPEN', '/logo.png', '', ?, ?, ?)
      `).run(aucId, targetTourId, shareLink, now, now);
      auc = db.prepare('SELECT id FROM auctions WHERE id = ?').get(aucId) as any;
    }
    targetAucId = auc ? auc.id : null;

    const id = 'tm_' + Date.now();

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO teams (id, tournament_id, auction_id, name, short_name, logo, color, initial_purse, spent_purse, remaining_purse, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(id, targetTourId, targetAucId, name.trim(), (shortName || name.substring(0, 3)).toUpperCase().trim(), logo || '', color || '#2563EB', initialPurse, initialPurse, now);

      if (captainName && captainEmail) {
        const capId = 'cap_' + Date.now();
        db.prepare(`
          INSERT INTO captains (id, team_id, auction_id, name, mobile, email, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?)
        `).run(capId, id, targetAucId, captainName, captainMobile || '', captainEmail.trim().toLowerCase(), now);

        db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(capId, id);
      }

      if (targetAucId) {
        db.prepare(`
          INSERT INTO purse_transactions (id, auction_id, team_id, type, amount, balance_after, description, created_by, created_at)
          VALUES (?, ?, ?, 'INITIAL', ?, ?, 'Initial purse allocation', 'ADMIN', ?)
        `).run('ptx_' + Date.now(), targetAucId, id, initialPurse, initialPurse, now);
      }
    });

    createTx();

    const created = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT edit team
router.put('/:id', (req, res) => {
  try {
    const { name, shortName, logo, color, initialPurse, remainingPurse } = req.body;
    db.prepare(`
      UPDATE teams
      SET name = COALESCE(?, name),
          short_name = COALESCE(?, short_name),
          logo = COALESCE(?, logo),
          color = COALESCE(?, color),
          initial_purse = COALESCE(?, initial_purse),
          remaining_purse = COALESCE(?, remaining_purse)
      WHERE id = ?
    `).run(name, shortName, logo, color, initialPurse || null, remainingPurse || null, req.params.id);

    const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE team (Team Management CRUD)
router.delete('/:id', (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any;
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const deleteTx = db.transaction(() => {
      // Unlink captains and delete captain records for this team
      db.prepare('DELETE FROM captains WHERE team_id = ?').run(req.params.id);
      db.prepare('DELETE FROM team_squads WHERE team_id = ?').run(req.params.id);
      db.prepare('DELETE FROM team_retentions WHERE team_id = ?').run(req.params.id);
      db.prepare('DELETE FROM purse_transactions WHERE team_id = ?').run(req.params.id);
      db.prepare('DELETE FROM bids WHERE team_id = ?').run(req.params.id);
      db.prepare("UPDATE auction_players SET winning_team_id = NULL, status = 'PENDING' WHERE winning_team_id = ?").run(req.params.id);
      db.prepare("UPDATE users SET team_id = NULL WHERE team_id = ?").run(req.params.id);
      db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
    });

    deleteTx();
    res.json({ success: true, message: `Team "${team.name}" has been deleted.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Assign Captain to Team (Super Admin Decision)
router.post('/:id/assign-captain', (req, res) => {
  try {
    const { playerId, captainName, email, mobile } = req.body;
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any;
    if (!team) return res.status(404).json({ error: 'Team not found' });

    let player: any = null;
    if (playerId) {
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
    }

    const assignedName = captainName || player?.full_name || 'Team Captain';
    const assignedEmail = (email || player?.email || `${team.short_name.toLowerCase()}@team.com`).trim().toLowerCase();
    const assignedMobile = mobile || player?.mobile || '';
    const now = new Date().toISOString();
    const targetAuc = team.auction_id || (db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any)?.id || null;

    const assignTx = db.transaction(() => {
      // 1. Create or update user account
      let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(assignedEmail) as any;
      const userId = user ? user.id : 'usr_' + Date.now();
      if (!user) {
        db.prepare(`
          INSERT INTO users (id, name, email, mobile, password, role, team_id, status, created_at)
          VALUES (?, ?, ?, ?, 'admin123', 'CAPTAIN', ?, 'ACTIVE', ?)
        `).run(userId, assignedName, assignedEmail, assignedMobile, team.id, now);
      } else {
        db.prepare("UPDATE users SET role = 'CAPTAIN', team_id = ? WHERE id = ?").run(team.id, user.id);
      }

      // 2. Insert or update captain record
      const capId = 'cap_' + Date.now();
      db.prepare(`
        INSERT INTO captains (id, user_id, team_id, auction_id, name, mobile, email, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
      `).run(capId, userId, team.id, targetAuc, assignedName, assignedMobile, assignedEmail, now);

      // 3. Update team captain_id
      db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(capId, team.id);

      // 4. Log in audit trail
      if (targetAuc) {
        db.prepare(`
          INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
          VALUES (?, ?, 'usr_admin', 'Super Admin', 'CAPTAIN_ASSIGNED', ?, ?)
        `).run('aud_' + Date.now(), targetAuc, `Super Admin assigned ${assignedName} (${assignedEmail}) as Captain for ${team.name}.`, now);
      }

      return { captainId: capId, teamId: team.id, assignedName };
    });

    const result = assignTx();
    res.json({
      success: true,
      message: `Successfully assigned ${result.assignedName} as Captain of ${team.name}!`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Manual Purse Adjustment by Admin (Section 5)
router.post('/:id/adjust-purse', (req, res) => {
  try {
    const { adjustmentAmount, reason, auctionId } = req.body;
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any;
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const newRemaining = team.remaining_purse + Number(adjustmentAmount);
    if (newRemaining < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative remaining purse.' });
    }

    const now = new Date().toISOString();
    const txId = 'ptx_' + Date.now();
    const targetAuctionId = auctionId || team.auction_id;

    const adjustTx = db.transaction(() => {
      db.prepare(`
        UPDATE teams 
        SET remaining_purse = ?
        WHERE id = ?
      `).run(newRemaining, team.id);

      db.prepare(`
        INSERT INTO purse_transactions (id, auction_id, team_id, type, amount, balance_after, description, created_by, created_at)
        VALUES (?, ?, ?, 'ADMIN_ADJUSTMENT', ?, ?, ?, 'ADMIN', ?)
      `).run(txId, targetAuctionId, team.id, adjustmentAmount, newRemaining, reason || 'Manual Admin Purse Adjustment', now);

      if (targetAuctionId) {
        db.prepare(`
          INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
          VALUES (?, ?, 'ADMIN', 'ADMIN', 'PURSE_ADJUSTED', ?, ?)
        `).run(
          'aud_' + Date.now(),
          targetAuctionId,
          `Adjusted purse for team ${team.name} by ₹${Number(adjustmentAmount).toLocaleString('en-IN')}. New balance: ₹${newRemaining.toLocaleString('en-IN')}. Reason: ${reason}`,
          now
        );
      }
    });

    adjustTx();

    const updatedTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(team.id);
    res.json({ success: true, team: updatedTeam });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
