import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import { Shield, Wallet, Users, Radio, Lock, FileSpreadsheet, ArrowRight } from 'lucide-react';

export const CaptainDashboard: React.FC = () => {
  const { currentTeamId, availableTeams } = useAuth();
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = async () => {
    if (!currentTeamId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/teams/${currentTeamId}`);
      if (res.ok) {
        setTeamData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [currentTeamId]);

  const currentTeam = availableTeams.find((t) => t.id === currentTeamId);
  const squad = teamData?.squad || [];
  const retentions = squad.filter((p: any) => p.acquisition_type === 'RETENTION');
  const auctionPurchases = squad.filter((p: any) => p.acquisition_type === 'AUCTION');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-lg sm:text-xl font-black text-white shadow-xs shrink-0"
            style={{ backgroundColor: teamData?.color || '#2563EB' }}
          >
            {teamData?.shortName || currentTeam?.shortName || 'TM'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {teamData?.name || currentTeam?.name || 'My Team'}
              </h1>
              <Badge variant="blue" size="sm">
                Team Captain
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Captain: <strong className="text-slate-800">{teamData?.captainName || 'You'}</strong> • Franchise Overview
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Link to="/captain/retentions" className="flex-1 sm:flex-none">
            <Button size="sm" variant="secondary" icon={<Lock className="w-3.5 h-3.5" />} className="w-full sm:w-auto text-xs">
              Retentions
            </Button>
          </Link>
          <Link to="/captain/live" className="flex-1 sm:flex-none">
            <Button size="sm" icon={<Radio className="w-3.5 h-3.5 animate-pulse" />} className="w-full sm:w-auto text-xs">
              Live Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Initial Purse
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(teamData?.initialPurse || 20000)}
          </h3>
          <span className="text-[11px] text-slate-500">Allocated budget</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Spent Purse
          </span>
          <h3 className="text-xl font-extrabold text-slate-700 mt-1">
            {formatCurrency(teamData?.spentPurse || 0)}
          </h3>
          <span className="text-[11px] text-slate-500">
            {retentions.length} retained, {auctionPurchases.length} bought
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card ring-1 ring-blue-200">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Remaining Purse
          </span>
          <h3 className="text-xl font-extrabold text-blue-700 mt-1">
            {formatCurrency(teamData?.remainingPurse || 20000)}
          </h3>
          <span className="text-[11px] text-slate-500">Available for bidding</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Squad Composition
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 mt-1">
            {squad.length} Players
          </h3>
          <span className="text-[11px] text-slate-500">Target: 11 - 15 players</span>
        </div>
      </div>

      {/* Team Squad Roster */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Team Squad ({squad.length})</h3>
              <p className="text-xs text-slate-500">Retained players and auction acquisitions</p>
            </div>
            <Link to="/final-squads" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>View All Teams</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
        noPadding
      >
        {squad.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No players in squad yet. Retain players or bid in the Live Auction!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Acquired Price</th>
                  <th className="px-6 py-3">Styles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {squad.map((player: any) => (
                  <tr key={player.player_id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        {player.photo ? (
                          <img src={player.photo} alt={player.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                            {player.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-slate-900">{player.full_name}</span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{player.playing_role}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={player.acquisition_type === 'RETENTION' ? 'navy' : 'blue'} size="sm">
                        {player.acquisition_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {formatCurrency(player.price)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {player.batting_style} • {player.bowling_style}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
