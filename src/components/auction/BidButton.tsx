import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { Gavel, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateBidEligibility } from '../../utils/purseCalculator';

interface BidButtonProps {
  nextBidAmount: number;
  currentBid: number;
  team: {
    id: string;
    name: string;
    remainingPurse: number;
    squadCount?: number;
  } | null;
  highestBidderId?: string | null;
  onPlaceBid: (amount: number) => Promise<{ success: boolean; message?: string }>;
  isAuctionActive: boolean;
  minSquad?: number;
  maxSquad?: number;
  minBasePrice?: number;
}

export const BidButton: React.FC<BidButtonProps> = ({
  nextBidAmount,
  currentBid,
  team,
  highestBidderId,
  onPlaceBid,
  isAuctionActive,
  minSquad = 11,
  maxSquad = 15,
  minBasePrice = 10000,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!team) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
        Please select a Team Captain profile in the top bar to participate in bidding.
      </div>
    );
  }

  const isCurrentHighest = team.id === highestBidderId;
  const currentSquad = team.squadCount || 0;

  // Evaluate smart purse validation
  const validation = calculateBidEligibility(
    team.remainingPurse,
    currentSquad,
    nextBidAmount,
    minSquad,
    maxSquad,
    minBasePrice
  );

  const canClick = isAuctionActive && !isCurrentHighest && validation.canBid && !loading;

  const handleClick = async () => {
    if (!canClick) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await onPlaceBid(nextBidAmount);
      if (!res.success) {
        setErrorMessage(res.message || 'Bid rejected by server validation.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Network error placing bid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* Smart Purse Alert Warning if Ineligible */}
      {!validation.canBid && isAuctionActive && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Smart Purse Restriction:</span>
            <span>{validation.reason}</span>
            {validation.reserveNeeded > 0 && (
              <span className="block mt-0.5 text-amber-800 text-[11px]">
                Must reserve at least {formatCurrency(validation.reserveNeeded)} for remaining {validation.remainingSpotsNeeded} squad spot(s).
              </span>
            )}
          </div>
        </div>
      )}

      {/* Server error message if any */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Big Tactile Responsive Bid Button */}
      <button
        onClick={handleClick}
        disabled={!canClick}
        className={`w-full py-5 sm:py-6 px-6 rounded-xl font-extrabold text-lg sm:text-xl shadow-elevated transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
          isCurrentHighest
            ? 'bg-slate-100 text-slate-500 border-2 border-slate-300 cursor-not-allowed shadow-none'
            : !validation.canBid || !isAuctionActive
            ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-500/25 ring-2 ring-blue-500/30'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isCurrentHighest ? (
            <>
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <span>YOU ARE HIGHEST BIDDER</span>
            </>
          ) : !isAuctionActive ? (
            <span>BIDDING PAUSED / IDLE</span>
          ) : !validation.canBid ? (
            <span>INSUFFICIENT SQUAD PURSE</span>
          ) : (
            <>
              <Gavel className="w-6 h-6" />
              <span>BID {formatCurrency(nextBidAmount)}</span>
            </>
          )}
        </div>

        {canClick && (
          <span className="text-xs font-normal text-blue-100 opacity-90">
            For {team.name} • Remaining Purse: {formatCurrency(team.remainingPurse)}
          </span>
        )}
      </button>
    </div>
  );
};
