export interface ClientPurseValidation {
  canBid: boolean;
  reason?: string;
  reserveNeeded: number;
  remainingSpotsNeeded: number;
  maxAffordableBid: number;
}

export function calculateBidEligibility(
  remainingPurse: number,
  currentSquadCount: number,
  proposedBid: number,
  minSquad = 11,
  maxSquad = 15,
  minBasePrice = 10000
): ClientPurseValidation {
  // Max squad limit
  if (currentSquadCount >= maxSquad) {
    return {
      canBid: false,
      reason: `Maximum squad limit of ${maxSquad} players reached.`,
      reserveNeeded: 0,
      remainingSpotsNeeded: 0,
      maxAffordableBid: 0,
    };
  }

  // Purse check
  if (remainingPurse < proposedBid) {
    return {
      canBid: false,
      reason: `Insufficient purse balance (₹${remainingPurse.toLocaleString('en-IN')}).`,
      reserveNeeded: 0,
      remainingSpotsNeeded: 0,
      maxAffordableBid: remainingPurse,
    };
  }

  // Smart Purse Validation:
  // Spots needed AFTER buying this player:
  const newSquad = currentSquadCount + 1;
  const remainingSpotsNeeded = Math.max(0, minSquad - newSquad);
  const reserveNeeded = remainingSpotsNeeded * minBasePrice;
  const maxAffordableBid = Math.max(0, remainingPurse - reserveNeeded);

  if (remainingPurse - proposedBid < reserveNeeded) {
    return {
      canBid: false,
      reason: 'You cannot place this bid because you must keep enough purse to complete your minimum squad.',
      reserveNeeded,
      remainingSpotsNeeded,
      maxAffordableBid,
    };
  }

  return {
    canBid: true,
    reserveNeeded,
    remainingSpotsNeeded,
    maxAffordableBid,
  };
}
