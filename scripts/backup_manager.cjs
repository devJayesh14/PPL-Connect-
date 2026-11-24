const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

// Load environment variables for Neon integration if present
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const backupsDir = path.join(dataDir, 'backups');
const liveDbPath = path.join(dataDir, 'ppl_auction.sqlite');
const masterJsonPath = path.join(backupsDir, 'master_dump_latest.json');
const playersCatalogJsonPath = path.join(backupsDir, 'players_catalog.json');
const teamsSquadsJsonPath = path.join(backupsDir, 'teams_and_squads.json');
const latestSqliteBackup = path.join(backupsDir, 'ppl_backup_latest.sqlite');

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function getDbConnection(filePath = liveDbPath, readonly = false) {
  return new Database(filePath, { readonly });
}

/**
 * 1. BACKUP: Exports current SQLite DB into timestamped SQLite and Master JSON dumps
 */
function createBackup() {
  console.log('--- CREATING COMPLETE DATA BACKUP ---');
  if (!fs.existsSync(liveDbPath)) {
    console.error('Error: Active database file not found at:', liveDbPath);
    process.exit(1);
  }

  const db = getDbConnection(liveDbPath, true);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((t) => t.name);

  const dump = {
    exportedAt: new Date().toISOString(),
    sourceFile: liveDbPath,
    tableCounts: {},
    tables: {},
  };

  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM "${t}"`).all();
      dump.tableCounts[t] = rows.length;
      dump.tables[t] = rows;
    } catch (err) {
      console.warn(`Could not read table ${t}:`, err.message);
    }
  }

  // 1. Write Master JSON dump
  fs.writeFileSync(masterJsonPath, JSON.stringify(dump, null, 2));
  console.log(`[OK] Master JSON dump written to: ${masterJsonPath} (${(fs.statSync(masterJsonPath).size / 1024).toFixed(1)} KB)`);

  // 2. Write clean players catalog JSON (easy to inspect & track in Git)
  if (dump.tables['players']) {
    const cleanPlayers = dump.tables['players'].map((p, idx) => ({
      index: idx + 1,
      id: p.id,
      full_name: p.full_name,
      mobile: p.mobile,
      email: p.email,
      playing_role: p.playing_role,
      batting_style: p.batting_style,
      bowling_style: p.bowling_style,
      is_overseas: p.is_overseas === 1 ? 'Yes' : 'No',
      status: p.status,
      created_at: p.created_at,
      has_photo: !!(p.photo && p.photo.length > 50),
    }));
    fs.writeFileSync(playersCatalogJsonPath, JSON.stringify(cleanPlayers, null, 2));
    console.log(`[OK] Players catalog written to: ${playersCatalogJsonPath} (${cleanPlayers.length} players)`);
  }

  // 3. Write teams and squads summary JSON
  if (dump.tables['teams']) {
    const teamsSummary = dump.tables['teams'].map((team) => {
      const squad = (dump.tables['team_squads'] || [])
        .filter((s) => s.team_id === team.id)
        .map((s) => {
          const player = (dump.tables['players'] || []).find((p) => p.id === s.player_id);
          return {
            player_id: s.player_id,
            name: player ? player.full_name : s.player_id,
            acquisition_type: s.acquisition_type,
            price: s.price,
            joined_at: s.joined_at,
          };
        });
      return {
        ...team,
        squad_count: squad.length,
        squad,
      };
    });
    fs.writeFileSync(teamsSquadsJsonPath, JSON.stringify(teamsSummary, null, 2));
    console.log(`[OK] Teams and squads written to: ${teamsSquadsJsonPath}`);
  }

  // 4. Copy timestamped SQLite and latest SQLite backup
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const timestampedBackup = path.join(backupsDir, `ppl_backup_${ts}.sqlite`);
  fs.copyFileSync(liveDbPath, timestampedBackup);
  fs.copyFileSync(liveDbPath, latestSqliteBackup);
  console.log(`[OK] SQLite binary backup created at: ${latestSqliteBackup}`);
  console.log(`[OK] Timestamped backup preserved: ${timestampedBackup}`);

  console.log('\nBackup Summary Table Counts:');
  console.table(dump.tableCounts);
  db.close();

  // 5. Try syncing to Neon if network/database url is available
  trySyncToNeon();
}

/**
 * 2. RESTORE: Recovers entire database from Master JSON dump or an existing SQLite file
 */
function restoreBackup(sourcePath) {
  const chosenPath = sourcePath || masterJsonPath;
  console.log(`--- RESTORING DATA FROM: ${chosenPath} ---`);

  if (!fs.existsSync(chosenPath)) {
    console.error(`Error: Source file does not exist: ${chosenPath}`);
    process.exit(1);
  }

  if (chosenPath.endsWith('.sqlite')) {
    // Direct SQLite file replacement
    console.log('Restoring from SQLite file...');
    fs.copyFileSync(chosenPath, liveDbPath);
    const db = getDbConnection(liveDbPath, true);
    const check = db.pragma('integrity_check');
    console.log('Database integrity check:', check);
    db.close();
    console.log('[SUCCESS] Database restored from SQLite binary file.');
    trySyncToNeon();
    return;
  }

  // Restoring from Master JSON Dump
  console.log('Restoring from Master JSON Dump...');
  const jsonContent = JSON.parse(fs.readFileSync(chosenPath, 'utf8'));
  const tables = jsonContent.tables;
  if (!tables) {
    console.error('Invalid master JSON dump: "tables" object missing.');
    process.exit(1);
  }

  // Ensure active connection is clean
  if (fs.existsSync(liveDbPath)) {
    try { fs.unlinkSync(liveDbPath + '-wal'); } catch (e) {}
    try { fs.unlinkSync(liveDbPath + '-shm'); } catch (e) {}
  }

  const db = new Database(liveDbPath);
  db.pragma('journal_mode = DELETE');
  db.pragma('foreign_keys = OFF'); // Temporarily off during batch table reconstruction

  // Read schema
  const schemaPath = path.join(projectRoot, 'server/db/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Insert data table by table
  const restoredCounts = {};
  const restoreTx = db.transaction(() => {
    for (const [tableName, rows] of Object.entries(tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      db.prepare(`DELETE FROM "${tableName}"`).run();
      const firstRow = rows[0];
      const cols = Object.keys(firstRow);
      const placeholders = cols.map(() => '?').join(', ');
      const insertSql = `INSERT OR REPLACE INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
      const stmt = db.prepare(insertSql);

      for (const row of rows) {
        const values = cols.map((col) => row[col]);
        stmt.run(...values);
      }
      restoredCounts[tableName] = rows.length;
    }
  });

  restoreTx();
  db.pragma('foreign_keys = ON');

  const check = db.pragma('integrity_check');
  console.log('Integrity check after restore:', check);
  db.close();

  console.log('[SUCCESS] Database completely reconstructed from JSON dump!');
  console.table(restoredCounts);

  trySyncToNeon();
}

