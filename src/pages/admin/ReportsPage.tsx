import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Award,
  Wallet,
  Users,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const auctionId = 'auc_default';
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'purchases' | 'spending' | 'sold' | 'unsold' | 'bids'>('purchases');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${auctionId}/summary`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [auctionId]);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500">Loading auction analytics and reports...</div>;
  }

  // Export handlers
  const handleExportCSV = () => {
    if (activeTab === 'purchases' || activeTab === 'sold') {
      const rows = data.soldPlayers.map((p: any) => ({
        'Player Name': p.full_name,
        Role: p.playing_role,
        Category: p.category_name,
        'Base Price': p.base_price,
        'Sold Price': p.final_bid,
        'Winning Team': p.winning_team_name,
        'Total Bids': p.bid_count,
        'Sold Time': p.sold_at,
      }));
      exportToCSV('PCL_2026_Player_Purchases', rows);
    } else if (activeTab === 'spending') {
      const rows = data.teams.map((t: any) => ({
        Team: t.name,
        Captain: t.captain_name,
        'Initial Purse': t.initial_purse,
        'Total Spent': t.spent_purse,
        'Remaining Purse': t.remaining_purse,
        'Total Squad': t.total_players,
        Retained: t.retained_count,
      }));
      exportToCSV('PCL_2026_Team_Spending', rows);
    } else if (activeTab === 'bids') {
      const rows = data.bidHistory.map((b: any) => ({
        Player: b.player_name,
        Team: b.team_name,
        'Bid Amount': b.bid_amount,
        Timestamp: b.timestamp,
      }));
      exportToCSV('PCL_2026_Bid_History', rows);
    } else {
      const rows = data.unsoldPlayers.map((p: any) => ({
        'Player Name': p.full_name,
        Role: p.playing_role,
        Category: p.category_name,
        'Base Price': p.base_price,
      }));
      exportToCSV('PCL_2026_Unsold_Players', rows);
    }
  };

  const handleExportPDF = () => {
    if (activeTab === 'purchases' || activeTab === 'sold') {
      const headers = ['Player', 'Role', 'Winning Team', 'Final Price'];
      const rows = data.soldPlayers.map((p: any) => [
        p.full_name,
        p.playing_role,
        p.winning_team_name,
        formatCurrency(p.final_bid),
      ]);
      exportToPDF('Player Purchases Report', 'PCL_Player_Purchases', headers, rows);
    } else if (activeTab === 'spending') {
      const headers = ['Team', 'Total Spent', 'Remaining Purse', 'Squad'];
      const rows = data.teams.map((t: any) => [
        t.name,
        formatCurrency(t.spent_purse),
        formatCurrency(t.remaining_purse),
        `${t.total_players} players`,
      ]);
      exportToPDF('Team Spending & Purse Report', 'PCL_Team_Spending', headers, rows);
    } else {
      const headers = ['Player', 'Team', 'Bid Amount', 'Time'];
      const rows = data.bidHistory.slice(0, 50).map((b: any) => [
        b.player_name,
        b.team_name,
        formatCurrency(b.bid_amount),
        formatDateTime(b.timestamp),
      ]);
      exportToPDF('Complete Bid History Log', 'PCL_Bid_History', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Auction Reports & Audit Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Export comprehensive auction summaries, player sales, purse utilization, and live audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5 text-slate-600" />}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (activeTab === 'spending') {
                exportToExcel('PCL_2026_Spending', 'Spending', data.teams);
              } else {
                exportToExcel('PCL_2026_Purchases', 'Purchases', data.soldPlayers);
              }
            }}
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />}
          >
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            icon={<FileText className="w-3.5 h-3.5" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Top Highlights Banner (Section 31) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Most Expensive Player
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            {data.mostExpensive?.full_name || 'None'}
          </h3>
          <p className="text-xs font-semibold text-blue-700">
            {data.mostExpensive ? `${formatCurrency(data.mostExpensive.final_bid)} • ${data.mostExpensive.winning_team_name}` : '—'}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Highest Bid Placed
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            {data.highestBidRecord ? formatCurrency(data.highestBidRecord.bid_amount) : '—'}
          </h3>
          <p className="text-xs text-slate-500">
            {data.highestBidRecord ? `${data.highestBidRecord.team_name} for ${data.highestBidRecord.player_name}` : '—'}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Bids Logged
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            {data.totalBidsPlaced} Bids
          </h3>
          <p className="text-xs text-slate-500">
            Across {data.soldPlayers.length} sold & {data.unsoldPlayers.length} unsold players
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Player Purchases ({data.soldPlayers.length})
        </button>

        <button
          onClick={() => setActiveTab('spending')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'spending'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Team Spending & Purses ({data.teams.length})
        </button>

        <button
          onClick={() => setActiveTab('unsold')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'unsold'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Unsold Players ({data.unsoldPlayers.length})
        </button>

        <button
          onClick={() => setActiveTab('bids')}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === 'bids'
              ? 'border-b-2 border-blue-600 text-blue-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Full Bid History Log ({data.totalBidsPlaced})
        </button>
      </div>

      {/* Tab Content Tables */}
      <Card noPadding>
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Base Price</th>
                  <th className="px-6 py-3">Winning Team</th>
                  <th className="px-6 py-3">Sold Price</th>
                  <th className="px-6 py-3">Bids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.soldPlayers.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-900">{p.full_name}</td>
                    <td className="px-6 py-3 text-slate-600">{p.playing_role}</td>
                    <td className="px-6 py-3">
                      <Badge variant="blue" size="sm">
                        {p.category_name || 'Standard'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{formatCurrency(p.base_price)}</td>
                    <td className="px-6 py-3 font-semibold text-blue-700">{p.winning_team_name}</td>
                    <td className="px-6 py-3 font-extrabold text-slate-900">{formatCurrency(p.final_bid)}</td>
                    <td className="px-6 py-3 text-slate-500">{p.bid_count || 1} bids</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'spending' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Team Name</th>
                  <th className="px-6 py-3">Captain</th>
                  <th className="px-6 py-3">Initial Purse</th>
                  <th className="px-6 py-3">Total Spent</th>
                  <th className="px-6 py-3">Remaining Purse</th>
                  <th className="px-6 py-3">Squad Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.teams.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-900">{t.name}</td>
                    <td className="px-6 py-3 text-slate-600">{t.captain_name || 'Assigned'}</td>
                    <td className="px-6 py-3 text-slate-600">{formatCurrency(t.initial_purse)}</td>
                    <td className="px-6 py-3 font-bold text-slate-800">{formatCurrency(t.spent_purse)}</td>
                    <td className="px-6 py-3 font-extrabold text-blue-700">{formatCurrency(t.remaining_purse)}</td>
                    <td className="px-6 py-3 text-slate-600">{t.total_players} players ({t.retained_count} ret.)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'unsold' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Base Price</th>
                  <th className="px-6 py-3">Re-Auction Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.unsoldPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                      No unsold players in this auction yet.
                    </td>
                  </tr>
                ) : (
                  data.unsoldPlayers.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-slate-900">{p.full_name}</td>
                      <td className="px-6 py-3 text-slate-600">{p.playing_role}</td>
                      <td className="px-6 py-3">
                        <Badge variant="gray" size="sm">
                          {p.category_name || 'Standard'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{formatCurrency(p.base_price)}</td>
                      <td className="px-6 py-3 text-slate-500">{p.reauction_count} / 2 attempts</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bids' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Team</th>
                  <th className="px-6 py-3">Captain</th>
                  <th className="px-6 py-3">Bid Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.bidHistory.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(b.timestamp)}
                    </td>
                    <td className="px-6 py-2.5 font-bold text-slate-900">{b.player_name}</td>
                    <td className="px-6 py-2.5 font-semibold text-blue-700">{b.team_name}</td>
                    <td className="px-6 py-2.5 text-slate-500">{b.captain_name || 'Captain'}</td>
                    <td className="px-6 py-2.5 font-extrabold text-slate-900">{formatCurrency(b.bid_amount)}</td>
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
