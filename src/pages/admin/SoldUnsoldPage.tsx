import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, XCircle, RotateCcw, Search } from 'lucide-react';

export const SoldUnsoldPage: React.FC<{ initialTab?: 'sold' | 'unsold' }> = ({ initialTab = 'sold' }) => {
  const auctionId = 'auc_default';
  const [tab, setTab] = useState<'sold' | 'unsold'>(initialTab);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/${auctionId}/summary`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auctionId]);

  const handleReauction = async (playerId: string) => {
    if (!confirm('Move this unsold player back to the active auction pool for re-auction?')) return;
    try {
      const res = await fetch(`/api/players/pool/${auctionId}`, {
        method: 'POST',
      });
      // Call engine reauction via socket or API
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sold & Unsold Player Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track confirmed acquisitions, winning bid valuations, and re-auction unsold players.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setTab('sold')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              tab === 'sold' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Sold Players ({data?.soldPlayers?.length || 0})
          </button>
          <button
            onClick={() => setTab('unsold')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              tab === 'unsold' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Unsold Players ({data?.unsoldPlayers?.length || 0})
          </button>
        </div>
      </div>

      <Card noPadding>
        {tab === 'sold' ? (
          <>
            {/* Mobile View for Sold Players (< md) */}
            <div className="md:hidden divide-y divide-slate-100 bg-white">
              {!data?.soldPlayers || data.soldPlayers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No sold players recorded yet.
                </div>
              ) : (
                data.soldPlayers.map((p: any) => (
                  <div key={p.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {p.photo ? (
                            <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                              {p.full_name?.charAt(0) || 'P'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{p.full_name}</div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {p.playing_role} • {p.category_name || 'Standard'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-blue-700 block">{formatCurrency(p.final_bid)}</span>
                        <span className="text-[10px] text-slate-400 block">Base: {formatCurrency(p.base_price)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500 text-[11px]">Winning Franchise:</span>
                      <strong className="text-blue-700 font-bold">{p.winning_team_name}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Player</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Winning Team</th>
                    <th className="px-6 py-3">Final Sold Price</th>
                    <th className="px-6 py-3">Base Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.soldPlayers?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          {p.photo ? (
                            <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                              {p.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span>{p.full_name}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{p.playing_role}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant="blue" size="sm">
                          {p.category_name || 'Standard'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-blue-700">
                        {p.winning_team_name}
                      </td>
                      <td className="px-6 py-3.5 font-black text-slate-900">
                        {formatCurrency(p.final_bid)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">
                        {formatCurrency(p.base_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Mobile View for Unsold Players (< md) */}
            <div className="md:hidden divide-y divide-slate-100 bg-white">
              {!data?.unsoldPlayers || data.unsoldPlayers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No unsold players in this auction yet.
                </div>
              ) : (
                data.unsoldPlayers.map((p: any) => (
                  <div key={p.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {p.photo ? (
                            <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                              {p.full_name?.charAt(0) || 'P'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs truncate">{p.full_name}</div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {p.playing_role} • {p.category_name || 'Standard'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800 block">{formatCurrency(p.base_price)}</span>
                        <span className="text-[10px] text-slate-400 block">{p.reauction_count || 1}/2 attempts</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end text-xs pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1 px-3 h-8"
                        onClick={() => handleReauction(p.player_id)}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Re-Auction
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table for Unsold Players (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Player</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Base Price</th>
                    <th className="px-6 py-3">Re-Auction Attempts</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.unsoldPlayers?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No unsold players in this auction yet.
                      </td>
                    </tr>
                  ) : (
                    data?.unsoldPlayers?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                            {p.photo ? (
                              <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                {p.full_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span>{p.full_name}</span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{p.playing_role}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant="gray" size="sm">
                            {p.category_name || 'Standard'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          {formatCurrency(p.base_price)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500">
                          {p.reauction_count || 1} / 2 allowed
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReauction(p.player_id)}
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Re-Auction
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
