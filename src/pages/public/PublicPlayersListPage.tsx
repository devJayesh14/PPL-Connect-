import React, { useState, useEffect, useMemo } from 'react';
import { Search, Share2, Check, Users, Shield, Sparkles, Filter, RefreshCw, Trophy } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
import { formatCurrency } from '../../utils/formatters';

interface PublicPlayer {
  id: string;
  full_name: string;
  photo: string | null;
  playing_role: string;
  batting_style?: string | null;
  bowling_style?: string | null;
  is_overseas?: number;
  experience?: string | null;
  base_price: number;
  status: string;
  retained_team_name?: string | null;
  sold_team_name?: string | null;
  sold_price?: number | null;
}

export const PublicPlayersListPage: React.FC = () => {
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/players/public-pool');
      if (!res.ok) throw new Error('Failed to load players list');
      const data = await res.json();
      setPlayers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not load player pool');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleCopyLink = () => {
    const url = window.location.origin + '/players-list';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        !searchTerm.trim() ||
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        p.playing_role?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        p.batting_style?.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        p.bowling_style?.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchesRole = selectedRole === 'ALL' || p.playing_role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [players, searchTerm, selectedRole]);

  // Role stats
  const stats = useMemo(() => {
    const total = players.length;
    const batsmen = players.filter((p) => p.playing_role === 'BATSMAN').length;
    const bowlers = players.filter((p) => p.playing_role === 'BOWLER').length;
    const allRounders = players.filter((p) => p.playing_role === 'ALL_ROUNDER').length;
    const wicketkeepers = players.filter((p) => p.playing_role === 'WICKETKEEPER').length;
    return { total, batsmen, bowlers, allRounders, wicketkeepers };
  }, [players]);

  const getRoleBadgeVariant = (role: string): 'blue' | 'navy' | 'gray' | 'green' | 'amber' | 'red' => {
    switch (role) {
      case 'BATSMAN':
        return 'blue';
      case 'BOWLER':
        return 'green';
      case 'ALL_ROUNDER':
        return 'amber';
      case 'WICKETKEEPER':
        return 'navy';
      default:
        return 'gray';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header Banner */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <img src="/logo.png" alt="PPL" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight uppercase">
                  Priyanka Premiere League
                </h1>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 rounded">
                  Players Pool
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-amber-400 font-extrabold uppercase tracking-wider">
                United We Play, United We Win!
              </p>
            </div>
          </div>

          {/* Share Action */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Pool Link</span>
                </>
              )}
            </button>
            <button
              onClick={fetchPlayers}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer"
              title="Refresh player list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Intro Card & Role Stat Chips */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Official Players Registry &amp; Pool
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Shareable roster for captains and team managers. Review verified player skill sets, playing roles, and auction availability.
              </p>
            </div>

            <div className="text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 self-start md:self-auto">
              Privacy Notice: <strong className="text-slate-800">Contact details restricted</strong>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Pool</span>
              <span className="text-sm font-extrabold text-slate-900">{stats.total}</span>
            </div>
            <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-100">
              <span className="text-[10px] text-blue-600 uppercase font-bold block">Batsmen</span>
              <span className="text-sm font-extrabold text-blue-900">{stats.batsmen}</span>
            </div>
            <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-600 uppercase font-bold block">Bowlers</span>
              <span className="text-sm font-extrabold text-emerald-900">{stats.bowlers}</span>
            </div>
            <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-100">
              <span className="text-[10px] text-amber-600 uppercase font-bold block">All-Rounders</span>
              <span className="text-sm font-extrabold text-amber-900">{stats.allRounders}</span>
            </div>
            <div className="p-2 bg-purple-50/60 rounded-lg border border-purple-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-purple-600 uppercase font-bold block">Wicketkeepers</span>
              <span className="text-sm font-extrabold text-purple-900">{stats.wicketkeepers}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by player name, style, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium text-slate-900 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Players' },
                { id: 'BATSMAN', label: 'Batsmen' },
                { id: 'BOWLER', label: 'Bowlers' },
                { id: 'ALL_ROUNDER', label: 'All-Rounders' },
                { id: 'WICKETKEEPER', label: 'WK' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedRole(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedRole === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchPlayers} className="font-bold underline text-rose-900">
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-200 mx-auto" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Player Cards Grid (Lightweight, hardware-accelerated CSS for fast phone loading) */}
        {!loading && filteredPlayers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPlayers.map((player) => {
              const isRetained = !!player.retained_team_name;
              const isSold = !!player.sold_team_name;

              return (
                <div
                  key={player.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-4 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Photo & Role Badge */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative shrink-0">
                        <PlayerAvatar
                          src={player.photo}
                          name={player.full_name}
                          className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-200 group-hover:border-blue-500 transition-colors"
                          fallbackClassName="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center"
                        />
                        {player.is_overseas ? (
                          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-amber-500 text-white px-1 rounded shadow">
                            ✈
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                          {player.full_name}
                        </h3>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <Badge variant={getRoleBadgeVariant(player.playing_role)} size="sm">
                            {player.playing_role?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Styles & Experience */}
                    <div className="space-y-1.5 py-2.5 border-t border-b border-slate-100 text-xs">
                      {player.batting_style && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px] text-slate-400">Batting:</span>
                          <span className="font-semibold text-slate-800 truncate">{player.batting_style}</span>
                        </div>
                      )}
                      {player.bowling_style && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px] text-slate-400">Bowling:</span>
                          <span className="font-semibold text-slate-800 truncate">{player.bowling_style}</span>
                        </div>
                      )}
                      {player.experience && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px] text-slate-400">Experience:</span>
                          <span className="font-medium text-slate-700">{player.experience}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer: Price & Status */}
                  <div className="mt-3 pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Base Price
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatCurrency(player.base_price || 500)}
                      </span>
                    </div>

                    <div>
                      {isRetained ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                          Retained: {player.retained_team_name}
                        </span>
                      ) : isSold ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          Sold: {player.sold_team_name} ({formatCurrency(player.sold_price || player.base_price)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                          In Pool
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Search Result */}
        {!loading && filteredPlayers.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No players found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No registered players match "{searchTerm}". Try clearing your search term or filtering by another role.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRole('ALL');
              }}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicPlayersListPage;
