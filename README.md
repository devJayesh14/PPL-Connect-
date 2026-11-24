# PPL Connect: Enterprise Sports Auction & Tournament Management SaaS

A complete, production-grade **Sports Auction Application** that operates as both an independent real-time live auction engine and seamlessly connects with a Tournament Management application.

Built strictly according to professional enterprise standards with a modern **Blue + White** design system (`#2563EB`, `#0F172A`, `#EFF6FF`, `#F8FAFC`, `#FFFFFF`, `#E2E8F0`), with zero neon/gaming/cyberpunk artifacts.

---

## 🚀 Key Features & Highlights

### 1. Multi-Role Architecture
- **ADMIN**: Full management across Tournaments, Auctions, Teams, Captain approvals, Player registry, Auction pool sequencing, Live auction master controls (Hammer, Undo, Auto-extension, Pause/Resume), Final Squad compliance, Manual Purse Adjustments, and Reports export.
- **TEAM CAPTAIN**: Dedicated franchise console with purse telemetry, pre-auction retention window, squad quotas, and live bidding room with a large, tactile **"BID ₹X"** button.
- **PLAYER**: Global profile registration with sporting stats (role, batting/bowling style, age, base price, bio) and live auction tracking.
- **ROLE SWITCHER**: Embedded in the top navbar for switching between Admin, Captain (with team selector), and Player roles with zero friction.

### 2. Tournament & Auction Relationship
```
Tournament
   ↓
Auction
   ↓
Teams
   ↓
Captains
   ↓
Players
   ↓
Retention Window
   ↓
Live Real-Time Auction
   ↓
Final Squads
   ↓
Tournament Teams (Shared Global Player & Team IDs)
```

### 3. Smart Purse Validation Engine
Server-side mathematical safety check on every bid to prevent teams from exhausting their budget before reaching the minimum squad requirement:
$$\text{Purse After Bid} = \text{Remaining Purse} - \text{Proposed Bid}$$
$$\text{Reserve Needed} = \max(0, \text{Min Squad} - (\text{Current Squad} + 1)) \times \text{Min Base Price}$$
If $\text{Purse After Bid} < \text{Reserve Needed}$, the bid is strictly rejected server-side with the message:
> *"You cannot place this bid because you must keep enough purse to complete your minimum squad."*

### 4. 9-Step Create Auction Flow
1. **Basic Info**: Auction Name, Tournament, Schedule, Timezone, Unique shareable link (`/auction/{slug}`)
2. **Teams & Captains**: Add franchise teams, colors, short codes, and captain credentials
3. **Purse & Pricing**: Total purse per team, currency, allow differential purses per team, manual adjustment flag
4. **Squad Rules**: Min/Max squad limits, overseas player quotas
5. **Retention Rules**: Enable retention, max retention limits, tiered pricing (`[₹1L, ₹1.5L, ₹2L]`) or flat pricing
6. **Player Categories**: Custom tiers (Icon A+, Elite A, Star B, Emerging C) with base prices and limits
7. **Auction Rules**: Fixed or percentage bid increment, 30s bid clock, auto-extension window (+10s if bid in last 5s), max re-auction attempts
8. **Registration Rules**: Open/closed registration deadlines and approval enforcement
9. **Review & Create**: Comprehensive summary review before initialization

### 5. Real-Time Bidding & Live Controls
- **Socket.IO** rooms for sub-millisecond bidirectional bidding updates.
- **Admin Hammer Controls**: Start Auction, Call Next Player, Pause/Resume Clock, Undo Last Bid, Increase Bid, Mark SOLD (with clean confetti celebration and purse deduction), Mark UNSOLD, Skip Player, Re-auction Unsold, End Auction.
- **Countdown Timer**: Synchronized server-side tick with auto-extension rule.
- **Captain Interface**: Large, responsive, tactile BID button displaying current bid increment and live eligibility status.

### 6. Reports & Analytics
- Complete Bid History log
- Sold vs Unsold player breakdown
- Team spending & purse utilization
- Most expensive players & highest bids
- Export to **CSV**, **Excel (.xlsx)**, and **PDF** formats

---

## 🛠️ Tech Stack & Database Architecture

- **Backend**: Node.js, Express 5, Socket.IO, `better-sqlite3` (WAL mode enabled, relational schema with 16 tables and indexes).
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, React Router v7.
- **Export Utilities**: `xlsx`, `jspdf`, `jspdf-autotable`, `canvas-confetti`.

### Database Schema (16 Relational Tables):
- `users`, `tournaments`, `auctions`, `auction_configs`
- `teams`, `captains`, `players`, `player_categories`
- `player_registrations`, `team_retentions`, `auction_players`
- `bids`, `auction_results`, `team_squads`, `purse_transactions`, `audit_logs`

---

## 📦 Running the Application

### 1. Build and Run Server:
```bash
# Build frontend
npm run build

# Start Express + Socket.IO Server (serves API & Frontend at port 5001)
npm run server
```

The application is accessible in your browser at:
**`http://localhost:5001`**

### 2. Development Mode:
```bash
# Start frontend dev server
npm run client
# Or start backend with live reload
npm run server
```
