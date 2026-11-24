import React from 'react';
import { Team } from '../../types';
import { formatCompactCurrency, formatCurrency } from '../../utils/formatters';
import { Shield, Users, Wallet } from 'lucide-react';

interface TeamPurseMeterProps {
  teams: Team[];
  highestBidderId?: string | null;
  maxSquad?: number;
  minSquad?: number;
}

export const TeamPurseMeter: React.FC<TeamPurseMeterProps> = ({
  teams,
  highestBidderId,
  maxSquad = 15,
  minSquad = 11,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Team Purses & Squads ({teams.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Min: {minSquad} | Max: {maxSquad}
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.map((team) => {
          const isHighest = team.id === highestBidderId;
          const squadCount = team.squadCount || 0;
          const purseUsagePercent = Math.min(
            100,
            Math.round((team.spentPurse / team.initialPurse) * 100)
          );

          return (
            <div
              key={team.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isHighest
                  ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: team.color || '#2563EB' }}
                  >
                    {team.shortName || team.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                      {team.name}
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Cap: {team.captainName || 'Assigned'}
                    </span>
                  </div>
                </div>

                {isHighest && (
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded">
                    LEAD
                  </span>
                )}
              </div>

              {/* Purse Numbers */}
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Remaining Purse
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatCompactCurrency(team.remainingPurse)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Squad
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {squadCount} / {maxSquad}
                  </span>
                </div>
              </div>

              {/* Progress Bar of Purse Usage */}
              <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${purseUsagePercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
