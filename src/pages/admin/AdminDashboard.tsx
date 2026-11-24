import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import {
  Trophy,
  Gavel,
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Wallet,
  ArrowRight,
  Plus,
  Radio,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, auctionsRes] = await Promise.all([
        fetch('/api/auctions/stats/summary'),
        fetch('/api/auctions'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (auctionsRes.ok) {
        const auctionsData = await auctionsRes.json();
        setAuctions(auctionsData);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Header with Official Crest */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="Priyanka Premiere League"
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 drop-shadow"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                Priyanka Premiere League
              </h1>
              <Badge variant="blue" size="sm" className="hidden xs:inline-flex bg-blue-50 text-blue-700 border-blue-200 font-bold">
                Admin Console
              </Badge>
            </div>
            <p className="text-xs font-black text-amber-600 uppercase tracking-wide mt-0.5">
              ★ United We Play, United We Win! ★
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise management portal for tournaments, real-time live bidding, purse compliance, and squads.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            className="text-xs"
          >
            Refresh
          </Button>
          <Link to="/auctions/create">
            <Button size="sm" icon={<Plus className="w-4 h-4" />} className="text-xs">
              Create Auction
            </Button>
          </Link>
          <Link to="/live-auction">
            <Button size="sm" variant="outline" icon={<Radio className="w-4 h-4 text-blue-600 animate-pulse" />} className="text-xs">
              Live Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid (Section 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Tournaments"
          value={stats?.totalTournaments ?? '—'}
          subtitle="Managed championships"
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatCard
          title="Active Live Auctions"
          value={stats?.activeAuctions ?? '—'}
          subtitle="Real-time live rooms"
          highlight={stats?.activeAuctions > 0}
          icon={<Radio className="w-5 h-5 text-blue-600 animate-pulse" />}
        />
        <StatCard
          title="Upcoming Auctions"
          value={stats?.upcomingAuctions ?? '—'}
          subtitle="Scheduled & registration"
          icon={<Gavel className="w-5 h-5" />}
        />
        <StatCard
          title="Total Teams"
          value={stats?.totalTeams ?? '—'}
          subtitle="Across all tournaments"
          icon={<Shield className="w-5 h-5" />}
        />
        <StatCard
          title="Registered Players"
          value={stats?.totalRegisteredPlayers ?? '—'}
          subtitle="Global player database"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Sold Players"
          value={stats?.soldPlayers ?? '—'}
          subtitle="Successfully acquired"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Unsold Players"
          value={stats?.unsoldPlayers ?? '—'}
          subtitle="Eligible for re-auction"
          icon={<XCircle className="w-5 h-5 text-slate-500" />}
        />
        <StatCard
          title="Total Spent / Remaining"
          value={formatCompactCurrency(stats?.totalAmountSpent)}
          subtitle={`Remaining: ${formatCompactCurrency(stats?.totalRemainingPurse)}`}
          icon={<Wallet className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Quick Access Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/auctions/create"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-card transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">
            9-Step Create Auction
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Configure purse, base price, squad limits & retention rules.
          </p>
        </Link>

        <Link
          to="/live-auction"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-card transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Radio className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">
            Live Auction Control Room
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Real-time auctioneer console with instant bidding & hammer controls.
          </p>
        </Link>

        <Link
          to="/final-squads"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-card transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">
            Final Squads & Sync
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Review rosters and connect auction results to Tournament teams.
          </p>
        </Link>

        <Link
          to="/reports"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-card transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">
            Analytics & Reports
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Export comprehensive auction summaries in CSV, Excel, and PDF.
          </p>
        </Link>
      </div>

      {/* Active Auctions Table */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active & Recent Auctions</h3>
              <p className="text-xs text-slate-500">Monitor auction progression and status</p>
            </div>
            <Link to="/auctions" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Auction Name</th>
                <th className="px-6 py-3">Tournament</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Teams</th>
                <th className="px-6 py-3">Pool / Sold</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {auctions.map((auc) => (
                <tr key={auc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <Link to={`/auction/${auc.id}/live`} className="hover:text-blue-600">
                      {auc.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{auc.tournament_name || 'Tournament'}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {auc.auction_date} • {auc.start_time}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        auc.status === 'LIVE'
                          ? 'blue'
                          : auc.status === 'COMPLETED'
                          ? 'green'
                          : 'navy'
                      }
                      dot={auc.status === 'LIVE'}
                    >
                      {auc.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {auc.team_count || 0} teams
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {auc.total_pool_players || 0} pool / <span className="font-bold text-emerald-600">{auc.sold_players || 0} sold</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/live-auction">
                        <Button size="sm" variant="outline" className="text-xs py-1">
                          Live Control
                        </Button>
                      </Link>
                      <Link to={`/auction/${auc.share_link.replace('/auction/', '')}`}>
                        <Button size="sm" variant="secondary" className="text-xs py-1">
                          Public View
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
