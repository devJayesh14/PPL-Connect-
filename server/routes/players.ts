import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET Public Self-Check: Players can check if they are registered by mobile or email
router.get('/self-check', (req, res) => {
  try {
    const rawQuery = String(req.query.q || req.query.query || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ error: 'Please enter a mobile number or email address.' });
    }

    const isEmail = rawQuery.includes('@');
    let row: any = null;

    if (isEmail) {
      row = db.prepare(`
        SELECT p.id, p.full_name, p.mobile, p.email, p.playing_role, p.batting_style, p.bowling_style,
               COALESCE(p.status, 'PENDING') as player_status, p.created_at, p.photo,
               pr.status as registration_status, pr.base_price, pr.auction_id,
               tr.status as retention_status, t.name as retained_team
        FROM players p
        LEFT JOIN player_registrations pr ON p.id = pr.player_id
        LEFT JOIN team_retentions tr ON p.id = tr.player_id AND tr.status = 'CONFIRMED'
        LEFT JOIN teams t ON tr.team_id = t.id
        WHERE LOWER(p.email) = ?
        ORDER BY p.created_at DESC LIMIT 1
      `).get(rawQuery.toLowerCase());
    } else {
      const digits = rawQuery.replace(/\\D/g, '');
      const last10 = digits.slice(-10);
      if (last10.length < 5) {
        return res.status(400).json({ error: 'Please enter at least 5 digits of your mobile number or a valid email.' });
      }

      row = db.prepare(`
        SELECT p.id, p.full_name, p.mobile, p.email, p.playing_role, p.batting_style, p.bowling_style,
               COALESCE(p.status, 'PENDING') as player_status, p.created_at, p.photo,
               pr.status as registration_status, pr.base_price, pr.auction_id,
               tr.status as retention_status, t.name as retained_team
        FROM players p
        LEFT JOIN player_registrations pr ON p.id = pr.player_id
        LEFT JOIN team_retentions tr ON p.id = tr.player_id AND tr.status = 'CONFIRMED'
        LEFT JOIN teams t ON tr.team_id = t.id
        WHERE REPLACE(REPLACE(REPLACE(p.mobile, ' ', ''), '-', ''), '+91', '') LIKE ?
           OR p.mobile LIKE ?
        ORDER BY p.created_at DESC LIMIT 1
      `).get('%' + last10 + '%', '%' + last10 + '%');
    }

    if (!row) {
      return res.json({
        found: false,
        query: rawQuery,
        message: 'No player registration found for this mobile number or email.',
        registerUrl: '/register'
      });
    }

    // Privacy masking
    let maskedEmail = '';
    if (row.email) {
      const [u, d] = row.email.split('@');
      maskedEmail = (u.length <= 2 ? u[0] + '*' : u[0] + '*'.repeat(Math.min(u.length - 2, 5)) + u.slice(-1)) + '@' + d;
    }

    let maskedMobile = '';
    if (row.mobile) {
      const cleanMob = row.mobile.replace(/\\D/g, '').slice(-10);
      maskedMobile = cleanMob.length === 10 ? cleanMob.slice(0, 3) + '****' + cleanMob.slice(7) : '******' + cleanMob.slice(-4);
    }

    return res.json({
      found: true,
      player: {
        id: row.id,
        fullName: row.full_name,
        maskedEmail,
        maskedMobile,
        playingRole: row.playing_role,
        battingStyle: row.batting_style,
        bowlingStyle: row.bowling_style,
        status: row.player_status,
        basePrice: row.base_price || 500,
        isRetained: !!row.retained_team,
        retainedTeam: row.retained_team || null,
        registeredAt: row.created_at,
        hasPhoto: !!(row.photo && row.photo.length > 50)
      }
    });
  } catch (err: any) {
    console.error('Self check error:', err);
    return res.status(500).json({ error: 'Server error checking player registration' });
  }
});

