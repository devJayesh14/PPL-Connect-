import { db, initDatabase } from './index.js';

export function resetDatabase() {
  initDatabase();
  console.log('[RESET] Clearing all initial/dummy data. Retaining ONLY Super Admin account...');

  // Clear all data tables completely
  db.prepare('DELETE FROM audit_logs').run();
  db.prepare('DELETE FROM purse_transactions').run();
  db.prepare('DELETE FROM team_squads').run();
  db.prepare('DELETE FROM auction_results').run();
  db.prepare('DELETE FROM bids').run();
  db.prepare('DELETE FROM auction_players').run();
  db.prepare('DELETE FROM team_retentions').run();
  db.prepare('DELETE FROM player_registrations').run();
  db.prepare('DELETE FROM players').run();
  db.prepare('DELETE FROM captains').run();
  db.prepare('DELETE FROM teams').run();
  db.prepare('DELETE FROM player_categories').run();
  db.prepare('DELETE FROM auction_configs').run();
  db.prepare('DELETE FROM auctions').run();
  db.prepare('DELETE FROM tournaments').run();
  db.prepare('DELETE FROM users').run();

  const now = new Date().toISOString();

  // 1. Super Admin User (admin@pplconnect.com / admin123)
  db.prepare(`
    INSERT INTO users (id, name, email, mobile, password, role, status, created_at)
    VALUES ('usr_admin', 'Super Admin', 'admin@pplconnect.com', '+91 98765 43210', 'admin123', 'ADMIN', 'ACTIVE', ?)
  `).run(now);

  // 2. Official PPL Championship Tournament
  db.prepare(`
    INSERT INTO tournaments (id, name, description, sport, status, start_date, end_date, location, logo, banner, created_at, updated_at)
    VALUES ('tour_ppl_2026', 'Priyanka Premiere League (PPL)', 'Official PPL Championship Tournament', 'CRICKET', 'UPCOMING', '2026-12-10', '2026-12-25', 'Surat, Gujarat', '/logo.png', '', ?, ?)
  `).run(now, now);

  // 3. Official PPL Grand Auction
  db.prepare(`
    INSERT INTO auctions (id, tournament_id, name, description, auction_date, start_time, end_time, timezone, status, logo, banner, share_link, created_at, updated_at)
    VALUES ('auc_default', 'tour_ppl_2026', 'PPL Grand Auction 2026', 'Official Player Auction for Priyanka Premiere League', '2026-12-10', '10:00 AM', '06:00 PM', 'IST (+05:30)', 'REGISTRATION_OPEN', '/logo.png', '', '/auction/ppl-2026', ?, ?)
  `).run(now, now);

  // 4. Auction Config: 20,000 purse, 500 base price, 1 retention (0 points deducted)
  db.prepare(`
    INSERT INTO auction_configs (
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

  // 5. Player Categories (Base price 500 each)
  const categories = [
    { id: 'cat_batsman', name: 'Batsman', desc: 'Top & Middle Order Batsmen' },
    { id: 'cat_bowler', name: 'Bowler', desc: 'Fast Bowlers & Spinners' },
    { id: 'cat_allrounder', name: 'All-Rounder', desc: 'Batting & Bowling All-Rounders' },
    { id: 'cat_keeper', name: 'Wicket Keeper', desc: 'Wicket Keeper Batsmen' },
  ];

  for (const cat of categories) {
    db.prepare(`
      INSERT INTO player_categories (id, auction_id, name, base_price, min_players, max_players, description)
      VALUES (?, 'auc_default', ?, 500, 0, 15, ?)
    `).run(cat.id, cat.name, cat.desc);
  }

  console.log('[RESET] Clean database established with Super Admin login (admin@pplconnect.com / admin123) and official PPL 2026 auction (20,000 purse, 500 base price, 1 retention limit). ZERO dummy players/teams.');
}

export function seedDatabase() {
  const existingUser = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'").get() as any;
  if (!existingUser || existingUser.count === 0) {
    resetDatabase();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  resetDatabase();
}
