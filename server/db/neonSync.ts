import { neon } from '@neondatabase/serverless';
import { reloadDatabase, getDatabaseBuffer } from './index.js';

let isSyncing = false;
let pendingSync = false;
let lastSyncedAt: string | null = null;
let lastCheckTime = 0;

function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

let tableEnsured = false;
async function ensureTable(sql: any) {
  if (tableEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ppl_db_storage (
        id VARCHAR(50) PRIMARY KEY,
        data BYTEA NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    tableEnsured = true;
  } catch (e) {
    console.error('[NEON SYNC] Error creating table:', e);
  }
}

/**
 * Downloads latest central DB snapshot from Neon Postgres and reloads database safely.
 */
export async function pullDatabaseFromNeon(force = false): Promise<boolean> {
  const url = getDatabaseUrl();
  if (!url) return false;

  try {
    const now = Date.now();
    // Debounce checks within 3 seconds to keep responses fast
    if (!force && now - lastCheckTime < 3000) {
      return false;
    }
    lastCheckTime = now;

    const sql = neon(url);
    await ensureTable(sql);

    const rows = await sql`SELECT ENCODE(data, 'base64') as b64, updated_at FROM ppl_db_storage WHERE id = 'central_db'`;
    if (rows && rows.length > 0 && rows[0].b64) {
      const updatedAtStr = String(rows[0].updated_at);
      if (!force && lastSyncedAt && lastSyncedAt === updatedAtStr) {
        return false;
      }

      const dataBuf = Buffer.from(rows[0].b64, 'base64');
      if (dataBuf.length > 1000) {
        const reloaded = reloadDatabase(dataBuf);
        if (reloaded) {
          lastSyncedAt = updatedAtStr;
          console.log(`[NEON SYNC] Successfully synced database snapshot (${(dataBuf.length / 1024).toFixed(1)} KB) [${updatedAtStr}]`);
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    console.error('[NEON SYNC] Error pulling database from Neon:', err);
    return false;
  }
}

/**
 * Serializes active SQLite database and uploads snapshot into central Neon Postgres.
 */
export async function pushDatabaseToNeon(): Promise<boolean> {
  const url = getDatabaseUrl();
  if (!url) return false;

  if (isSyncing) {
    pendingSync = true;
    return false;
  }

  isSyncing = true;
  try {
    const fileBuf = getDatabaseBuffer();
    if (!fileBuf || fileBuf.length < 1000) {
      isSyncing = false;
      return false;
    }

    const sql = neon(url);
    await ensureTable(sql);

    const b64 = fileBuf.toString('base64');
    await sql`
      INSERT INTO ppl_db_storage (id, data, updated_at)
      VALUES ('central_db', DECODE(${b64}, 'base64'), NOW())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `;

    console.log(`[NEON SYNC] Successfully synced local database (${(fileBuf.length / 1024).toFixed(1)} KB) to central Neon Postgres`);
    isSyncing = false;

    if (pendingSync) {
      pendingSync = false;
      pushDatabaseToNeon();
    }
    return true;
  } catch (err) {
    console.error('[NEON SYNC] Error pushing database to Neon:', err);
    isSyncing = false;
    return false;
  }
}
