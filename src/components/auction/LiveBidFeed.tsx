import React from 'react';
import { LiveBid } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { History, TrendingUp } from 'lucide-react';

interface LiveBidFeedProps {
  bids: LiveBid[];
}

export const LiveBidFeed: React.FC<LiveBidFeedProps> = ({ bids }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card flex flex-col h-[380px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Bid History ({bids.length})
          </h3>
        </div>
        {bids.length > 0 && (
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Live Stream
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {bids.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-8">
            <p className="text-xs">No bids placed for this player yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Bids will appear here in real time as teams bid.
            </p>
          </div>
        ) : (
          [...bids].reverse().map((bid, index) => {
            const isHighest = index === 0;
            return (
              <div
                key={bid.id || index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isHighest
                    ? 'bg-blue-50/80 border-blue-200 shadow-xs ring-1 ring-blue-300'
                    : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                      isHighest ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    {bid.teamId && bid.teamName && bid.teamName !== 'Bid Raised' ? bid.teamName.charAt(0) : '₹'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {bid.teamId && bid.teamName && bid.teamName !== 'Bid Raised' ? bid.teamName : 'Bid Raised'}
                      </span>
                      {isHighest && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                          {bid.teamId && bid.teamName && bid.teamName !== 'Bid Raised' ? 'LEADING' : 'CURRENT'}
                        </span>
                      )}
                    </div>
                    {bid.captainName && (
                      <span className="text-[10px] text-slate-400 block">
                        by {bid.captainName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-extrabold block ${
                      isHighest ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    {formatCurrency(bid.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
