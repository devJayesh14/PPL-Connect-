-- PPL Connect: Sports Auction & Tournament Database Schema
-- All tables with foreign keys and indexes

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    mobile TEXT,
    password TEXT DEFAULT 'admin123',
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'CAPTAIN', 'PLAYER')),
    team_id TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sport TEXT DEFAULT 'CRICKET',
    status TEXT DEFAULT 'UPCOMING' CHECK(status IN ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    start_date TEXT,
    end_date TEXT,
    location TEXT,
    logo TEXT,
    banner TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auctions (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    auction_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    timezone TEXT DEFAULT 'IST (+05:30)',
    status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'RETENTION_OPEN', 'AUCTION_SCHEDULED', 'LIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    logo TEXT,
    banner TEXT,
    share_link TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auction_configs (
    id TEXT PRIMARY KEY,
    auction_id TEXT UNIQUE NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    total_purse_per_team REAL NOT NULL DEFAULT 20000,
    currency TEXT DEFAULT 'INR',
    currency_symbol TEXT DEFAULT '₹',
    allow_different_purse_per_team INTEGER DEFAULT 0,
    starting_purse REAL DEFAULT 20000,
    allow_purse_adjustment INTEGER DEFAULT 1,
    allow_admin_manual_purse_adjustment INTEGER DEFAULT 1,
    min_base_price REAL DEFAULT 100,
    default_base_price REAL DEFAULT 500,
    max_base_price REAL DEFAULT 50000,
    allow_individual_base_price INTEGER DEFAULT 1,
    bid_increment REAL DEFAULT 100,
    bid_increment_type TEXT DEFAULT 'FIXED' CHECK(bid_increment_type IN ('FIXED', 'PERCENTAGE')),
    min_players_per_team INTEGER DEFAULT 11,
    max_players_per_team INTEGER DEFAULT 15,
    min_overseas_players INTEGER DEFAULT 0,
    max_overseas_players INTEGER DEFAULT 4,
    enable_retention INTEGER DEFAULT 1,
    min_retentions INTEGER DEFAULT 0,
    max_retentions INTEGER DEFAULT 1,
    retention_uses_purse INTEGER DEFAULT 0,
    retention_price_model TEXT DEFAULT 'FIXED' CHECK(retention_price_model IN ('FLAT', 'TIERED', 'FIXED')),
    retention_price_config TEXT DEFAULT '[0]',
    bid_timer_seconds INTEGER DEFAULT 30,
    auto_extension INTEGER DEFAULT 1,
    extension_threshold_seconds INTEGER DEFAULT 5,
    extension_duration_seconds INTEGER DEFAULT 10,
    max_reauction_attempts INTEGER DEFAULT 2,
    registration_open INTEGER DEFAULT 1,
    registration_deadline TEXT
);

CREATE TABLE IF NOT EXISTS player_categories (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_price REAL,
    min_players INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 15,
    description TEXT
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
    auction_id TEXT REFERENCES auctions(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    logo TEXT,
    color TEXT DEFAULT '#2563EB',
    initial_purse REAL DEFAULT 20000,
    spent_purse REAL DEFAULT 0,
    remaining_purse REAL DEFAULT 20000,
    captain_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS captains (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    auction_id TEXT REFERENCES auctions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    player_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    photo TEXT,
    mobile TEXT,
    email TEXT,
    date_of_birth TEXT,
    age INTEGER,
    playing_role TEXT NOT NULL CHECK(playing_role IN ('BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER')),
    batting_style TEXT DEFAULT 'Right Hand Bat',
    bowling_style TEXT DEFAULT 'Right Arm Medium',
    is_overseas INTEGER DEFAULT 0,
    experience TEXT,
    previous_team TEXT,
    player_bio TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_registrations (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES player_categories(id) ON DELETE SET NULL,
    base_price REAL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
    remarks TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(player_id, auction_id)
);

CREATE TABLE IF NOT EXISTS team_retentions (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    retention_order INTEGER NOT NULL,
    retention_price REAL NOT NULL,
    approved_by_admin INTEGER DEFAULT 1,
    status TEXT DEFAULT 'PENDING_CONFIRMATION' CHECK(status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED')),
    confirmation_token TEXT,
    confirmed_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(auction_id, player_id)
);

CREATE TABLE IF NOT EXISTS auction_players (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES player_categories(id) ON DELETE SET NULL,
    base_price REAL NOT NULL,
    current_order INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_AUCTION', 'SOLD', 'UNSOLD', 'SKIPPED')),
    reauction_count INTEGER DEFAULT 0,
    final_bid REAL,
    winning_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    sold_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(auction_id, player_id)
);

CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    captain_id TEXT REFERENCES captains(id) ON DELETE SET NULL,
    bid_amount REAL NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auction_results (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    winning_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    final_bid REAL NOT NULL,
    bid_count INTEGER DEFAULT 1,
    timestamp TEXT NOT NULL,
    UNIQUE(auction_id, player_id)
);

CREATE TABLE IF NOT EXISTS team_squads (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    acquisition_type TEXT NOT NULL CHECK(acquisition_type IN ('RETENTION', 'AUCTION')),
    price REAL NOT NULL,
    joined_at TEXT NOT NULL,
    UNIQUE(tournament_id, player_id)
);

CREATE TABLE IF NOT EXISTS purse_transactions (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('INITIAL', 'RETENTION', 'BID_PURCHASE', 'ADMIN_ADJUSTMENT', 'REFUND')),
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    auction_id TEXT REFERENCES auctions(id) ON DELETE CASCADE,
    user_id TEXT,
    user_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_auctions_tournament ON auctions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_auction ON teams(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_auction ON auction_players(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_status ON auction_players(status);
CREATE INDEX IF NOT EXISTS idx_bids_auction_player ON bids(auction_id, player_id);
CREATE INDEX IF NOT EXISTS idx_team_squads_team ON team_squads(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_auction ON audit_logs(auction_id);
