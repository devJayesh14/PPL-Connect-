import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, mobile, role, team_id, status, created_at FROM users').all();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Login (Admin, Captain, Player)
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Super Admin
    if (cleanEmail === 'admin@pplconnect.com') {
      if (password && password !== 'admin123') {
        return res.status(401).json({ error: 'Invalid password. Default Super Admin password is admin123' });
      }
      const adminUser = db.prepare("SELECT * FROM users WHERE role = 'ADMIN'").get() as any;
      return res.json({
        user: {
          id: adminUser?.id || 'usr_admin',
          name: adminUser?.name || 'Super Admin',
          email: 'admin@pplconnect.com',
          role: 'ADMIN',
        },
        token: 'token_admin_' + Date.now(),
      });
    }

    // 2. Check general users table
    let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;

    // Check if captain exists in captains table
    const captainRecord = db.prepare(`
      SELECT * FROM captains 
      WHERE LOWER(email) = ? 
      ORDER BY CASE WHEN status = 'APPROVED' THEN 1 ELSE 2 END, created_at DESC 
      LIMIT 1
    `).get(cleanEmail) as any;

    if (!user && captainRecord) {
      const newUserId = captainRecord.user_id || ('usr_' + Date.now());
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO users (id, name, email, mobile, password, role, team_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'CAPTAIN', ?, 'ACTIVE', ?)
        ON CONFLICT(email) DO UPDATE SET role = 'CAPTAIN', team_id = excluded.team_id, password = excluded.password
      `).run(newUserId, captainRecord.name, cleanEmail, captainRecord.mobile || '', password || 'admin123', captainRecord.team_id, now);

      user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please register first.' });
    }

    if (user.password && password && user.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please verify your password.' });
    }

    // Check if Captain
    if (user.role === 'CAPTAIN' || captainRecord) {
      const activeCaptain = captainRecord || db.prepare(`
        SELECT * FROM captains 
        WHERE user_id = ? OR LOWER(email) = ?
        ORDER BY CASE WHEN status = 'APPROVED' THEN 1 ELSE 2 END, created_at DESC 
        LIMIT 1
      `).get(user.id, cleanEmail) as any;

      if (activeCaptain && activeCaptain.status !== 'APPROVED') {
        return res.status(403).json({
          error: 'Your captain registration is currently PENDING Super Admin approval. Please wait for confirmation.',
          status: 'PENDING',
        });
      }

      const activeTeamId = user.team_id || activeCaptain?.team_id;
      const team = activeTeamId ? db.prepare('SELECT * FROM teams WHERE id = ?').get(activeTeamId) : null;
      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'CAPTAIN',
          teamId: activeTeamId,
        },
        team,
        token: 'token_cap_' + Date.now(),
      });
    }

    // Player Login
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'PLAYER',
      },
      token: 'token_ply_' + Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all captains (with approval status)
router.get('/captains', (req, res) => {
  try {
    // 1. Auto-sync any users with role='CAPTAIN' who are missing from captains table
    try {
      const nowTime = new Date().toISOString();
      const unlinkedCapUsers = db.prepare(`
        SELECT u.* FROM users u 
        WHERE u.role = 'CAPTAIN' 
          AND NOT EXISTS (SELECT 1 FROM captains c WHERE LOWER(c.email) = LOWER(u.email) OR c.user_id = u.id)
      `).all() as any[];

      for (const u of unlinkedCapUsers) {
        const capId = 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        let teamId = u.team_id;
        if (!teamId) {
          const anyTeam = db.prepare('SELECT id FROM teams WHERE captain_id IS NULL LIMIT 1').get() as any;
          teamId = anyTeam?.id || null;
        }
        if (teamId) {
          db.prepare(`
            INSERT INTO captains (id, user_id, team_id, auction_id, name, mobile, email, status, created_at)
            VALUES (?, ?, ?, 'auc_default', ?, ?, ?, 'APPROVED', ?)
          `).run(capId, u.id, teamId, u.name, u.mobile || '', u.email, nowTime);
          db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(capId, teamId);
        }
      }
    } catch (e) {}

    const captains = db.prepare(`
      SELECT c.*, 
        COALESCE(t.name, t_fallback.name, 'Franchise Team') as team_name, 
        COALESCE(t.short_name, t_fallback.short_name, 'FRN') as team_short_name,
        COALESCE(t.logo, t_fallback.logo, '') as team_logo, 
        COALESCE(t.color, t_fallback.color, '#2563EB') as team_color,
        COALESCE(t.remaining_purse, t_fallback.remaining_purse, 20000) as remaining_purse, 
        a.name as auction_name,
        p.photo as player_photo,
        p.playing_role as player_role
      FROM captains c
      LEFT JOIN teams t ON c.team_id = t.id
      LEFT JOIN teams t_fallback ON t_fallback.captain_id = c.id
      LEFT JOIN auctions a ON c.auction_id = a.id
      LEFT JOIN players p ON (
        c.player_id = p.id 
        OR (c.email != '' AND LOWER(c.email) = LOWER(p.email))
        OR (c.mobile != '' AND c.mobile = p.mobile)
      )
      ORDER BY c.created_at DESC
    `).all();
    res.json(captains);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Public Player Registration (NO LOGIN NEEDED, NO ADMIN APPROVAL NEEDED - DIRECT TO POOL!)
router.post('/register-player', (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      photo,
      category = 'Batsman',
      basePrice,
      auctionId = 'auc_default',
      password = 'admin123',
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Player name and email are required.' });
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

    // Map role enum
    let playingRole = 'BATSMAN';
    const catLower = (category || '').toLowerCase();
    if (catLower.includes('bowl')) playingRole = 'BOWLER';
    else if (catLower.includes('all')) playingRole = 'ALL_ROUNDER';
    else if (catLower.includes('keeper') || catLower.includes('wk')) playingRole = 'WICKET_KEEPER';

    const playerTx = db.transaction(() => {
      // 1. Create global player
      const playerId = 'ply_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

      db.prepare(`
        INSERT INTO players (id, full_name, photo, mobile, email, playing_role, batting_style, bowling_style, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Right Hand Bat', 'Right Arm Medium', ?)
      `).run(playerId, fullName, photo || '', mobile || '', cleanEmail, playingRole, now);

      // 2. Also create user account record for this player
      db.prepare(`
        INSERT INTO users (id, name, email, mobile, password, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'PLAYER', 'ACTIVE', ?)
      `).run('usr_' + playerId, fullName, cleanEmail, mobile || '', password || 'admin123', now);

      // 3. Register for Auction with PENDING status (Requires Super Admin Review & Approval)
      let targetAuction = db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any;
      const targetAuctionId = (auctionId && db.prepare('SELECT id FROM auctions WHERE id = ?').get(auctionId)) ? auctionId : targetAuction?.id || null;

      let categoryId = null;
      let assignedBasePrice = Number(basePrice) || 500;

      if (targetAuctionId) {
        const config = db.prepare('SELECT default_base_price FROM auction_configs WHERE auction_id = ?').get(targetAuctionId) as any;
        assignedBasePrice = Number(basePrice) || config?.default_base_price || 500;

        const catRecord = db.prepare('SELECT id FROM player_categories WHERE auction_id = ? AND LOWER(name) LIKE ?').get(targetAuctionId, `%${catLower}%`) as any;
        categoryId = catRecord?.id || null;

        db.prepare(`
          INSERT INTO player_registrations (id, player_id, auction_id, category_id, base_price, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
        `).run('reg_' + playerId, playerId, targetAuctionId, categoryId, assignedBasePrice, now);
      }

      return { playerId, auctionId: targetAuctionId, assignedBasePrice };
    });

    const result = playerTx();
    const playerRecord = db.prepare('SELECT * FROM players WHERE id = ?').get(result.playerId);

    res.status(201).json({
      success: true,
      message: 'Player registered successfully! Awaiting Super Admin approval to enter the live auction pool.',
      player: playerRecord,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Public Captain Registration (REQUIRES ADMIN CONFIRMATION)
router.post('/register-captain', (req, res) => {
  try {
    const { name, email, mobile, password = 'password123', teamName, teamLogo, auctionId, tournamentId } = req.body;

    if (!name || !email || !teamName) {
      return res.status(400).json({ error: 'Name, email, and team name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // STRICT DUPLICATE EMAIL CHECK
    const existingCaptain = db.prepare('SELECT id, name FROM captains WHERE LOWER(email) = ?').get(cleanEmail);
    const existingUser = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingCaptain || existingUser) {
      return res.status(400).json({ 
        error: 'This email ID is already registered. Duplicate emails are not allowed.' 
      });
    }

    const now = new Date().toISOString();

    const captainTx = db.transaction(() => {
      // 1. Get target tournament and auction if they exist
      const activeTour = tournamentId ? db.prepare('SELECT id FROM tournaments WHERE id = ?').get(tournamentId) as any : null;
      const targetTour = activeTour?.id || (db.prepare('SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1').get() as any)?.id || null;

      const activeAuc = auctionId ? db.prepare('SELECT id FROM auctions WHERE id = ?').get(auctionId) as any : null;
      const targetAuc = activeAuc?.id || (db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any)?.id || null;

      // 2. Find or create team
      let team = db.prepare('SELECT * FROM teams WHERE LOWER(name) = ?').get(teamName.trim().toLowerCase()) as any;
      let teamId = team ? team.id : 'tm_' + Date.now();

      if (!team) {
        db.prepare(`
          INSERT INTO teams (id, tournament_id, auction_id, name, short_name, logo, color, initial_purse, spent_purse, remaining_purse, created_at)
          VALUES (?, ?, ?, ?, ?, ?, '#2563EB', 20000, 0, 20000, ?)
        `).run(teamId, targetTour, targetAuc, teamName, teamName.substring(0, 3).toUpperCase(), teamLogo || '', now);
      } else if (!team.tournament_id && targetTour) {
        db.prepare('UPDATE teams SET tournament_id = ?, auction_id = COALESCE(auction_id, ?) WHERE id = ?').run(targetTour, targetAuc, team.id);
      }

      // 3. Create or update user with guaranteed correct ID
      let user = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
      let userId = user ? user.id : 'usr_' + Date.now();

      if (user) {
        db.prepare(`
          UPDATE users 
          SET name = ?, mobile = ?, password = ?, role = 'CAPTAIN', team_id = ?, status = 'ACTIVE'
          WHERE id = ?
        `).run(name, mobile || '', password, teamId, userId);
      } else {
        db.prepare(`
          INSERT INTO users (id, name, email, mobile, password, role, team_id, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'CAPTAIN', ?, 'ACTIVE', ?)
        `).run(userId, name, cleanEmail, mobile || '', password, teamId, now);
      }

      // 4. Create captain entry marked PENDING approval
      const capId = 'cap_' + Date.now();
      db.prepare(`
        INSERT INTO captains (id, user_id, team_id, auction_id, name, mobile, email, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `).run(capId, userId, teamId, targetAuc, name, mobile || '', cleanEmail, now);

      // Log in audit trail
      if (targetAuc) {
        db.prepare(`
          INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
          VALUES (?, ?, ?, ?, 'CAPTAIN_REQUEST_SUBMITTED', ?, ?)
        `).run('aud_' + Date.now(), targetAuc, userId, name, `New captain registration submitted for ${teamName}. Awaiting Super Admin confirmation.`, now);
      }

      return { captainId: capId, teamId, userId };
    });

    const result = captainTx();
    res.status(201).json({
      success: true,
      message: 'Captain registration submitted successfully. Super Admin confirmation is required before you can access team bidding.',
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Super Admin Assigns Player as Captain (Super Admin Decision)
router.post('/assign-captain', (req, res) => {
  try {
    const { teamId, playerId, captainName, email, mobile, auctionId } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required.' });
    }

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
    if (!team) return res.status(404).json({ error: 'Team not found' });

    let player: any = null;
    if (playerId) {
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
    }
    if (!player && email) {
      player = db.prepare('SELECT * FROM players WHERE LOWER(email) = ?').get(email.trim().toLowerCase()) as any;
    }
    if (!player && mobile) {
      player = db.prepare('SELECT * FROM players WHERE mobile = ?').get(mobile.trim()) as any;
    }
    if (!player && captainName) {
      player = db.prepare('SELECT * FROM players WHERE LOWER(full_name) = ?').get(captainName.trim().toLowerCase()) as any;
    }

    const assignedName = captainName || player?.full_name || 'Team Captain';
    const assignedEmail = email || player?.email || `${team.short_name.toLowerCase()}@team.com`;
    const assignedMobile = mobile || player?.mobile || '';
    const now = new Date().toISOString();
    const targetAuc = auctionId || team.auction_id || (db.prepare('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1').get() as any)?.id || null;

    const assignTx = db.transaction(() => {
      // Find or create user
      let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(assignedEmail.toLowerCase()) as any;
      const userId = user ? user.id : 'usr_' + Date.now();
      if (!user) {
        db.prepare(`
          INSERT INTO users (id, name, email, mobile, password, role, team_id, status, created_at)
          VALUES (?, ?, ?, ?, 'admin123', 'CAPTAIN', ?, 'ACTIVE', ?)
        `).run(userId, assignedName, assignedEmail, assignedMobile, teamId, now);
      } else {
        db.prepare("UPDATE users SET role = 'CAPTAIN', team_id = ? WHERE id = ?").run(teamId, user.id);
      }

      // Check existing captain for this team or create new
      const capId = 'cap_' + Date.now();
      db.prepare(`
        INSERT INTO captains (id, user_id, team_id, auction_id, name, mobile, email, status, player_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?)
      `).run(capId, userId, teamId, targetAuc, assignedName, assignedMobile, assignedEmail, player?.id || null, now);

      db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(capId, teamId);

      // CRITICAL: If a registered player is assigned as captain, remove them from auction pool and add to squad
      if (player) {
        db.prepare('DELETE FROM auction_players WHERE player_id = ?').run(player.id);

        const squadId = 'sq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const tourId = team.tournament_id || 'tour_ppl_2026';
        const aucId = targetAuc || 'auc_default';
        db.prepare(`
          INSERT OR REPLACE INTO team_squads (id, tournament_id, auction_id, team_id, player_id, acquisition_type, price, joined_at)
          VALUES (?, ?, ?, ?, ?, 'RETENTION', 0, ?)
        `).run(squadId, tourId, aucId, team.id, player.id, now);
      }

      // Audit log
      if (targetAuc) {
        db.prepare(`
          INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
          VALUES (?, ?, 'usr_admin', 'Super Admin', 'CAPTAIN_ASSIGNED', ?, ?)
        `).run('aud_' + Date.now(), targetAuc, `Super Admin assigned ${assignedName} as Captain of ${team.name}.`, now);
      }

      return { captainId: capId, teamId, assignedName };
    });

    const result = assignTx();
    res.json({
      success: true,
      message: `Super Admin confirmed: ${result.assignedName} is now the Captain of ${team.name}!`,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH Super Admin Confirms or Rejects Captain (Confirmation Flow)
router.patch('/captains/:id/status', (req, res) => {
  try {
    const { status } = req.body; // 'APPROVED' | 'REJECTED'
    const cap = db.prepare('SELECT * FROM captains WHERE id = ?').get(req.params.id) as any;
    if (!cap) return res.status(404).json({ error: 'Captain record not found' });

    const now = new Date().toISOString();

    const confirmTx = db.transaction(() => {
      db.prepare('UPDATE captains SET status = ? WHERE id = ?').run(status, req.params.id);

      if (status === 'APPROVED') {
        db.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(cap.id, cap.team_id);
        db.prepare("UPDATE users SET role = 'CAPTAIN', team_id = ?, status = 'ACTIVE' WHERE id = ? OR LOWER(email) = ?")
          .run(cap.team_id, cap.user_id || '', cap.email.toLowerCase());
      } else if (status === 'REJECTED') {
        db.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ? OR LOWER(email) = ?")
          .run(cap.user_id || '', cap.email.toLowerCase());
        db.prepare('UPDATE teams SET captain_id = NULL WHERE captain_id = ?').run(cap.id);
      }

      if (cap.auction_id) {
        db.prepare(`
          INSERT INTO audit_logs (id, auction_id, user_id, user_name, action, details, timestamp)
          VALUES (?, ?, 'usr_admin', 'Super Admin', 'CAPTAIN_CONFIRMED', ?, ?)
        `).run('aud_' + Date.now(), cap.auction_id, `Super Admin ${status} captain request for ${cap.name} (${cap.team_id}).`, now);
      }
    });

    confirmTx();

    res.json({ success: true, message: `Captain has been ${status} by Super Admin.`, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Captain directly
router.delete('/captains/:id', (req, res) => {
  try {
    const cap = db.prepare('SELECT * FROM captains WHERE id = ?').get(req.params.id) as any;
    if (!cap) return res.status(404).json({ error: 'Captain record not found' });

    const deleteTx = db.transaction(() => {
      db.prepare('UPDATE teams SET captain_id = NULL WHERE captain_id = ? OR id = ?').run(cap.id, cap.team_id || '');
      if (cap.email) {
        db.prepare("DELETE FROM users WHERE LOWER(email) = ? AND role = 'CAPTAIN'").run(cap.email.toLowerCase());
      }
      db.prepare('DELETE FROM captains WHERE id = ?').run(cap.id);
    });

    deleteTx();
    res.json({ success: true, message: `Captain "${cap.name}" deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
