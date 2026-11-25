# PPL Connect — Master Data Tracking & Recovery Registry

> **Last Updated & Verified**: 2026-11-25  
> **Status**: Clean Real-Data Backup Verified (50 Players, 50 Users, 0 Dummy Teams, 0 Dummy Captains, 1 Official Auction, 1 Official Tournament)

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
| [`data/backups/master_dump_latest.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/master_dump_latest.json) | JSON | ~1.6 MB | **Full database dump** with all 16 tables, all 50 players, base64 photos, users, passwords, tournaments, teams, squads, retentions, and configs. |
| [`data/backups/players_catalog.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/players_catalog.json) | JSON | ~18 KB | Human-readable clean catalog of all 50 players with mobile numbers, emails, playing roles, and approval status. |
| [`data/backups/teams_and_squads.json`](file:///Users/bhatupatil/PPL%20Connect/data/backups/teams_and_squads.json) | JSON | ~1 KB | All team rosters, purse accounts, captain assignments, and squad member breakdowns. |
| [`data/backups/ppl_backup_latest.sqlite`](file:///Users/bhatupatil/PPL%20Connect/data/backups/ppl_backup_latest.sqlite) | SQLite | ~1.8 MB | Active binary SQLite backup. |
| [`data/backup_full_50players.sqlite`](file:///Users/bhatupatil/PPL%20Connect/data/backup_full_50players.sqlite) | SQLite | ~1.8 MB | Permanent milestone backup containing all 50 players. |

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
   - **Players in Pool**: 48 approved in pool (50 total registered)

---

## 4. Official Teams & Squads

_No dummy teams or dummy captains present. Teams will appear here as real teams are added by the admin._

---

## 5. Complete Master Player Catalog (All 50 Players Tracked)

```
Total Registered Players: 50
```

| # | Player Name | Mobile | Email | Role | Batting Style | Bowling Style | Photo Status |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Harsh Tailor** | 7383450691 | htailor0121@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 2 | **Pinal tailor** | 9104800534 | pinaltailor17@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 3 | **Sagar Gangle** | 9054616233 | sagargangle8@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 4 | **Sushant Shinde** | 9316942113 | sushantshinde8866@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 5 | **Pappu Umesh Bhai Modi** | 9099778436 | pappumodi6590@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 6 | **Vicky Vishwakarma** | 9328640753 | vicky53vishwakarma@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 7 | **Dharmesh Surati** | 7016206224 | surati736@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 8 | **Swain Amit** | +918733896942 | amitswain566@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 9 | **Rushang Pareshbhai Patel** | 8780593060 | rushang7743@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 10 | **Karan Gurkha** | 9510755095 | nepalikaran@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 11 | **NEEL UMESH TAYDE** | 8200277472 | neeltayda@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 12 | **Aayush Kinge** | 7434051601 | aayushkinge663@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 13 | **Umesh Rajubhai shinde** | 9978737976 | umesh.shinde.1433121@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 14 | **Smit Solanki** | 8238669971 | smitsolanki433@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 15 | **Paresh Lohar** | 8128870901 | pareshlohar1999@gmail.com | WICKET_KEEPER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 16 | **Jitesh Katyare** | +919638277481 | jiteshkatyare5@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 17 | **Bunty patil** | 9316662475 | dhruvkapilpatil561@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 18 | **Kalpesh Rajbhoj** | 9023188067 | kalpeshrajbhoj2@gmail.com | BOWLER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 19 | **Jayesh Borse 🏏** | 93286938 | jayborse163@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 20 | **Sushant Shinde** | 9316942113 | sushantshinde8866@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 21 | **VIVEK Vishwakarama** | 8799158968 | vivekvishwakarama092@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 22 | **Pratik patil** | 7284969402 | patilpratikmg18@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 23 | **Shlok Gavhane** | 9974941824 | gavhaneshlok3@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 24 | **Henil Tailor** | 7043954205 | heniltailor13@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 25 | **KETAN RAJBHOJ** | 9173116740 | ketanrajbhoj79@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 26 | **Ajay Patel** | 9974461732 | ap826328@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 27 | **Abhay Pratap Singh** | 9274481164 | abhayrajput01753@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 28 | **Jenish Jariwala** | 7096263425 | jariwalajenish17@gmail.com | BOWLER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 29 | **Veeru** | 9173604260 | virudra5502@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 30 | **Sksjaj** | 8469440365 | jpvlogs1314@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 31 | **Rushang Patel** | 8780593060 | rushang7743@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 32 | **SWAIN DHIREN** | 9099556487 | swaindhiren40@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 33 | **Bisoyi Sanjay** | 7405389859 | sanjaybisoye1802@gmail.com | WICKET_KEEPER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 34 | **RAJESH GAMIT** | 7990033412 | rajeshgamit736@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 35 | **Kunal mahajan** | 6353678549 | kunalmahajan068@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 36 | **Anmol singh** | 9624002804 | anmolsingh20061226@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 37 | **Akshay Singh** | 7043279560 | akshayprashad123@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 38 | **RAHUL PATIL** | 8980454391 | rahulpatil4591@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 39 | **Vijay Damodar** | 6267426750 | vdamodar22@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 40 | **Omm Sangole** | 9726552761 | omsangole45@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 41 | **Pavan** | 9265414451 | pavanvankhede67@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 42 | **CHIRAG PATEL** | +917433995723 | chiragpatel000222@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 43 | **Bhushan khaire** | 9274086701 | khairebhushan895@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 44 | **Rahul Rawat** | 7252827390 | rahulrawat7390@icloud.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 45 | **Janmesh vishwakarma** | 9537346569 | preeti.vishwakarma1661@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 46 | **Vivek gaud** | 9372549153 | vivekgaud32@gamil.com | BATSMAN | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 47 | **Rahul Silotra** | +917041553079 | rahulsilotra0829@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 48 | **Mohit Borse** | 8200287294 | borsemanohar239@gmail.com | BOWLER | Right Hand Bat | Right Arm Medium | ✅ Yes |
| 49 | **Nilesh khairnar** | 9157667195 | khairnarnilesh143@gmail.com | BATSMAN | Right Hand Bat | Right Arm Medium | ⚠️ Pending |
| 50 | **Jayesh Goad** | 8849344214 | jayeshgoad01@gmail.com | ALL_ROUNDER | Right Hand Bat | Right Arm Medium | ⚠️ Pending |

---

## 6. Access Credentials

| Role | Username / Mobile / Email | Default Password | Access URL |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@pplconnect.com` | `admin123` | [`/login`](file:///Users/bhatupatil/PPL%20Connect/src/pages/auth/LoginPage.tsx) |
| **Player Self Check** | Any Player Mobile Number | N/A (Direct Search) | [`/check`](file:///Users/bhatupatil/PPL%20Connect/src/pages/public/PlayerSelfCheckPage.tsx) |
