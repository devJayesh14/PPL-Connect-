# PPL Connect — Master Data Tracking & Recovery Registry

> **Last Updated & Verified**: 2026-11-25  
> **Status**: Full Backup Verified (32 Players, 34 Users, 1 Team, 2 Auctions, 1 Tournament, 1 Retention, 1 Squad)

---

## 1. Quick Recovery Commands

If any data is ever lost or altered in the future, you can restore everything instantly using these commands:

| Action | Command | Description |
| :--- | :--- | :--- |
| **Check Data Status** | `npm run db:status` | Shows live database table counts vs backup files |
| **Instant Full Restore** | `npm run restore` | Automatically reconstructs the database from [`data/backups/master_dump_latest.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/master_dump_latest.json) |
| **Create New Backup** | `npm run backup` | Takes an instant snapshot of current SQLite DB + exports updated JSON dumps |
| **Restore from SQLite** | `node scripts/backup_manager.cjs restore data/backups/ppl_backup_latest.sqlite` | Direct binary restore from latest SQLite backup |

---

## 2. Backup Files Directory Map

All backup data is safely stored in [`data/backups/`](file:///Users/bhatupatil/PPL%20Connect/data/backups/):

| File Path | Format | Size | Contents |
| :--- | :--- | :--- | :--- |
| [`data/backups/master_dump_latest.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/master_dump_latest.json) | JSON | ~907 KB | **Full database dump** with all 16 tables, all 32 players, base64 photos, users, passwords, tournaments, teams, squads, retentions, and configs. |
| [`data/backups/players_catalog.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/players_catalog.json) | JSON | ~12 KB | Human-readable clean catalog of all 32 players with mobile numbers, emails, playing roles, and approval status. |
| [`data/backups/teams_and_squads.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/teams_and_squads.json) | JSON | ~1 KB | All team rosters, purse accounts, captain assignments, and squad member breakdowns. |
| [`data/backups/ppl_backup_latest.sqlite`](file:///Users/bhatupatil/PPL%20Connect/data/backups/ppl_backup_latest.sqlite) | SQLite | ~1.1 MB | Active binary SQLite backup. |
| [`data/backup_full_data_32players.sqlite`](file:///Users/bhatupatil/PPL%20Connect/data/backup_full_data_32players.sqlite) | SQLite | ~1.1 MB | Permanent milestone backup containing all 32 players. |

---

## 3. Official Tournament & Auction Details

### Official Tournament
- **ID**: `tour_ppl_2026`
- **Name**: Priyanka Premiere League (PPL)
- **Description**: Official PPL Championship Tournament
- **Sport**: Cricket
- **Location**: Surat, Gujarat
- **Dates**: 2026-12-10 to 2026-12-25
- **Status**: `UPCOMING`

### Auctions
1. **PPL Grand Auction 2026**
   - **ID**: `auc_default`
   - **Status**: `REGISTRATION_OPEN`
   - **Starting Purse per Team**: ₹20,000
   - **Default Base Price**: ₹500
   - **Bid Increment**: ₹100
   - **Max Retentions**: 1 (0 points deducted)
   - **Squad Range**: 11 to 15 players
   - **Share Link**: `/auction/ppl-2026`
2. **PPL Grand Auction Live Test**
   - **ID**: `auc_1795538374138`
   - **Status**: `AUCTION_SCHEDULED`

---

## 4. Teams, Captains & Squads

### Surat Super Kings (SSK)
- **Team ID**: `tm_1795538420079`
- **Tournament**: `tour_ppl_2026`
- **Auction**: `auc_default`
- **Color**: `#2563EB`
- **Total Initial Purse**: ₹20,000
- **Spent Purse**: ₹0
- **Remaining Purse**: ₹20,000
- **Captain ID**: `cap_1795538420079` (Dhoni | Phone: `1234567890` | Email: `abc1234@gmail.com`)
- **Confirmed Retention**:
  - **Player**: Dharmesh Surati (`ply_1795358537433_l9sl3`)
  - **Retention Price**: ₹0
  - **Status**: `CONFIRMED`
- **Current Squad (1 Player)**:
  - **Dharmesh Surati** (`ply_1795358537433_l9sl3`) | Acquisition: `RETENTION` | Price: ₹0

---

## 5. Master Player Registry (All 32 Players)

| # | Player ID | Full Name | Mobile | Email | Role | Batting Style | Bowling Style | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `ply_1795358537433_l9sl3` | **Dharmesh Surati** | 7016206224 | surati736@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | **RETAINED (SSK)** |
| **2** | `ply_1795357921528_htw70` | **Harsh Tailor** | 7383450691 | htailor0121@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **3** | `ply_1795358008135_obow3` | **Pinal tailor** | 9104800534 | pinaltailor17@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **4** | `ply_1795358042595_1t1le` | **Sagar Gangle** | 9054616233 | sagargangle8@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **5** | `ply_1795358162510_w7t78` | **Sushant Shinde** | 9316942113 | sushantshinde8866@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **6** | `ply_1795358227366_4p0wr` | **Pappu Umesh Bhai Modi** | 9099778436 | pappumodi6590@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **7** | `ply_1795358516245_2f58j` | **Vicky Vishwakarma** | 9328640753 | vicky53vishwakarma@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **8** | `ply_1795358816508_n4fae` | **Swain Amit** | +918733896942 | amitswain566@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **9** | `ply_1795359010754_i2b0o` | **Rushang Pareshbhai Patel** | 8780593060 | rushang7743@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **10** | `ply_1795359360033_5m7li` | **Karan Gurkha** | 9510755095 | nepalikaran@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **11** | `ply_1795368437072_vd65m` | **NEEL UMESH TAYDE** | 8200277472 | neeltayda@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **12** | `ply_1795538870015_e3pwp` | **Aayush Kinge** | 7434051601 | aayushkinge663@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **13** | `ply_1795540157641_ierpx` | **Umesh Rajubhai shinde** | 9978737976 | umesh.shinde.1433121@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **14** | `ply_1795549524081_28e1u` | **SWAIN DHIREN** | 9099556487 | swaindhiren40@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **15** | `ply_1795543903180_0jzg9` | **Smit Solanki** | 8238669971 | smitsolanki433@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **16** | `ply_1795543905973_v2nwo` | **Paresh Lohar** | 8128870901 | pareshlohar1999@gmail.com | WICKET_KEEPER | Right Hand Bat | Right Arm Medium | APPROVED |
| **17** | `ply_1795544348067_33j7b` | **Jitesh Katyare** | +919638277481 | jiteshkatyare5@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **18** | `ply_1795545450766_75n8l` | **Bunty patil** | 9316662475 | dhruvkapilpatil561@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **19** | `ply_1795545573628_o51d8` | **Kalpesh Rajbhoj** | 9023188067 | kalpeshrajbhoj2@gmail.com | BOWLER | Right Hand Bat | Right Arm Medium | APPROVED |
| **20** | `ply_1795545618396_17zbb` | **Jayesh Borse 🏏** | 93286938 | jayborse163@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **21** | `ply_1795545724890_8y7q3` | **VIVEK Vishwakarama** | 8799158968 | vivekvishwakarama092@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **22** | `ply_1795545776896_5ox6m` | **Pratik patil** | 7284969402 | patilpratikmg18@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **23** | `ply_1795545892274_p9ksp` | **Shlok Gavhane** | 9974941824 | gavhaneshlok3@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **24** | `ply_1795546071445_9v98j` | **Henil Tailor** | 7043954205 | heniltailor13@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **25** | `ply_1795546359321_fof8j` | **KETAN RAJBHOJ** | 9173116740 | ketanrajbhoj79@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **26** | `ply_1795546381660_98rsm` | **Ajay Patel** | 9974461732 | ap826328@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | APPROVED |
| **27** | `ply_1795546522577_v08c8` | **Abhay Pratap Singh** | 9274481164 | abhayrajput01753@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **28** | `ply_1795546537931_496l1` | **Jenish Jariwala** | 7096263425 | jariwalajenish17@gmail.com | BOWLER | Right Hand Bat | Right Arm Medium | APPROVED |
| **29** | `ply_1795546651226_z64i3` | **Veeru** | 9173604260 | virudra5502@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | APPROVED |
| **30** | `ply_1795547456383_9g754` | **Sksjaj** | 8469440365 | jpvlogs1314@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | PENDING |
| **31** | `ply_1795548081717_hvdcs` | **Rushang Patel** | 8780593060 | rushang7743@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | PENDING |
| **32** | `cap_user_jayesh_patil` | **Jayesh Patil** | 8469440360 | bsp7779@gmail.com | CAPTAIN | Right Hand Bat | Right Arm Medium | CAPTAIN |

---

## 6. System Users & Access Credentials

- **Super Admin**: `admin@pplconnect.com` / `admin123` (Full console access)
- **Captain Dhoni**: `abc1234@gmail.com` / `12345678` (Surat Super Kings Captain)
- **Captain Hardik**: `hardik@gmail.com` / `12345678`
- **Captain Jayesh Patil**: `bsp7779@gmail.com` / `admin123`
- **Registered Players**: Password defaults to `admin123` for self-check / portal access.

---

## 7. How Data Loss Prevention Works

1. **JSON Redundancy**:
   All tables are continuously serialized to [`data/backups/master_dump_latest.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/master_dump_latest.json). Even if SQLite files are deleted, `npm run restore` instantly rebuilds the database in 1 second.
2. **Neon Overwrite Guard**:
   [`server/db/index.ts`](file:///Users/bhatupatil/PPL%20Connect/server/db/index.ts) checks integrity and record counts before accepting any cloud snapshot. If a snapshot has 0 auctions or missing players, it refuses to overwrite the local database.
3. **Automated Timestamped Backups**:
   Running `npm run backup` creates a dated `.sqlite` file in `data/backups/` so you can revert to any historical point in time.
