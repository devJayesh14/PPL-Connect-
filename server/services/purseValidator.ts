import { db } from '../db/index.js';

export interface PurseValidationResult {
  allowed: boolean;
  reason?: string;
  maxAffordableBid?: number;
  reserveNeeded?: number;
  remainingSpotsNeeded?: number;
  currentSquadCount?: number;
}

export function validateTeamBid(
  auctionId: string,
  teamId: string,
  playerId: string,
  proposedBid: number
): PurseValidationResult {
  // 1. Fetch team
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
  if (!team) {
    return { allowed: false, reason: 'Team not found.' };
  }

  // 2. Fetch auction config
  const config = db.prepare('SELECT * FROM auction_configs WHERE auction_id = ?').get(auctionId) as any;
  if (!config) {
    return { allowed: false, reason: 'Auction configuration not found.' };
  }

  // 3. Fetch player details
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
  if (!player) {
    return { allowed: false, reason: 'Player not found.' };
  }

  // 4. Fetch auction player record (for category)
  const auctionPlayer = db.prepare('SELECT * FROM auction_players WHERE auction_id = ? AND player_id = ?').get(auctionId, playerId) as any;

  // 5. Calculate current squad count for this team in this auction/tournament
  const squadPlayers = db.prepare(`
    SELECT ts.*, p.is_overseas, ap.category_id
    FROM team_squads ts
    JOIN players p ON ts.player_id = p.id
    LEFT JOIN auction_players ap ON ap.player_id = p.id AND ap.auction_id = ts.auction_id
    WHERE ts.team_id = ? AND ts.auction_id = ?
  `).all(teamId, auctionId) as any[];

  const currentSquadCount = squadPlayers.length;

  // 6. Max Squad Check
  if (currentSquadCount >= config.max_players_per_team) {
    return {
      allowed: false,
      reason: `Team has already reached the maximum squad limit of ${config.max_players_per_team} players.`,
      currentSquadCount,
    };
  }

  // 7. Overseas Player Check
  if (player.is_overseas === 1) {
    const currentOverseasCount = squadPlayers.filter(p => p.is_overseas === 1).length;
    if (currentOverseasCount >= config.max_overseas_players) {
      return {
        allowed: false,
        reason: `Team has already reached the maximum overseas player limit of ${config.max_overseas_players}.`,
        currentSquadCount,
      };
    }
  }

  // 8. Category Max Check (if category has max limit)
  if (auctionPlayer && auctionPlayer.category_id) {
    const category = db.prepare('SELECT * FROM player_categories WHERE id = ?').get(auctionPlayer.category_id) as any;
    if (category && category.max_players > 0) {
      const currentCategoryCount = squadPlayers.filter(p => p.category_id === category.id).length;
      if (currentCategoryCount >= category.max_players) {
        return {
          allowed: false,
          reason: `Team has reached the maximum allowed players (${category.max_players}) for category "${category.name}".`,
          currentSquadCount,
        };
      }
    }
  }

  // 9. Basic Purse Check
  if (team.remaining_purse < proposedBid) {
    return {
      allowed: false,
      reason: `Insufficient purse. Team has ${config.currency_symbol}${team.remaining_purse.toLocaleString('en-IN')} remaining, but bid is ${config.currency_symbol}${proposedBid.toLocaleString('en-IN')}.`,
      currentSquadCount,
    };
  }

  // 10. SMART PURSE VALIDATION (Requirement 8)
  // New squad count if this player is bought
  const newSquadCount = currentSquadCount + 1;
  const remainingSpotsNeeded = Math.max(0, config.min_players_per_team - newSquadCount);

  // Minimum amount per remaining spot
  const minPricePerSpot = config.min_base_price > 0 ? config.min_base_price : config.default_base_price;
  const reserveNeeded = remainingSpotsNeeded * minPricePerSpot;
  const purseAfterBid = team.remaining_purse - proposedBid;

  const maxAffordableBid = Math.max(0, team.remaining_purse - reserveNeeded);

  if (purseAfterBid < reserveNeeded) {
    return {
      allowed: false,
      reason: 'You cannot place this bid because you must keep enough purse to complete your minimum squad.',
      maxAffordableBid,
      reserveNeeded,
      remainingSpotsNeeded,
      currentSquadCount,
    };
  }

  return {
    allowed: true,
    maxAffordableBid,
    reserveNeeded,
    remainingSpotsNeeded,
    currentSquadCount,
  };
}
