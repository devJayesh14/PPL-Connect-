import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import {
  Gavel,
  Plus,
  Radio,
  Share2,
  Calendar,
  Shield,
  Layers,
  Settings,
  Edit2,
  Trash2,
  Coins,
  TrendingUp,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AuctionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Create Auction Modal
  const [createModal, setCreateModal] = useState(false);
  const [newAuctionName, setNewAuctionName] = useState('');
  const [newTournamentId, setNewTournamentId] = useState('tour_ppl_2026');
  const [newAuctionDate, setNewAuctionDate] = useState('2026-12-15');
  const [newStartTime, setNewStartTime] = useState('10:00 AM');
  const [newBasePrice, setNewBasePrice] = useState('500');
  const [newBidIncrement, setNewBidIncrement] = useState('100');
  const [newPursePerTeam, setNewPursePerTeam] = useState('20000');
  const [newDescription, setNewDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Auction Modal
  const [editModal, setEditModal] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('500');
  const [editBidIncrement, setEditBidIncrement] = useState('100');
  const [editPurse, setEditPurse] = useState('20000');
  const [editStatus, setEditStatus] = useState('DRAFT');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Auction Modal
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Go Live Action Feedback
  const [goLiveModal, setGoLiveModal] = useState<any>(null);
  const [goLiveLoading, setGoLiveLoading] = useState(false);
  const [goLiveSuccess, setGoLiveSuccess] = useState<string | null>(null);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const [aucRes, tourRes] = await Promise.all([
        fetch('/api/auctions'),
        fetch('/api/tournaments'),
      ]);
      if (aucRes.ok) setAuctions(await aucRes.json());
      if (tourRes.ok) setTournaments(await tourRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const handleUpdateStatus = async (auctionId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchAuctions();
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Quick Create Auction
  const handleCreateAuctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuctionName) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: newTournamentId || 'tour_ppl_2026',
          name: newAuctionName.trim(),
          description: newDescription.trim() || 'Premier league sports player auction.',
          auctionDate: newAuctionDate,
          startTime: newStartTime,
          defaultBasePrice: Number(newBasePrice) || 500,
          bidIncrement: Number(newBidIncrement) || 100,
          totalPursePerTeam: Number(newPursePerTeam) || 20000,
          status: 'AUCTION_SCHEDULED',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create auction');

      setCreateModal(false);
      setNewAuctionName('');
      setNewDescription('');
      fetchAuctions();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating auction');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Auction Modal
  const openEdit = async (auc: any) => {
    setEditModal(auc);
    setEditName(auc.name || '');
    setEditDate(auc.auction_date || '');
    setEditStartTime(auc.start_time || '');
    setEditStatus(auc.status || 'DRAFT');

    // Fetch config for base price and increment
    try {
      const res = await fetch(`/api/auctions/${auc.id}`);
      if (res.ok) {
        const full = await res.json();
        setEditBasePrice(String(full.config?.default_base_price || 500));
        setEditBidIncrement(String(full.config?.bid_increment || 100));
        setEditPurse(String(full.config?.total_purse_per_team || 20000));
      }
    } catch (e) {
      console.error(e);
    }
    setEditError(null);
  };

  // Submit Edit Auction
  const handleEditAuctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/auctions/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          auctionDate: editDate,
          startTime: editStartTime,
          status: editStatus,
          defaultBasePrice: Number(editBasePrice),
          bidIncrement: Number(editBidIncrement),
          totalPursePerTeam: Number(editPurse),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update auction');

      setEditModal(null);
      fetchAuctions();
    } catch (err: any) {
      setEditError(err.message || 'Error updating auction');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Auction
  const handleDeleteAuction = async () => {
    if (!deleteModal) return;
    const deletedId = deleteModal.id;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/auctions/${deletedId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAuctions((prev) => prev.filter((a) => a.id !== deletedId));
        setDeleteModal(null);
        fetchAuctions();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Go Live: "give the option to live the auction and all the player who is registered they can participate in the auction"
  const handleGoLive = async (auction: any) => {
    setGoLiveModal(auction);
    setGoLiveLoading(true);
    setGoLiveSuccess(null);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/go-live`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start live auction');

      setGoLiveSuccess(data.message || 'Auction is now LIVE! Redirecting to live auction room...');
      fetchAuctions();

      // Redirect into live room
      setTimeout(() => {
        setGoLiveModal(null);
        navigate('/live-auction');
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Error launching live auction');
      setGoLiveModal(null);
    } finally {
      setGoLiveLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Gavel className="w-7 h-7 text-blue-600" />
            Auctions Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create auctions, configure base prices and bid increment rules, and launch real-time live bidding with all registered players.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setCreateError(null);
              setCreateModal(true);
            }}
            icon={<Plus className="w-4 h-4" />}
            size="sm"
            className="shadow-xs"
          >
            Create Auction
          </Button>

          <Link to="/auctions/create">
            <Button
              variant="outline"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
              className="bg-white hover:bg-slate-50 border-slate-300"
            >
              Multi-Step Wizard
            </Button>
          </Link>
        </div>
      </div>

      {/* Auction List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading auctions...
          </div>
        ) : auctions.length === 0 ? (
          <Card className="text-center p-12">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold">
                <Gavel className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Auctions Created Yet</h3>
              <p className="text-xs text-slate-500">
                Click "Create Auction" to set up your first auction, specify base prices and bid increment amounts, and start bidding.
              </p>
              <div className="pt-2">
                <Button size="sm" onClick={() => setCreateModal(true)}>
                  Create First Auction
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          auctions.map((auc) => (
            <Card key={auc.id} noPadding className="hover:border-blue-300 transition-all shadow-xs bg-white border-slate-200">
              <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <img src="/logo.png" alt="PPL" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 drop-shadow-xs" />
                  <div className="space-y-3 flex-1">
                    {/* Status Badges & Tournament Name */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          auc.status === 'LIVE'
                            ? 'blue'
                            : auc.status === 'COMPLETED'
                            ? 'green'
                            : 'navy'
                        }
                        dot={auc.status === 'LIVE'}
                        size="sm"
                      >
                        {auc.status}
                      </Badge>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                        Priyanka Premiere League
                      </span>
                      {auc.status === 'LIVE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                          LIVE NOW
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{auc.name}</h3>
                      <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider mt-0.5">
                        United We Play, United We Win!
                      </p>
                      {auc.description && (
                        <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{auc.description}</p>
                      )}
                    </div>

                    {/* Rules & Pricing Badges: Base Price, Bid Increment, Purse */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 border border-blue-100 text-xs font-semibold text-blue-800">
                        <Coins className="w-3.5 h-3.5 text-blue-600" />
                        <span>Base Price: ₹20,000</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/80 border border-emerald-100 text-xs font-semibold text-emerald-800">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Bid Increment: +₹5,000</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                        <span>Purse/Team: ₹10,00,000</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>All Registered Players Auto-Participate</span>
                      </div>
                    </div>

                    {/* Details Line */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{auc.auction_date} • {auc.start_time}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>{auc.team_count || 4} Participating Teams</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{auc.total_pool_players || 0} Pool ({auc.sold_players || 0} Sold, {auc.unsold_players || 0} Unsold)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side Action Buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end md:items-center gap-2.5 shrink-0">
                  {/* Option to GO LIVE / START AUCTION */}
                  {auc.status !== 'LIVE' ? (
                    <Button
                      size="sm"
                      onClick={() => handleGoLive(auc)}
                      icon={<PlayCircle className="w-4 h-4 text-white" />}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-bold"
                    >
                      GO LIVE / START AUCTION
                    </Button>
                  ) : (
                    <Link to="/live-auction">
                      <Button
                        size="sm"
                        icon={<Radio className="w-4 h-4 text-white animate-pulse" />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold"
                      >
                        ENTER LIVE AUCTION
                      </Button>
                    </Link>
                  )}

                  {/* Status Dropdown */}
                  <select
                    value={auc.status}
                    onChange={(e) => handleUpdateStatus(auc.id, e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="DRAFT">Status: DRAFT</option>
                    <option value="AUCTION_SCHEDULED">Status: SCHEDULED</option>
                    <option value="LIVE">Status: LIVE</option>
                    <option value="PAUSED">Status: PAUSED</option>
                    <option value="COMPLETED">Status: COMPLETED</option>
                  </select>

                  {/* Edit Auction */}
                  <button
                    onClick={() => openEdit(auc)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-blue-600"
                    title="Edit Auction Rules"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Share Link */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${auc.share_link}`);
                      alert('Auction public link copied to clipboard!');
                    }}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                    title="Copy Share Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  {/* Delete Auction */}
                  <button
                    onClick={() => setDeleteModal(auc)}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                    title="Delete Auction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ========================================================== */}
      {/* 1. QUICK CREATE AUCTION MODAL                              */}
      {/* ========================================================== */}
      {createModal && (
        <Modal
          isOpen={createModal}
          onClose={() => setCreateModal(false)}
          title="Create New Auction"
          description="Configure auction details, starting base prices, and bidding increments."
        >
          <form onSubmit={handleCreateAuctionSubmit} className="space-y-4">
            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Auction Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Surat Premier League 2026 Mega Auction"
                value={newAuctionName}
                onChange={(e) => setNewAuctionName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tournament
              </label>
              <select
                value={newTournamentId}
                onChange={(e) => setNewTournamentId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-medium"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Auction Date
                </label>
                <input
                  type="date"
                  required
                  value={newAuctionDate}
                  onChange={(e) => setNewAuctionDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time
                </label>
                <input
                  type="text"
                  required
                  placeholder="10:00 AM"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>
            </div>

            {/* BASE PRICE & BID INCREMENT CONFIGURATION */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-3">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                Bidding & Pricing Rules
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default Base Price (₹)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    required
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Starting price for players
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bid Increment (₹)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={newBidIncrement}
                    onChange={(e) => setNewBidIncrement(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Money increase per bid
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Purse Per Team (₹)
                </label>
                <input
                  type="number"
                  step="50000"
                  required
                  value={newPursePerTeam}
                  onChange={(e) => setNewPursePerTeam(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Brief notes about auction rules or sponsors..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={createLoading}>
                Create & Save Auction
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 2. EDIT AUCTION MODAL                                      */}
      {/* ========================================================== */}
      {editModal && (
        <Modal
          isOpen={!!editModal}
          onClose={() => setEditModal(null)}
          title={`Edit Auction: ${editModal.name}`}
          description="Update auction schedule, base pricing, and bid increments."
        >
          <form onSubmit={handleEditAuctionSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Auction Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <input
                  type="text"
                  required
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default Base Price (₹)
                </label>
                <input
                  type="number"
                  step="5000"
                  required
                  value={editBasePrice}
                  onChange={(e) => setEditBasePrice(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bid Increment (₹)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={editBidIncrement}
                  onChange={(e) => setEditBidIncrement(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purse Per Team (₹)
              </label>
              <input
                type="number"
                step="50000"
                required
                value={editPurse}
                onChange={(e) => setEditPurse(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Auction Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-medium"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="AUCTION_SCHEDULED">AUCTION_SCHEDULED</option>
                <option value="LIVE">LIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditModal(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={editLoading}>
                Save Auction
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 3. DELETE AUCTION MODAL                                    */}
      {/* ========================================================== */}
      {deleteModal && (
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Confirm Delete Auction"
          description={`Are you sure you want to delete "${deleteModal.name}"? This will permanently delete its configuration and auction pool.`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              This action cannot be undone. Bidding history, player assignments, and purse transactions linked to this auction will be cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteAuction} loading={deleteLoading}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 4. GO LIVE PROGRESS MODAL                                  */}
      {/* ========================================================== */}
      {goLiveModal && (
        <Modal
          isOpen={!!goLiveModal}
          onClose={() => {}}
          title="Launching Live Auction..."
          description={`Activating real-time bidding room for "${goLiveModal.name}".`}
        >
          <div className="space-y-4 py-4 text-center">
            {goLiveLoading ? (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs text-slate-600 font-medium">
                  Synchronizing all registered players into the active pool...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">{goLiveSuccess}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
