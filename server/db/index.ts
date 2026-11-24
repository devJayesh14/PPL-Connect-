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

  console.log('[DB] Database initialized successfully at:', dbPath);
}

export default db;
