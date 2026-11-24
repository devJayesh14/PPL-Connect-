import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { schemaSql } from './schemaSql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory (uses /tmp on Vercel serverless environment)
const dataDir = process.env.VERCEL
  ? '/tmp'
  : path.resolve(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const dbPath = path.join(dataDir, 'ppl_auction.sqlite');

// Clean up stale WAL / SHM files if any exist
function cleanStaleJournalFiles() {
  try { if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal'); } catch (e) {}
  try { if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm'); } catch (e) {}
}

cleanStaleJournalFiles();

// Restore bundled database to /tmp on Vercel cold starts if present and not yet created
if (process.env.VERCEL && !fs.existsSync(dbPath)) {
  try {
    const bundledDb = path.resolve(__dirname, '../../data/ppl_auction.sqlite');
    if (fs.existsSync(bundledDb)) {
      fs.copyFileSync(bundledDb, dbPath);
      console.log('[DB] Restored bundled database to /tmp/ppl_auction.sqlite');
    }
  } catch (e) {
    console.error('[DB] Could not copy bundled DB:', e);
  }
}

function createDatabaseConnection(): Database.Database {
  cleanStaleJournalFiles();
  let conn: Database.Database;
  try {
    conn = new Database(dbPath);
    const check = conn.pragma('integrity_check') as any;
    if (!check || check[0]?.integrity_check !== 'ok') {
      console.warn('[DB] Integrity check failed on open. Removing malformed database and re-creating...');
      try { conn.close(); } catch (e) {}
      cleanStaleJournalFiles();
      try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
      conn = new Database(dbPath);
    }
  } catch (err) {
    console.warn('[DB] Error opening database. Resetting corrupted file:', err);
    cleanStaleJournalFiles();
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    conn = new Database(dbPath);
  }
  conn.pragma('journal_mode = DELETE');
  conn.pragma('foreign_keys = ON');
  return conn;
}

// Active database instance
let activeDb = createDatabaseConnection();

/**
 * Reloads database cleanly by closing the current connection,
 * verifying the snapshot integrity on a temporary file,
 * atomically replacing the file, and reopening the connection.
 * This completely avoids file descriptor conflicts and "disk image is malformed" errors.
 */
export function reloadDatabase(dataBuf?: Buffer): boolean {
  try {
    if (dataBuf && Buffer.isBuffer(dataBuf) && dataBuf.length > 1000) {
      const tmpPath = `${dbPath}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}.tmp`;
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(tmpPath, dataBuf);

      try {
        const testDb = new Database(tmpPath);
        const check = testDb.pragma('integrity_check') as any;
        testDb.close();
        if (!check || check[0]?.integrity_check !== 'ok') {
          console.error('[DB] Snapshot buffer failed integrity check. Aborting reload.');
          try { fs.unlinkSync(tmpPath); } catch (e) {}
          return false;
        }
      } catch (checkErr) {
        console.error('[DB] Error validating snapshot integrity:', checkErr);
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        return false;
      }

      // Snapshot is verified valid! Safely close active connection and atomically rename
      if (activeDb) {
        try { activeDb.close(); } catch (e) {}
      }
      cleanStaleJournalFiles();
      fs.renameSync(tmpPath, dbPath);
    } else if (activeDb) {
      try { activeDb.close(); } catch (e) {}
      cleanStaleJournalFiles();
    }

    activeDb = createDatabaseConnection();
    console.log('[DB] Database reloaded and verified cleanly at:', dbPath);
    return true;
  } catch (err) {
    console.error('[DB] Error reloading database:', err);
    return false;
  }
}

/**
 * Serializes the active database state directly from memory to a consistent binary buffer.
 */
export function getDatabaseBuffer(): Buffer {
  return activeDb.serialize();
}

/**
 * Transparent proxy around activeDb so all callers using `import { db } from ...`
 * dynamically execute against whichever instance is currently active.
 */
export const db: any = new Proxy({}, {
  get(_target, prop) {
    const val = (activeDb as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activeDb);
    }
    return val;
  },
  set(_target, prop, value) {
    (activeDb as any)[prop] = value;
    return true;
  },
});

// Initialize schema
export function initDatabase() {
  try {
    activeDb.exec(schemaSql);
  } catch (err) {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        activeDb.exec(schema);
      }
    } catch (e) {
      console.error('Failed to load schema:', e);
    }
  }

  // Safe migration check for password column in users
  try {
    const tableInfo = activeDb.prepare("PRAGMA table_info(users)").all() as any[];
    const hasPassword = tableInfo.some((c) => c.name === 'password');
    if (!hasPassword) {
      activeDb.prepare("ALTER TABLE users ADD COLUMN password TEXT DEFAULT 'admin123'").run();
    }
  } catch (e) {
    // Column already exists or table freshly created
  }

  // Safe migration check for status column in players
  try {
    const playerCols = activeDb.prepare("PRAGMA table_info(players)").all() as any[];
    const hasStatus = playerCols.some((c) => c.name === 'status');
    if (!hasStatus) {
      activeDb.prepare("ALTER TABLE players ADD COLUMN status TEXT DEFAULT 'PENDING'").run();
    }
  } catch (e) {
    // Column already exists
  }

  // Safe migration check for retention confirmation in team_retentions
  try {
    const retCols = activeDb.prepare("PRAGMA table_info(team_retentions)").all() as any[];
    if (!retCols.some((c) => c.name === 'status')) {
      activeDb.prepare("ALTER TABLE team_retentions ADD COLUMN status TEXT DEFAULT 'PENDING_CONFIRMATION'").run();
    }
    if (!retCols.some((c) => c.name === 'confirmation_token')) {
      activeDb.prepare("ALTER TABLE team_retentions ADD COLUMN confirmation_token TEXT").run();
    }
    if (!retCols.some((c) => c.name === 'confirmed_at')) {
      activeDb.prepare("ALTER TABLE team_retentions ADD COLUMN confirmed_at TEXT").run();
    }
  } catch (e) {
    // Columns already exist
  }

  // Auto-repair team and captain linkages, auctions, and prune retained players from pool
  try {
    const nowTime = new Date().toISOString();

    // 1. Ensure default tournament and auction exist
    const defaultTour = activeDb.prepare('SELECT id FROM tournaments WHERE id = ?').get('tour_ppl_2026');
    if (!defaultTour) {
      activeDb.prepare(`
        INSERT OR IGNORE INTO tournaments (id, name, description, sport, status, start_date, end_date, location, logo, banner, created_at, updated_at)
        VALUES ('tour_ppl_2026', 'Priyanka Premiere League (PPL)', 'Official PPL Championship Tournament', 'CRICKET', 'UPCOMING', '2026-12-10', '2026-12-25', 'Surat, Gujarat', '/logo.png', '', ?, ?)
      `).run(nowTime, nowTime);
    }

    const defaultAuc = activeDb.prepare('SELECT id FROM auctions WHERE id = ?').get('auc_default');
    if (!defaultAuc) {
      activeDb.prepare(`
        INSERT OR IGNORE INTO auctions (id, tournament_id, name, description, auction_date, start_time, end_time, timezone, status, logo, banner, share_link, created_at, updated_at)
        VALUES ('auc_default', 'tour_ppl_2026', 'PPL Grand Auction 2026', 'Official Player Auction for Priyanka Premiere League', '2026-12-10', '10:00 AM', '06:00 PM', 'IST (+05:30)', 'REGISTRATION_OPEN', '/logo.png', '', '/auction/ppl-2026', ?, ?)
      `).run(nowTime, nowTime);

      activeDb.prepare(`
        INSERT OR IGNORE INTO auction_configs (
          id, auction_id, total_purse_per_team, starting_purse, allow_different_purse_per_team,
          allow_purse_adjustment, allow_admin_manual_purse_adjustment, min_base_price,
          default_base_price, max_base_price, allow_individual_base_price, bid_increment,
          min_players_per_team, max_players_per_team, min_overseas_players, max_overseas_players,
          enable_retention, min_retentions, max_retentions, retention_uses_purse,
          retention_price_model, retention_price_config, bid_timer_seconds, auto_extension,
          registration_open
        ) VALUES (
          'cfg_auc_default', 'auc_default', 20000, 20000, 0,
          1, 1, 100,
          500, 50000, 1, 100,
          11, 15, 0, 4,
          1, 0, 1, 0,
          'FIXED', '[0]', 30, 1,
          1
        )
      `).run();
    }

    // 2. Link all unlinked teams to tour_ppl_2026 and auc_default
    activeDb.prepare(`
      UPDATE teams 
      SET tournament_id = COALESCE(tournament_id, 'tour_ppl_2026'),
          auction_id = COALESCE(auction_id, 'auc_default')
      WHERE tournament_id IS NULL OR auction_id IS NULL OR tournament_id = '' OR auction_id = ''
    `).run();

    // 3. Captain migrations & Auto-link captains
    const capCols = activeDb.prepare("PRAGMA table_info(captains)").all() as any[];
    if (!capCols.some((c) => c.name === 'player_id')) {
      activeDb.prepare("ALTER TABLE captains ADD COLUMN player_id TEXT").run();
    }

    // Link captains to matching players if player_id is not yet populated
    activeDb.prepare(`
      UPDATE captains
      SET player_id = (
        SELECT id FROM players
        WHERE LOWER(players.email) = LOWER(captains.email)
           OR (players.mobile != '' AND players.mobile = captains.mobile)
           OR LOWER(players.full_name) = LOWER(captains.name)
        LIMIT 1
      )
      WHERE player_id IS NULL
    `).run();

    // Auto-create captain rows for any users with role='CAPTAIN' missing from captains table
    const unlinkedCapUsers = activeDb.prepare(`
      SELECT u.* FROM users u 
      WHERE u.role = 'CAPTAIN' 
        AND NOT EXISTS (SELECT 1 FROM captains c WHERE LOWER(c.email) = LOWER(u.email) OR c.user_id = u.id)
    `).all() as any[];

    for (const u of unlinkedCapUsers) {
      const capId = 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      let teamId = u.team_id;
      if (!teamId) {
        const anyTeam = activeDb.prepare('SELECT id FROM teams WHERE captain_id IS NULL LIMIT 1').get() as any;
        teamId = anyTeam?.id || null;
      }
      if (teamId) {
        activeDb.prepare(`
          INSERT INTO captains (id, user_id, team_id, auction_id, name, mobile, email, status, created_at)
          VALUES (?, ?, ?, 'auc_default', ?, ?, ?, 'APPROVED', ?)
        `).run(capId, u.id, teamId, u.name, u.mobile || '', u.email, nowTime);
        activeDb.prepare('UPDATE teams SET captain_id = ? WHERE id = ?').run(capId, teamId);
      }
    }

    activeDb.prepare(`
      UPDATE teams 
      SET captain_id = (SELECT id FROM captains WHERE team_id = teams.id LIMIT 1)
      WHERE captain_id IS NULL AND EXISTS (SELECT 1 FROM captains WHERE team_id = teams.id)
    `).run();

    activeDb.prepare(`
      UPDATE captains 
      SET status = 'APPROVED', auction_id = COALESCE(NULLIF(auction_id, ''), 'auc_default')
      WHERE status = 'PENDING' OR auction_id IS NULL OR auction_id = ''
    `).run();

    activeDb.prepare(`
      UPDATE users 
      SET status = 'ACTIVE' 
      WHERE role = 'CAPTAIN' AND (status = 'PENDING' OR status IS NULL)
    `).run();

    // 4. Remove retained, squad, and captain players from pending auction pool
    activeDb.prepare(`
      DELETE FROM auction_players 
      WHERE (
        player_id IN (SELECT player_id FROM team_retentions WHERE status != 'REJECTED')
        OR player_id IN (SELECT player_id FROM team_squads)
        OR player_id IN (
          SELECT p.id FROM players p
          JOIN captains c ON (
            c.player_id = p.id
            OR (c.email != '' AND LOWER(c.email) = LOWER(p.email))
            OR (c.mobile != '' AND c.mobile = p.mobile)
            OR LOWER(c.name) = LOWER(p.full_name)
          )
          WHERE c.status != 'REJECTED'
        )
      ) AND status = 'PENDING'
    `).run();
  } catch (e) {
    console.warn('[DB AUTO-REPAIR]', e);
  }

  console.log('[DB] Database initialized successfully at:', dbPath);
}

export default db;