/**
 * 3. STATUS: Quick audit of current active database vs latest backups
 */
function showStatus() {
  console.log('=== DATABASE STATUS & BACKUPS AUDIT ===');
  console.log('Active DB Path:', liveDbPath, fs.existsSync(liveDbPath) ? `(Size: ${(fs.statSync(liveDbPath).size / 1024).toFixed(1)} KB)` : 'MISSING!');
  console.log('Latest JSON Dump:', masterJsonPath, fs.existsSync(masterJsonPath) ? `(Size: ${(fs.statSync(masterJsonPath).size / 1024).toFixed(1)} KB)` : 'None');
  console.log('Latest SQLite Backup:', latestSqliteBackup, fs.existsSync(latestSqliteBackup) ? `(Size: ${(fs.statSync(latestSqliteBackup).size / 1024).toFixed(1)} KB)` : 'None');

  if (fs.existsSync(liveDbPath)) {
    const db = getDbConnection(liveDbPath, true);
    const tables = ['tournaments', 'auctions', 'teams', 'captains', 'team_retentions', 'team_squads', 'players', 'auction_players', 'users'];
    const counts = {};
    for (const t of tables) {
      try {
        counts[t] = db.prepare(`SELECT count(*) as c FROM "${t}"`).get().c;
      } catch (e) {
        counts[t] = 'Error: ' + e.message;
      }
    }
    console.table(counts);
    db.close();
  }
}

/**
 * Helper: Uploads current DB buffer to Neon Postgres if network allows
 */
async function trySyncToNeon() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return;

  try {
    const { neon } = require('@neondatabase/serverless');
    const buf = fs.readFileSync(liveDbPath);
    if (!buf || buf.length < 1000) return;

    const sql = neon(url);
    await sql`
      CREATE TABLE IF NOT EXISTS ppl_db_storage (
        id VARCHAR(50) PRIMARY KEY,
        data BYTEA NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    const b64 = buf.toString('base64');
    await sql`
      INSERT INTO ppl_db_storage (id, data, updated_at)
      VALUES ('central_db', DECODE(${b64}, 'base64'), NOW())
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `;
    console.log(`[OK] Cloud sync verified: Pushed snapshot (${(buf.length / 1024).toFixed(1)} KB) to central Neon Postgres.`);
  } catch (err) {
    // Non-fatal if offline or sandboxed
    console.log('[NOTE] Cloud sync skipped or offline:', err.message);
  }
}

// CLI Dispatcher
const command = process.argv[2] || 'status';
const targetArg = process.argv[3];

if (command === 'backup') {
  createBackup();
} else if (command === 'restore') {
  restoreBackup(targetArg);
} else if (command === 'status') {
  showStatus();
} else {
  console.log(`
Usage:
  node scripts/backup_manager.cjs status             # View current DB counts & backups
  node scripts/backup_manager.cjs backup             # Create full JSON + SQLite backup
  node scripts/backup_manager.cjs restore            # Restore DB from master_dump_latest.json
  node scripts/backup_manager.cjs restore <filepath> # Restore from specific .sqlite or .json
`);
}
