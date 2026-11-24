import React from 'react';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import { Globe, Award, ShieldAlert, Sparkles, User } from 'lucide-react';

interface LivePlayerCardProps {
  player: {
    fullName: string;
    photo?: string;
    playingRole: string;
    battingStyle?: string;
    bowlingStyle?: string;
    categoryName?: string;
    basePrice: number;
    currentOrder: number;
    isOverseas: boolean;
    age?: number;
    experience?: string;
    previousTeam?: string;
  } | null;
  currentBid: number;
  highestBidder: {
    teamId: string;
    teamName: string;
    teamLogo?: string;
    teamColor?: string;
  } | null;
  status: string;
}

export const LivePlayerCard: React.FC<LivePlayerCardProps> = ({
  player,
  currentBid,
  highestBidder,
  status,
}) => {
  if (!player) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center shadow-card flex flex-col items-center justify-center min-h-[360px]">
        <img
          src="/logo.png"
          alt="Priyanka Premiere League"
          className="w-24 h-24 object-contain mb-3 drop-shadow-md"
        />
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
          Priyanka Premiere League
        </h3>
        <p className="text-xs font-black text-amber-600 uppercase tracking-wider mt-1">
          ★ United We Play, United We Win! ★
        </p>
        <p className="text-xs text-slate-500 max-w-sm mt-2">
          Waiting for the auctioneer to call the next player to the stage.
        </p>
      </div>
    );
  }

  const roleLabelMap: Record<string, string> = {
    BATSMAN: 'Batsman',
    BOWLER: 'Bowler',
    ALL_ROUNDER: 'All-Rounder',
    WICKET_KEEPER: 'Wicket Keeper',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
      {/* Top Banner / Order Strip */}
      <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Player #{player.currentOrder}</span>
          <span className="text-slate-300">•</span>
          {player.categoryName && (
            <Badge variant="blue" size="sm">
              {player.categoryName}
            </Badge>
          )}
          {player.isOverseas && (
            <Badge variant="navy" size="sm" className="gap-1">
              <Globe className="w-3 h-3 text-blue-600" />
              <span>Overseas</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Base Price:</span>
          <span className="font-bold text-slate-900">{formatCurrency(player.basePrice)}</span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Player Photo */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 mx-auto sm:mx-0 shadow-xs">
            {player.photo ? (
              <img
                src={player.photo}
                alt={player.fullName}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <User className="w-16 h-16" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              {roleLabelMap[player.playingRole] || player.playingRole}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 w-full text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {player.fullName}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                  <Badge variant="gray" size="sm">
                    {roleLabelMap[player.playingRole] || player.playingRole}
                  </Badge>
                  {player.age && (
                    <span className="text-xs text-slate-500">
                      Age: <strong className="text-slate-800">{player.age}</strong>
                    </span>
                  )}
                  {player.previousTeam && (
                    <span className="text-xs text-slate-500">
                      Prev: <strong className="text-slate-800">{player.previousTeam}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Specs */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Batting Style
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {player.battingStyle || 'Right Hand Bat'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Bowling Style
                </span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {player.bowlingStyle || 'None'}
                </span>
              </div>
            </div>

            {player.experience && (
              <p className="text-xs text-slate-500 mt-3">
                <strong className="text-slate-700">Experience:</strong> {player.experience}
              </p>
            )}
          </div>
        </div>

        {/* Live Bidding Box */}
        <div className="mt-6 p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Current Highest Bid
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-900 mt-0.5 tracking-tight">
              {formatCurrency(currentBid)}
            </div>
          </div>

          <div className="text-center sm:text-right">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Leading Team
            </span>
            {highestBidder ? (
              <div className="flex items-center gap-2 mt-1">
                {highestBidder.teamLogo && (
                  <img
                    src={highestBidder.teamLogo}
                    alt={highestBidder.teamName}
                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                  />
                )}
                <span className="font-bold text-slate-900 text-base">
                  {highestBidder.teamName}
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-400 mt-1 block">
                No Bids Yet (At Base Price)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
