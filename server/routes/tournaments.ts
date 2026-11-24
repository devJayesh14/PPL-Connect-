import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET all tournaments
router.get('/', (req, res) => {
  try {
    const tournaments = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM auctions WHERE tournament_id = t.id) as auction_count,
        (SELECT COUNT(*) FROM teams WHERE tournament_id = t.id) as team_count
      FROM tournaments t
      ORDER BY t.created_at DESC
    `).all();
    res.json(tournaments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET single tournament with auctions & teams
router.get('/:id', (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const auctions = db.prepare('SELECT * FROM auctions WHERE tournament_id = ? ORDER BY created_at DESC').all(req.params.id);
    const teams = db.prepare(`
      SELECT t.*, c.name as captain_name, c.email as captain_email, c.mobile as captain_mobile
      FROM teams t
      LEFT JOIN captains c ON t.captain_id = c.id
      WHERE t.tournament_id = ?
    `).all(req.params.id);

    res.json({ ...tournament, auctions, teams });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE tournament
router.post('/', (req, res) => {
  try {
    const { name, description, sport = 'CRICKET', startDate, endDate, location, logo, banner } = req.body;
    if (!name) return res.status(400).json({ error: 'Tournament name is required' });

    const id = 'tour_' + Date.now();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO tournaments (id, name, description, sport, status, start_date, end_date, location, logo, banner, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'UPCOMING', ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description || '', sport, startDate || null, endDate || null, location || '', logo || '', banner || '', now, now);

    const created = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE tournament
router.put('/:id', (req, res) => {
  try {
    const { name, description, sport, status, startDate, endDate, location, logo, banner } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    db.prepare(`
      UPDATE tournaments 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          sport = COALESCE(?, sport),
          status = COALESCE(?, status),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          location = COALESCE(?, location),
          logo = COALESCE(?, logo),
          banner = COALESCE(?, banner),
          updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name : existing.name,
      description !== undefined ? description : existing.description,
      sport !== undefined ? sport : existing.sport,
      status !== undefined ? status : existing.status,
      startDate !== undefined ? startDate : existing.start_date,
      endDate !== undefined ? endDate : existing.end_date,
      location !== undefined ? location : existing.location,
      logo !== undefined ? logo : existing.logo,
      banner !== undefined ? banner : existing.banner,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE tournament
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const deleteTx = db.transaction(() => {
      // Find all auctions belonging to tournament
      const auctions = db.prepare('SELECT id FROM auctions WHERE tournament_id = ?').all(id) as { id: string }[];
      for (const auc of auctions) {
        db.prepare('DELETE FROM auction_configs WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM player_categories WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM player_registrations WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM auction_players WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM team_retentions WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM team_squads WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM auction_results WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM bids WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM purse_transactions WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM audit_logs WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM captains WHERE auction_id = ?').run(auc.id);
        db.prepare('DELETE FROM auctions WHERE id = ?').run(auc.id);
      }

      // Clean up captains of teams belonging to this tournament
      const teams = db.prepare('SELECT id FROM teams WHERE tournament_id = ?').all(id) as { id: string }[];
      for (const t of teams) {
        db.prepare('DELETE FROM captains WHERE team_id = ?').run(t.id);
      }

      // Clean up squads and teams belonging to this tournament
      db.prepare('DELETE FROM team_squads WHERE tournament_id = ?').run(id);
      db.prepare('DELETE FROM teams WHERE tournament_id = ?').run(id);

      // Finally delete tournament
      db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
    });

    deleteTx();
    res.json({ success: true, message: 'Tournament deleted successfully', id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET tournament squads (Tournament Integration - Section 23)
router.get('/:id/squads', (req, res) => {
  try {
    const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(req.params.id) as any[];

    const fullSquads = teams.map(team => {
      const players = db.prepare(`
        SELECT ts.acquisition_type, ts.price, ts.joined_at,
               p.id as player_id, p.full_name, p.photo, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas
        FROM team_squads ts
        JOIN players p ON ts.player_id = p.id
        WHERE ts.team_id = ? AND ts.tournament_id = ?
        ORDER BY ts.acquisition_type DESC, ts.price DESC
      `).all(team.id, req.params.id);

      return {
        team,
        totalPlayers: players.length,
        totalSpent: players.reduce((sum: number, p: any) => sum + p.price, 0),
        players,
      };
    });

    res.json(fullSquads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
