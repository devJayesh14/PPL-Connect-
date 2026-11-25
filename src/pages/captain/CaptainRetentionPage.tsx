import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
import { formatCurrency } from '../../utils/formatters';
import { Lock, Unlock, CheckCircle2, AlertCircle, Shield, RefreshCw, Mail, Copy, Clock, XCircle, Search, User, X } from 'lucide-react';

export const CaptainRetentionPage: React.FC = () => {
  const { currentTeamId, availableTeams, user } = useAuth();

  const [team, setTeam] = useState<any>(null);
  const [allTeamsList, setAllTeamsList] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [retentions, setRetentions] = useState<any[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [releaseLoadingId, setReleaseLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Determine effective team ID
  const effectiveTeamId =
    selectedTeamId ||
    currentTeamId ||
    user?.teamId ||
    availableTeams.find((t) => t.captainEmail === user?.email || (t as any).captain_email === user?.email || t.id === user?.teamId)?.id ||
    availableTeams[0]?.id;

  const fetchData = async () => {
    try {
      setError(null);
      const teamsRes = await fetch('/api/teams');
      const allTeams = teamsRes.ok ? await teamsRes.json() : [];
      setAllTeamsList(allTeams);

      const activeId = selectedTeamId || effectiveTeamId;
      const myTeam = allTeams.find(
        (t: any) =>
          t.id === activeId ||
          t.id === user?.teamId ||
          t.captain_email?.toLowerCase() === user?.email?.toLowerCase()
      ) || allTeams[0] || (activeId ? await (await fetch(`/api/teams/${activeId}`)).json().catch(() => null) : null);

      if (myTeam) {
        setTeam(myTeam);
        if (!selectedTeamId) setSelectedTeamId(myTeam.id);
        const retRes = await fetch(`/api/retentions/team/${myTeam.id}`);
        if (retRes.ok) {
          const retData = await retRes.json();
          setRetentions(retData);
        }
      }

      // Fetch all registered players
      const playersRes = await fetch('/api/players');
      if (playersRes.ok) {
        const all = await playersRes.json();
        setAvailablePlayers(Array.isArray(all) ? all : all.players || []);
      }
    } catch (e: any) {
      console.error(e);
      setError('Failed to load team retention data.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTeamId, effectiveTeamId, user?.email, user?.teamId]);

  // STRICT RULES: 1 Player Only, 0 points deducted
  const maxRetentions = 1;
  const activeRetentions = retentions.filter((r) => r.status !== 'REJECTED');
  const canRetain = activeRetentions.length < maxRetentions;
  const currentRetention = activeRetentions[0];

  const handleRetainPlayer = async () => {
    if (!selectedPlayerId) return;
    const targetTeamId = team?.id || effectiveTeamId;
    if (!targetTeamId) {
      setError('Could not identify your franchise team. Please check with Super Admin.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/retentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: team?.auction_id || 'auc_default',
          teamId: targetTeamId,
          playerId: selectedPlayerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to retain player');
      }

      setSelectedPlayerId('');
      setSuccessMsg(data.message || 'Retention offer sent! Awaiting player confirmation via email.');
      setTimeout(() => setSuccessMsg(null), 6000);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Error executing retention');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseRetention = async (retentionId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to cancel the retention offer for "${playerName}"?`)) return;

    setReleaseLoadingId(retentionId);
    setError(null);
    try {
      const res = await fetch(`/api/retentions/${retentionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release retention');

      setSuccessMsg(`Retention slot released. You can now retain another player.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchData();
    } catch (e: any) {
      setError(e.message || 'Error releasing retention');
    } finally {
      setReleaseLoadingId(null);
    }
  };

  const handleCopyConfirmationLink = (token: string) => {
    const origin = window.location.origin;
    const link = `${origin}/confirm-retention/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Players eligible for retention
  const unRetainedPlayers = availablePlayers.filter(
    (p) => !retentions.some((r) => r.player_id === p.id && r.status !== 'REJECTED')
  );

  // Search and filter players
  const filteredPlayers = unRetainedPlayers.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.mobile?.includes(q) ||
      p.playing_role?.toLowerCase().includes(q);

    const matchesRole =
      roleFilter === 'ALL' ||
      p.playing_role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const selectedPlayer = availablePlayers.find((p) => p.id === selectedPlayerId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner with Team Overview */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-extrabold text-blue-700 text-lg shrink-0">
            {team?.logo ? (
              <img src={team.logo} alt={team.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Shield className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {team?.name || 'Franchise Team'}
              </h1>
              <Badge variant="blue" size="sm">
                Team Captain
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Team Purse: <strong className="text-emerald-700 font-mono text-sm">{formatCurrency(team?.remaining_purse ?? 20000)}</strong> • Retention Slot: <strong>{activeRetentions.length} / {maxRetentions}</strong> (0 Points Deducted)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {allTeamsList.length > 1 && (
            <select
              value={selectedTeamId || team?.id || ''}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allTeamsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({formatCurrency(t.remaining_purse || 20000)})
                </option>
              ))}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={fetchData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Retention Slot Card */}
      <Card className={currentRetention ? 'border-blue-300 ring-1 ring-blue-100' : ''}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Official Franchise Retention Slot (1 Player Maximum)
            </span>
            <span className="text-[11px] text-slate-400">
              Retaining a player does not deduct any points from your 20,000 purse.
            </span>
          </div>

          <Badge
            variant={
              !currentRetention
                ? 'gray'
                : currentRetention.status === 'CONFIRMED'
                ? 'green'
                : currentRetention.status === 'REJECTED'
                ? 'red'
                : 'amber'
            }
            size="sm"
          >
            {!currentRetention
              ? 'OPEN'
              : currentRetention.status === 'CONFIRMED'
              ? 'CONFIRMED & RETAINED'
              : currentRetention.status === 'REJECTED'
              ? 'DECLINED'
              : 'AWAITING PLAYER CONFIRMATION'}
          </Badge>
        </div>

        {currentRetention ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3.5">
                <PlayerAvatar
                  src={currentRetention.photo}
                  name={currentRetention.full_name}
                  className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 border border-slate-200"
                  fallbackClassName="w-full h-full flex items-center justify-center font-bold text-slate-500 bg-blue-50"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{currentRetention.full_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{currentRetention.playing_role}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-mono">{currentRetention.email}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Cost: 0 Points (Free)
                </span>
              </div>
            </div>

            {/* Email Confirmation Status Box */}
            {currentRetention.status === 'PENDING_CONFIRMATION' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Confirmation email sent to {currentRetention.email}!</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  The player must click the confirmation link in their email to accept. Once confirmed, this slot will show as Confirmed.
                </p>
                {currentRetention.confirmation_token && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyConfirmationLink(currentRetention.confirmation_token)}
                      icon={copiedToken ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      className="text-xs py-1 px-2.5 bg-white border-amber-300 text-amber-900"
                    >
                      {copiedToken ? 'Link Copied!' : 'Copy Direct Confirmation Link'}
                    </Button>
                    <a
                      href={`https://wa.me/${currentRetention.mobile ? (currentRetention.mobile.startsWith('+91') || currentRetention.mobile.startsWith('91') ? currentRetention.mobile.replace(/[^0-9]/g, '') : '91' + currentRetention.mobile.replace(/[^0-9]/g, '')) : ''}?text=${encodeURIComponent(`Hello ${currentRetention.full_name}, franchise team ${team?.name || 'Mahakal XI'} has selected you for their Official Franchise Retention slot for PPL 2026! Please confirm your retention here: ${window.location.origin}/confirm-retention/${currentRetention.confirmation_token}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                    >
                      <span>Share on WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {currentRetention.status === 'CONFIRMED' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  Player confirmed and officially joined {team?.name || 'your franchise'}!
                </span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="danger"
                loading={releaseLoadingId === currentRetention.id}
                onClick={() => handleReleaseRetention(currentRetention.id, currentRetention.full_name)}
                icon={<Unlock className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Cancel / Release Retention
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Lock className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Retention Slot is Empty</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select any registered player below to send them your official franchise retention offer.
            </p>
          </div>
        )}
      </Card>

      {/* Retain Player Selection Form */}
      {canRetain && (
        <Card>
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Choose Player to Retain</h3>
                <p className="text-xs text-slate-500">
                  Search and select 1 player to retain. Retaining does not deduct any points from your 20,000 purse.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {filteredPlayers.length} Available Players
              </span>
            </div>

            {/* Search Input Bar */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Search Players
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type player name, email, role (e.g. Batsman), or mobile..."
                  className="w-full pl-9 pr-9 py-2.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['ALL', 'BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'].map((r) => {
                const label =
                  r === 'ALL'
                    ? 'All Roles'
                    : r === 'ALL_ROUNDER'
                    ? 'All-Rounder'
                    : r === 'WICKET_KEEPER'
                    ? 'Wicket Keeper'
                    : r.charAt(0) + r.slice(1).toLowerCase();
                const active = roleFilter === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded-full font-medium transition-all shrink-0 cursor-pointer text-xs ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search Results List */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 divide-y divide-slate-100">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <User className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                  No players match your search criteria.
                </div>
              ) : (
                filteredPlayers.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlayerId(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border border-blue-400 shadow-xs'
                          : 'bg-white hover:bg-blue-50/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          src={p.photo}
                          name={p.full_name}
                          className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200"
                          fallbackClassName="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{p.full_name}</span>
                            <Badge variant="blue" size="sm">
                              {p.playing_role === 'ALL_ROUNDER' ? 'All-Rounder' : p.playing_role}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {p.email} {p.mobile ? `• ${p.mobile}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Dropdown Fallback */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Or select directly from dropdown:
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="">-- Choose from Registered Players --</option>
                {unRetainedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.playing_role} • {p.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Submission Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                {selectedPlayer ? (
                  <span>
                    Selected: <strong className="text-blue-700">{selectedPlayer.full_name}</strong> ({selectedPlayer.playing_role})
                  </span>
                ) : (
                  <span className="text-slate-400">No player selected yet</span>
                )}
              </div>

              <Button
                size="sm"
                disabled={!selectedPlayerId}
                loading={loading}
                onClick={handleRetainPlayer}
                icon={<Mail className="w-3.5 h-3.5" />}
                className="text-xs w-full sm:w-auto"
              >
                {selectedPlayer
                  ? `Send Retention Offer to ${selectedPlayer.full_name}`
                  : 'Send Retention Offer to Player'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
