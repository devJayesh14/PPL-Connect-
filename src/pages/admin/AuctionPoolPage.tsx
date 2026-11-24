import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import {
  Layers,
  Shuffle,
  Filter,
  Search,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AuctionPoolPage: React.FC = () => {
  const auctionId = 'auc_default';
  const [players, setPlayers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Edit Player Modal
  const [editPlayer, setEditPlayer] = useState<any>(null);
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editOrder, setEditOrder] = useState('');

  const fetchPool = async () => {
    try {
      setLoading(true);
      let url = `/api/players/pool/${auctionId}?`;
      if (roleFilter) url += `role=${roleFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await fetch(url);
      if (res.ok) setPlayers(await res.json());

      const catRes = await fetch(`/api/auctions/${auctionId}`);
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPool();
  }, [auctionId, roleFilter, statusFilter, search]);

  const handleRandomize = async () => {
    if (!confirm('Randomize the auction calling order for all pending pool players?')) return;
    try {
      const res = await fetch(`/api/players/pool/${auctionId}/randomize`, { method: 'POST' });
      if (res.ok) {
        alert('Player calling order randomized!');
        fetchPool();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlayer) return;
    try {
      const res = await fetch(`/api/players/pool/${editPlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePrice: Number(editBasePrice),
          currentOrder: Number(editOrder),
        }),
      });
      if (res.ok) {
        setEditPlayer(null);
        fetchPool();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Auction Player Pool ({players.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage approved players scheduled for the hammer, customize calling sequences, or randomize order.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRandomize}
            icon={<Shuffle className="w-3.5 h-3.5 text-blue-600" />}
          >
            Randomize Order
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card noPadding>
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="">All Roles</option>
              <option value="BATSMAN">Batsman</option>
              <option value="BOWLER">Bowler</option>
              <option value="ALL_ROUNDER">All-Rounder</option>
              <option value="WICKET_KEEPER">Wicket Keeper</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending (In Queue)</option>
              <option value="IN_AUCTION">Active on Stage</option>
              <option value="SOLD">Sold</option>
              <option value="UNSOLD">Unsold</option>
            </select>
          </div>
        </div>

        {/* Mobile Player Pool Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100 bg-white">
          {players.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No players found in auction pool.
            </div>
          ) : (
            players.map((p) => (
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
                        {p.playing_role} • {p.is_overseas ? 'Overseas' : 'Domestic'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-blue-700 block">#{p.current_order}</span>
                    <Badge
                      variant={
                        p.status === 'SOLD'
                          ? 'green'
                          : p.status === 'IN_AUCTION'
                          ? 'blue'
                          : p.status === 'UNSOLD'
                          ? 'amber'
                          : 'gray'
                      }
                      size="sm"
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Badge variant="blue" size="sm">
                      {p.category_name || 'Standard'}
                    </Badge>
                    <span className="font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(p.base_price)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs py-1 px-2.5 h-7 border-slate-200"
                    onClick={() => {
                      setEditPlayer(p);
                      setEditBasePrice(p.base_price.toString());
                      setEditOrder(p.current_order.toString());
                    }}
                    icon={<Edit className="w-3 h-3" />}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Players Table (Desktop md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 w-16"># Order</th>
                <th className="px-6 py-3">Player Details</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Base Price</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {players.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-bold text-blue-700">
                    #{p.current_order}
                  </td>
                  <td className="px-6 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {p.photo ? (
                        <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                          {p.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{p.full_name}</div>
                      <span className="text-[10px] text-slate-400">
                        {p.batting_style} • {p.is_overseas ? 'Overseas' : 'Domestic'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{p.playing_role}</td>
                  <td className="px-6 py-3">
                    <Badge variant="blue" size="sm">
                      {p.category_name || 'Standard'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 font-bold text-slate-900">
                    {formatCurrency(p.base_price)}
                  </td>
                  <td className="px-6 py-3">
                    <Badge
                      variant={
                        p.status === 'SOLD'
                          ? 'green'
                          : p.status === 'IN_AUCTION'
                          ? 'blue'
                          : p.status === 'UNSOLD'
                          ? 'amber'
                          : 'gray'
                      }
                      size="sm"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => {
                        setEditPlayer(p);
                        setEditBasePrice(p.base_price.toString());
                        setEditOrder(p.current_order.toString());
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600"
                      title="Edit base price or order"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Order & Base Price Modal */}
      {editPlayer && (
        <Modal
          isOpen={!!editPlayer}
          onClose={() => setEditPlayer(null)}
          title={`Edit Pool Settings: ${editPlayer.full_name}`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Auction Calling Order Sequence
              </label>
              <input
                type="number"
                required
                value={editOrder}
                onChange={(e) => setEditOrder(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Player-Specific Base Price (₹)
              </label>
              <input
                type="number"
                required
                value={editBasePrice}
                onChange={(e) => setEditBasePrice(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditPlayer(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