// GET all players with approval status for Player Management (with pagination)
router.get('/management', (req, res) => {
  try {
    const { status, role, search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * pageSize;

    let whereClause = ' WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'ALL') {
      whereClause += ` AND COALESCE(pr.status, p.status, 'PENDING') = ?`;
      params.push(status);
    }

    if (role && role !== 'ALL') {
      whereClause += ' AND p.playing_role = ?';
      params.push(role);
    }

    if (search) {
      whereClause += ' AND (p.full_name LIKE ? OR p.mobile LIKE ? OR p.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const baseQuery = `
      FROM players p
      LEFT JOIN (
        SELECT player_id, auction_id, category_id, base_price, remarks, status,
               ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at DESC) as rn
        FROM player_registrations
      ) pr ON p.id = pr.player_id AND pr.rn = 1
      LEFT JOIN auctions a ON pr.auction_id = a.id
      LEFT JOIN player_categories pc ON pr.category_id = pc.id
      ${whereClause}
    `;

    // Get total count
    const countRow = db.prepare(`SELECT COUNT(DISTINCT p.id) as total ${baseQuery}`).get(...params) as any;
    const total = countRow?.total || 0;

    // Get paginated data
    const dataQuery = `
      SELECT p.*, 
        COALESCE(pr.status, p.status, 'PENDING') as registration_status,
        pr.auction_id,
        pr.base_price as registered_base_price,
        pr.remarks as registration_remarks,
        pc.name as category_name,
        a.name as auction_name,
        (SELECT COUNT(*) FROM auction_players WHERE player_id = p.id AND status = 'SOLD') as is_sold
      ${baseQuery}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const list = db.prepare(dataQuery).all(...params, pageSize, offset);
    res.json({
      players: list,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Public Shareable Player Pool (NO MOBILE NUMBER FOR PRIVACY)
router.get('/public-pool', (req, res) => {
  try {
    const { role, search } = req.query;
    let whereClause = ' WHERE 1=1';
    const params: any[] = [];

    if (role && role !== 'ALL') {
      whereClause += ' AND p.playing_role = ?';
      params.push(role);
    }

    if (search) {
      whereClause += ' AND (p.full_name LIKE ? OR p.playing_role LIKE ? OR p.batting_style LIKE ? OR p.bowling_style LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const players = db.prepare(`
      SELECT 
        p.id, 
        p.full_name, 
        p.photo, 
        p.playing_role, 
        p.batting_style, 
        p.bowling_style, 
        p.is_overseas, 
        p.experience, 
        p.created_at,
        COALESCE(pr.base_price, 500) as base_price,
        COALESCE(pr.status, p.status, 'PENDING') as status,
        t.name as retained_team_name,
        t.logo as retained_team_logo,
        ts.name as sold_team_name,
        ap.final_bid as sold_price
      FROM players p
      LEFT JOIN (
        SELECT player_id, base_price, status,
               ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at DESC) as rn
        FROM player_registrations
      ) pr ON p.id = pr.player_id AND pr.rn = 1
      LEFT JOIN team_retentions tr ON p.id = tr.player_id AND tr.status = 'CONFIRMED'
      LEFT JOIN teams t ON tr.team_id = t.id
      LEFT JOIN auction_players ap ON p.id = ap.player_id AND ap.status = 'SOLD'
      LEFT JOIN teams ts ON ap.winning_team_id = ts.id
      ${whereClause}
      ORDER BY p.full_name ASC
    `).all(...params);

    res.json(players);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH Approve or Reject player directly
router.patch('/:id/approval', (req, res) => {
  try {
    const { status, remarks, auctionId } = req.body; // 'APPROVED' | 'REJECTED'
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id) as any;
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const now = new Date().toISOString();

    const approveTx = db.transaction(() => {
      // Always update player status directly
      db.prepare('UPDATE players SET status = ? WHERE id = ?').run(status, player.id);

      let reg = db.prepare('SELECT * FROM player_registrations WHERE player_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id) as any;
      const targetAuc = auctionId || reg?.auction_id || (db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any)?.id;

      if (reg) {
        db.prepare('UPDATE player_registrations SET status = ?, remarks = ? WHERE id = ?').run(status, remarks || null, reg.id);
      } else if (targetAuc) {
        db.prepare(`
          INSERT INTO player_registrations (id, player_id, auction_id, base_price, status, created_at)
          VALUES (?, ?, ?, 500, ?, ?)
        `).run('preg_' + Date.now(), player.id, targetAuc, status, now);
      }

      if (status === 'APPROVED' && targetAuc) {
        const isRetainedOrSquad = db.prepare(`
          SELECT 1 FROM team_retentions WHERE player_id = ? AND status != 'REJECTED'
          UNION
          SELECT 1 FROM team_squads WHERE player_id = ?
        `).get(player.id, player.id);

        if (!isRetainedOrSquad) {
          const existingInPool = db.prepare('SELECT * FROM auction_players WHERE auction_id = ? AND player_id = ?').get(targetAuc, player.id) as any;
          if (!existingInPool) {
            const maxOrderRow = db.prepare('SELECT MAX(current_order) as maxOrder FROM auction_players WHERE auction_id = ?').get(targetAuc) as any;
            const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;
            const apId = 'ap_' + Date.now();
            db.prepare(`
              INSERT INTO auction_players (id, auction_id, player_id, base_price, current_order, status, created_at)
              VALUES (?, ?, ?, 500, ?, 'PENDING', ?)
            `).run(apId, targetAuc, player.id, nextOrder, now);
          }
        }
      } else if (status === 'REJECTED' && targetAuc) {
        db.prepare("DELETE FROM auction_players WHERE auction_id = ? AND player_id = ? AND status = 'PENDING'").run(targetAuc, player.id);
      }
    });

    approveTx();
    res.json({ success: true, message: `Player has been ${status} successfully.`, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all global players
router.get('/', (req, res) => {
  try {
    const { role, isOverseas, search } = req.query;
    let query = 'SELECT * FROM players WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND playing_role = ?';
      params.push(role);
    }
    if (isOverseas !== undefined) {
      query += ' AND is_overseas = ?';
      params.push(isOverseas === 'true' || isOverseas === '1' ? 1 : 0);
    }
    if (search) {
      query += ' AND (full_name LIKE ? OR mobile LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY full_name ASC';
    const players = db.prepare(query).all(...params);
    res.json(players);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET registrations for an auction with approval status
router.get('/registrations/:auctionId', (req, res) => {
  try {
    const registrations = db.prepare(`
      SELECT pr.*, p.full_name, p.photo, p.mobile, p.email, p.date_of_birth, p.age,
             p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.experience, p.previous_team, p.player_bio,
             pc.name as category_name
      FROM player_registrations pr
      JOIN players p ON pr.player_id = p.id
      LEFT JOIN player_categories pc ON pr.category_id = pc.id
      WHERE pr.auction_id = ?
      ORDER BY pr.created_at DESC
    `).all(req.params.auctionId);

    res.json(registrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET auction pool players with filters (Section 14)
router.get('/pool/:auctionId', (req, res) => {
  try {
    const { categoryId, role, status, search } = req.query;
    let query = `
      SELECT ap.*, p.full_name, p.photo, p.mobile, p.email, p.playing_role, p.batting_style, p.bowling_style, p.is_overseas, p.age, p.experience,
             pc.name as category_name, t.name as winning_team_name, t.logo as winning_team_logo
      FROM auction_players ap
      JOIN players p ON ap.player_id = p.id
      LEFT JOIN player_categories pc ON ap.category_id = pc.id
      LEFT JOIN teams t ON ap.winning_team_id = t.id
      WHERE ap.auction_id = ?
    `;
    const params: any[] = [req.params.auctionId];

    if (categoryId) {
      query += ' AND ap.category_id = ?';
      params.push(categoryId);
    }
    if (role) {
      query += ' AND p.playing_role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND ap.status = ?';
      params.push(status);
      if (status === 'PENDING') {
        query += ` AND ap.player_id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')`;
        query += ` AND ap.player_id NOT IN (SELECT player_id FROM team_squads)`;
      }
    }
    if (search) {
      query += ' AND p.full_name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY ap.current_order ASC, ap.created_at ASC';
    const pool = db.prepare(query).all(...params);
    res.json(pool);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Player Registration (Section 11)
router.post('/register', (req, res) => {
  try {
    const {
      fullName,
      photo,
      mobile,
      email,
      dateOfBirth,
      age,
      playingRole = 'BATSMAN',
      battingStyle,
      bowlingStyle,
      isOverseas = false,
      experience,
      previousTeam,
      playerBio,
      auctionId,
      categoryId,
      basePrice,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email ID is required.' });
    }

    if (!photo || !photo.trim()) {
      return res.status(400).json({ error: 'Player photo upload is mandatory. Please provide a photo.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // STRICT DUPLICATE EMAIL CHECK: "same email id not allowed if then do not allow to register"
    const existingPlayer = db.prepare('SELECT id, full_name FROM players WHERE LOWER(email) = ?').get(cleanEmail);
    const existingUser = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = ?').get(cleanEmail);

    if (existingPlayer || existingUser) {
      return res.status(400).json({ 
        error: 'This email ID is already registered. Duplicate emails are not allowed.' 
      });
    }

    const now = new Date().toISOString();

    const regTx = db.transaction(() => {
      const playerId = 'ply_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      db.prepare(`
        INSERT INTO players (id, full_name, photo, mobile, email, date_of_birth, age, playing_role, batting_style, bowling_style, is_overseas, experience, previous_team, player_bio, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        playerId, fullName, photo || '', mobile || '', cleanEmail,
        dateOfBirth || null, age || null, playingRole,
        battingStyle || 'Right Hand Bat', bowlingStyle || 'Right Arm Medium',
        isOverseas ? 1 : 0, experience || '', previousTeam || '', playerBio || '', now
      );

      // Create a user record so they can log in if needed
      db.prepare(`
        INSERT INTO users (id, name, email, mobile, password, role, status, created_at)
        VALUES (?, ?, ?, ?, 'admin123', 'PLAYER', 'ACTIVE', ?)
        ON CONFLICT(email) DO NOTHING
      `).run('usr_' + playerId, fullName, cleanEmail, mobile || '', now);

      // If registered for an auction
      let targetAuctionRow = db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any;
      const targetAuction = (auctionId && db.prepare('SELECT id FROM auctions WHERE id = ?').get(auctionId)) ? auctionId : targetAuctionRow?.id || null;

      if (targetAuction) {
        const config = db.prepare('SELECT default_base_price FROM auction_configs WHERE auction_id = ?').get(targetAuction) as any;
        const assignedBasePrice = Number(basePrice) || config?.default_base_price || 500;

        const regId = 'preg_' + Date.now();
        db.prepare(`
          INSERT INTO player_registrations (id, player_id, auction_id, category_id, base_price, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'APPROVED', ?)
          ON CONFLICT(player_id, auction_id) DO UPDATE SET status = 'APPROVED', category_id = excluded.category_id, base_price = excluded.base_price
        `).run(regId, playerId, targetAuction, categoryId || null, assignedBasePrice, now);

        // Auto-enroll into auction pool for admin manual additions
        const existingInPool = db.prepare('SELECT id FROM auction_players WHERE auction_id = ? AND player_id = ?').get(targetAuction, playerId);
        if (!existingInPool) {
          const maxOrderRow = db.prepare('SELECT MAX(current_order) as maxOrder FROM auction_players WHERE auction_id = ?').get(targetAuction) as any;
          const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;
          db.prepare(`
            INSERT INTO auction_players (id, auction_id, player_id, base_price, current_order, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
          `).run('ap_' + Date.now(), targetAuction, playerId, assignedBasePrice, nextOrder, now);
        }
      }

      return playerId;
    });

    const playerId = regTx();
    const createdPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    res.status(201).json(createdPlayer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update player details
router.put('/:id', (req, res) => {
  try {
    const { fullName, email, mobile, playingRole, photo, basePrice, categoryId, auctionId } = req.body;
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id) as any;
    if (!player) return res.status(404).json({ error: 'Player not found' });

    if (email && player.email && email.trim().toLowerCase() !== player.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      const duplicate = db.prepare('SELECT id FROM players WHERE LOWER(email) = ? AND id != ?').get(cleanEmail, player.id);
      if (duplicate) {
        return res.status(400).json({ error: 'This email ID is already registered. Duplicate emails are not allowed.' });
      }
    }

    const cleanEmail = email ? email.trim().toLowerCase() : player.email;

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE players
        SET full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            mobile = COALESCE(?, mobile),
            playing_role = COALESCE(?, playing_role),
            photo = COALESCE(?, photo)
        WHERE id = ?
      `).run(fullName, cleanEmail, mobile, playingRole, photo, req.params.id);

      if (basePrice !== undefined || categoryId !== undefined) {
        db.prepare(`
          UPDATE auction_players
          SET base_price = COALESCE(?, base_price),
              category_id = COALESCE(?, category_id)
          WHERE player_id = ?
        `).run(basePrice || null, categoryId || null, req.params.id);

        db.prepare(`
          UPDATE player_registrations
          SET base_price = COALESCE(?, base_price),
              category_id = COALESCE(?, category_id)
          WHERE player_id = ?
        `).run(basePrice || null, categoryId || null, req.params.id);
      }
    });

    updateTx();
    const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE player
router.delete('/:id', (req, res) => {
  try {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id) as any;
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM auction_players WHERE player_id = ?').run(req.params.id);
      db.prepare('DELETE FROM player_registrations WHERE player_id = ?').run(req.params.id);
      db.prepare('DELETE FROM team_squads WHERE player_id = ?').run(req.params.id);
      db.prepare('DELETE FROM team_retentions WHERE player_id = ?').run(req.params.id);
      db.prepare('DELETE FROM bids WHERE player_id = ?').run(req.params.id);
      if (player.email) {
        db.prepare('DELETE FROM users WHERE LOWER(email) = ?').run(player.email.toLowerCase());
      }
      db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
    });

    deleteTx();
    res.json({ success: true, message: 'Player removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST sync all registered players into auction pool
router.post('/sync-all-to-pool/:auctionId', (req, res) => {
  try {
    const { auctionId } = req.params;
    const config = db.prepare('SELECT default_base_price FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
    const defaultBasePrice = config?.default_base_price || 500;

    // STRICT: Only sync players who are NOT retained and NOT in any squad
    const allPlayers = db.prepare(`
      SELECT p.* FROM players p
      WHERE p.id NOT IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')
        AND p.id NOT IN (SELECT player_id FROM team_squads)
    `).all() as any[];
    const now = new Date().toISOString();

    let addedCount = 0;
    const syncTx = db.transaction(() => {
      for (const p of allPlayers) {
        const inPool = db.prepare('SELECT id FROM auction_players WHERE auction_id = ? AND player_id = ?').get(auctionId, p.id);
        if (!inPool) {
          const maxOrderRow = db.prepare('SELECT MAX(current_order) as maxOrder FROM auction_players WHERE auction_id = ?').get(auctionId) as any;
          const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;

          db.prepare(`
            INSERT INTO auction_players (id, auction_id, player_id, category_id, base_price, current_order, status, created_at)
            VALUES (?, ?, ?, NULL, ?, ?, 'PENDING', ?)
          `).run('ap_' + p.id, auctionId, p.id, defaultBasePrice, nextOrder, now);
          addedCount++;
        }
      }
    });

    syncTx();
    res.json({ success: true, message: `Synced ${addedCount} players into auction pool`, totalPlayers: allPlayers.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH Approve / Reject / Suspend Player Registration (Section 11)
router.patch('/registrations/:id/status', (req, res) => {
  try {
    const { status, remarks } = req.body; // 'APPROVED' | 'REJECTED' | 'SUSPENDED'
    const reg = db.prepare('SELECT * FROM player_registrations WHERE id = ?').get(req.params.id) as any;
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    const now = new Date().toISOString();

    const approveTx = db.transaction(() => {
      db.prepare(`
        UPDATE player_registrations
        SET status = ?, remarks = ?
        WHERE id = ?
      `).run(status, remarks || null, req.params.id);

      // If APPROVED, auto-enter into auction_players pool if not already in pool, and NOT retained/in squad!
      if (status === 'APPROVED') {
        const isRetainedOrSquad = db.prepare(`
          SELECT 1 FROM team_retentions WHERE player_id = ? AND status != 'REJECTED'
          UNION
          SELECT 1 FROM team_squads WHERE player_id = ?
        `).get(reg.player_id, reg.player_id);

        if (!isRetainedOrSquad) {
          const existingInPool = db.prepare('SELECT * FROM auction_players WHERE auction_id = ? AND player_id = ?').get(reg.auction_id, reg.player_id);
          if (!existingInPool) {
            const config = db.prepare('SELECT default_base_price FROM auction_configs WHERE auction_id = ?').get(reg.auction_id) as any;
            const assignedBasePrice = reg.base_price || config?.default_base_price || 500;

            const maxOrderRow = db.prepare('SELECT MAX(current_order) as maxOrder FROM auction_players WHERE auction_id = ?').get(reg.auction_id) as any;
            const nextOrder = (maxOrderRow?.maxOrder || 0) + 1;

            const apId = 'ap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            db.prepare(`
              INSERT INTO auction_players (id, auction_id, player_id, category_id, base_price, current_order, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?)
            `).run(apId, reg.auction_id, reg.player_id, reg.category_id, assignedBasePrice, nextOrder, now);
          }
        }
      } else if (status === 'REJECTED' || status === 'SUSPENDED') {
        // If rejected, remove from pool if was pending
        db.prepare("DELETE FROM auction_players WHERE auction_id = ? AND player_id = ? AND status = 'PENDING'").run(reg.auction_id, reg.player_id);
      }
    });

    approveTx();

    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Re-order or Randomize Auction Pool (Section 14)
router.post('/pool/:auctionId/randomize', (req, res) => {
  try {
    const players = db.prepare("SELECT id FROM auction_players WHERE auction_id = ? AND status = 'PENDING'").all(req.params.auctionId) as any[];

    // Fisher-Yates shuffle
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const randomizeTx = db.transaction(() => {
      shuffled.forEach((p, idx) => {
        db.prepare('UPDATE auction_players SET current_order = ? WHERE id = ?').run(idx + 1, p.id);
      });
    });

    randomizeTx();

    res.json({ success: true, message: `Randomized ${shuffled.length} players in the auction pool.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH Update Auction Player specific base price or order
router.patch('/pool/:id', (req, res) => {
  try {
    const { basePrice, currentOrder, categoryId } = req.body;
    db.prepare(`
      UPDATE auction_players
      SET base_price = COALESCE(?, base_price),
          current_order = COALESCE(?, current_order),
          category_id = COALESCE(?, category_id)
      WHERE id = ?
    `).run(basePrice, currentOrder, categoryId, req.params.id);

    const updated = db.prepare('SELECT * FROM auction_players WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
