import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  Share2,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  User,
  Filter,
  Upload,
  X,
} from 'lucide-react';

export const PlayersPage: React.FC = () => {
  const auctionId = 'auc_default';
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [manualAddModal, setManualAddModal] = useState(false);
  const [shareLinkModal, setShareLinkModal] = useState(false);
  const [editPlayerModal, setEditPlayerModal] = useState<any>(null);
  const [deletePlayerModal, setDeletePlayerModal] = useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Manual Add Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [category, setCategory] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper'>('Batsman');
  const [basePrice, setBasePrice] = useState('500');
  const [photo, setPhoto] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File) => {
    const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE_BYTES) {
      setFormError(`Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 20MB limit. Please choose a smaller photo.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }
    setFormError(null);
    setPhotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setPhoto(compressed);
        } else {
          setPhoto(reader.result as string);
        }
      };
      img.onerror = () => setPhoto(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Share link feedback
  const [copied, setCopied] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editCategory, setEditCategory] = useState('Batsman');
  const [editBasePrice, setEditBasePrice] = useState('500');
  const [editPhoto, setEditPhoto] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchPlayers = async (page = currentPage, limit = pageSize) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('role', categoryFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/players/management?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPlayers(data);
          setTotalCount(data.length);
          setTotalPages(Math.ceil(data.length / limit) || 1);
        } else {
          setPlayers(data.players || []);
          setTotalCount(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.page || 1);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchPlayers(1, pageSize);
  }, [statusFilter, categoryFilter, search, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchPlayers(newPage, pageSize);
  };

  const handleUpdateApproval = async (playerId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(playerId);
    try {
      const res = await fetch(`/api/players/${playerId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update approval status');

      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, registration_status: status } : p))
      );
      setActionFeedback({
        type: 'success',
        message: status === 'APPROVED'
          ? 'Player approved successfully and admitted into the live auction pool!'
          : 'Player registration rejected.',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error updating status' });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const shareableUrl = `${window.location.origin}/register-player`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Submit Manual Add Player
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanEmail = email.trim().toLowerCase();

    // Client-side Duplicate Email check
    const duplicate = players.find(p => p.email && p.email.toLowerCase() === cleanEmail);
    if (duplicate) {
      setFormError('This email ID is already registered. Duplicate emails are not allowed.');
      return;
    }

    setAddLoading(true);

    try {
      const res = await fetch('/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: cleanEmail,
          mobile: mobile.trim(),
          photo: photo.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
          playingRole: category.toUpperCase().replace('-', '_'),
          basePrice: Number(basePrice) || 500,
          auctionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add player');
      }

      setFormSuccess(`Player "${fullName}" added successfully and enrolled into the live auction pool!`);
      // Reset form
      setFullName('');
      setEmail('');
      setMobile('');
      setPhoto('');
      setBasePrice('500');
      setCategory('Batsman');

      fetchPlayers();
      setTimeout(() => {
        setManualAddModal(false);
        setFormSuccess(null);
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Error creating player');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const openEdit = (player: any) => {
    setEditPlayerModal(player);
    setEditName(player.full_name || '');
    setEditEmail(player.email || '');
    setEditMobile(player.mobile || '');
    setEditPhoto(player.photo || '');
    setEditBasePrice(String(player.base_price || 500));
    setEditCategory(
      player.playing_role === 'BOWLER'
        ? 'Bowler'
        : player.playing_role === 'ALL_ROUNDER'
        ? 'All-Rounder'
        : player.playing_role === 'WICKET_KEEPER'
        ? 'Wicket Keeper'
        : 'Batsman'
    );
    setEditError(null);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlayerModal) return;
    const targetId = editPlayerModal.id || editPlayerModal.player_id;
    if (!targetId) {
      setEditError('Player ID could not be determined.');
      return;
    }
    setEditError(null);
    setEditLoading(true);

    try {
      const res = await fetch(`/api/players/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          mobile: editMobile.trim(),
          photo: editPhoto.trim(),
          playingRole: editCategory.toUpperCase().replace('-', '_'),
          basePrice: Number(editBasePrice) || 500,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update player');

      // Optimistic update in state
      setPlayers((prev) =>
        prev.map((p) =>
          (p.id === targetId || p.player_id === targetId)
            ? {
                ...p,
                full_name: editName.trim(),
                email: editEmail.trim().toLowerCase(),
                mobile: editMobile.trim(),
                photo: editPhoto.trim(),
                playing_role: editCategory.toUpperCase().replace('-', '_'),
                base_price: Number(editBasePrice) || 500,
              }
            : p
        )
      );

      setActionFeedback({ type: 'success', message: `Player "${editName}" updated successfully!` });
      setTimeout(() => setActionFeedback(null), 3500);
      setEditPlayerModal(null);
    } catch (err: any) {
      setEditError(err.message || 'Error updating player');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Player
  const handleDeletePlayer = async () => {
    if (!deletePlayerModal) return;
    const targetId = deletePlayerModal.id || deletePlayerModal.player_id;
    if (!targetId) return;

    try {
      const res = await fetch(`/api/players/${targetId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPlayers((prev) => prev.filter((p) => p.id !== targetId && p.player_id !== targetId));
        setActionFeedback({ type: 'success', message: 'Player removed successfully.' });
        setTimeout(() => setActionFeedback(null), 3500);
        setDeletePlayerModal(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete player');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Players
  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.mobile || '').includes(search);

    if (!matchesSearch) return false;

    if (categoryFilter !== 'ALL') {
      const role = (p.playing_role || '').toUpperCase();
      if (role !== categoryFilter) return false;
    }

    if (statusFilter !== 'ALL') {
      const regStatus = p.registration_status || 'PENDING';
      if (regStatus !== statusFilter) return false;
    }

    return true;
  });

  const pendingCount = players.filter((p) => (p.registration_status || 'PENDING') === 'PENDING').length;
  const approvedCount = players.filter((p) => p.registration_status === 'APPROVED').length;
  const rejectedCount = players.filter((p) => p.registration_status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Top Header & 2 Primary Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Player Management & Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review player registrations, approve or reject players into the live auction pool, or add players manually.
          </p>
        </div>

        {/* 2 User Options: 1. Manual Add Player, 2. Share Link */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              setManualAddModal(true);
            }}
            icon={<UserPlus className="w-4 h-4" />}
            size="sm"
            className="shadow-xs text-xs"
          >
            Manual Add Player
          </Button>

          <Button
            onClick={() => setShareLinkModal(true)}
            variant="outline"
            icon={<Share2 className="w-4 h-4" />}
            size="sm"
            className="bg-white hover:bg-slate-50 border-slate-300 text-xs"
          >
            Share Link
          </Button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Players</span>
            <span className="text-xl font-extrabold text-slate-900">{players.length}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            {players.length}
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-xs flex items-center justify-between ${pendingCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pending Review</span>
            <span className={`text-xl font-extrabold ${pendingCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{pendingCount}</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${pendingCount > 0 ? 'bg-amber-200 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
            {pendingCount > 0 ? `${pendingCount} NEED ACTION` : '0'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Approved in Pool</span>
            <span className="text-xl font-extrabold text-emerald-700">{approvedCount}</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">POOL</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Rejected</span>
            <span className="text-xl font-extrabold text-rose-700">{rejectedCount}</span>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700">REJ</span>
        </div>
      </div>

      {/* Approval Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Players ({players.length})
        </button>

        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
          }`}
        >
          {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          Pending Approval ({pendingCount})
        </button>

        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          Approved & In Pool ({approvedCount})
        </button>

        <button
          onClick={() => setStatusFilter('REJECTED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100'
          }`}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <Card noPadding>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-500 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg py-2 px-3 bg-white text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="BATSMAN">Batsman</option>
              <option value="BOWLER">Bowler</option>
              <option value="ALL_ROUNDER">All-Rounder</option>
              <option value="WICKET_KEEPER">Wicket Keeper</option>
            </select>
          </div>
        </div>

        {/* Mobile Player Cards View (visible on < md) */}
        <div className="md:hidden divide-y divide-slate-100 bg-white">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading registered players...
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No players found matching your criteria.
            </div>
          ) : (
            filteredPlayers.map((p, idx) => {
              const regStatus = p.registration_status || 'PENDING';
              return (
                <div key={p.id || p.player_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {p.photo ? (
                          <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-blue-50 text-blue-600">
                            {p.full_name ? p.full_name.charAt(0) : 'P'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">{p.full_name}</div>
                        <span className="text-[11px] text-slate-500 font-mono truncate block">{p.email}</span>
                        {p.mobile && <span className="text-[11px] text-slate-500 font-mono block">{p.mobile}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge
                        variant={
                          regStatus === 'APPROVED'
                            ? 'green'
                            : regStatus === 'REJECTED'
                            ? 'red'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {regStatus === 'APPROVED' ? 'Approved' : regStatus === 'REJECTED' ? 'Rejected' : 'Pending'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          p.playing_role === 'BATSMAN'
                            ? 'blue'
                            : p.playing_role === 'BOWLER'
                            ? 'navy'
                            : p.playing_role === 'ALL_ROUNDER'
                            ? 'green'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {p.playing_role === 'ALL_ROUNDER'
                          ? 'All-Rounder'
                          : p.playing_role === 'WICKET_KEEPER'
                          ? 'Wicket Keeper'
                          : p.playing_role === 'BOWLER'
                          ? 'Bowler'
                          : 'Batsman'}
                      </Badge>
                      <span className="font-semibold text-slate-700 font-mono text-xs">
                        {formatCurrency(p.base_price || p.registered_base_price || 500)}
                      </span>
                    </div>

                    {/* Quick Approval / Rejection Controls on Mobile */}
                    <div className="flex items-center gap-1.5">
                      {regStatus === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateApproval(p.id, 'APPROVED')}
                            loading={actionLoadingId === p.id}
                            icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 h-8 font-bold"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleUpdateApproval(p.id, 'REJECTED')}
                            loading={actionLoadingId === p.id}
                            icon={<XCircle className="w-3.5 h-3.5" />}
                            className="text-xs py-1 px-2.5 h-8 font-bold"
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {regStatus === 'APPROVED' && (
                        <button
                          onClick={() => handleUpdateApproval(p.id, 'REJECTED')}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg"
                        >
                          Reject
                        </button>
                      )}

                      {regStatus === 'REJECTED' && (
                        <button
                          onClick={() => handleUpdateApproval(p.id, 'APPROVED')}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg"
                        >
                          Approve
                        </button>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs py-1 px-2 h-8 border-slate-200"
                        onClick={() => openEdit(p)}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="text-xs py-1 px-2 h-8"
                        onClick={() => setDeletePlayerModal(p)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Players List Table (visible on desktop md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">#</th>
                <th className="px-6 py-3.5">Player Details</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">Base Price</th>
                <th className="px-6 py-3.5">Approval Status</th>
                <th className="px-6 py-3.5 text-right">Review & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading registered players...
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No Players Found</h3>
                      <p className="text-xs text-slate-500">
                        {players.length === 0
                          ? 'No players have been registered yet. Add a player manually or share the registration link!'
                          : 'No players match your search and approval filters.'}
                      </p>
                      {players.length === 0 && (
                        <div className="pt-2 flex justify-center gap-2">
                          <Button size="sm" onClick={() => setManualAddModal(true)}>
                            Add First Player
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShareLinkModal(true)}>
                            Share Link
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((p, idx) => {
                  const regStatus = p.registration_status || 'PENDING';
                  return (
                    <tr key={p.id || p.player_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 text-slate-400 font-mono font-medium">
                        #{idx + 1}
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            {p.photo ? (
                              <img src={p.photo} alt={p.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-blue-50 text-blue-600">
                                {p.full_name ? p.full_name.charAt(0) : 'P'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.full_name}</div>
                            <span className="text-[11px] text-slate-500 font-mono">{p.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            p.playing_role === 'BATSMAN'
                              ? 'blue'
                              : p.playing_role === 'BOWLER'
                              ? 'navy'
                              : p.playing_role === 'ALL_ROUNDER'
                              ? 'green'
                              : 'amber'
                          }
                          size="sm"
                        >
                          {p.playing_role === 'ALL_ROUNDER'
                            ? 'All-Rounder'
                            : p.playing_role === 'WICKET_KEEPER'
                            ? 'Wicket Keeper'
                            : p.playing_role === 'BOWLER'
                            ? 'Bowler'
                            : 'Batsman'}
                        </Badge>
                      </td>

                      <td className="px-6 py-3.5 text-slate-600">
                        <span className="font-mono text-xs">{p.mobile || '—'}</span>
                      </td>

                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {formatCurrency(p.base_price || p.registered_base_price || 500)}
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            regStatus === 'APPROVED'
                              ? 'green'
                              : regStatus === 'REJECTED'
                              ? 'red'
                              : 'amber'
                          }
                          size="sm"
                        >
                          {regStatus === 'APPROVED'
                            ? 'Approved & In Pool'
                            : regStatus === 'REJECTED'
                            ? 'Rejected'
                            : 'Pending Approval'}
                        </Badge>
                        {p.is_sold > 0 && (
                          <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                            Sold in Auction
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approval Controls */}
                          {regStatus === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateApproval(p.id, 'APPROVED')}
                                loading={actionLoadingId === p.id}
                                icon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 h-7 font-bold shadow-xs"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleUpdateApproval(p.id, 'REJECTED')}
                                loading={actionLoadingId === p.id}
                                icon={<XCircle className="w-3.5 h-3.5" />}
                                className="text-xs py-1 px-2 h-7 font-bold"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {regStatus === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateApproval(p.id, 'REJECTED')}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md"
                              title="Revoke Approval"
                            >
                              Reject
                            </button>
                          )}

                          {regStatus === 'REJECTED' && (
                            <button
                              onClick={() => handleUpdateApproval(p.id, 'APPROVED')}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-md"
                              title="Re-Approve Player"
                            >
                              Approve
                            </button>
                          )}

                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Player"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletePlayerModal(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium text-center sm:text-left">
            Showing <span className="font-bold text-slate-800">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
            <span className="font-bold text-slate-800">{totalCount}</span> players
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-slate-500 font-medium text-xs">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
              className="px-2.5 py-1 text-xs bg-white"
            >
              Previous
            </Button>

            <span className="px-2.5 py-1 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
              Page {currentPage} of {Math.max(1, totalPages)}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
              className="px-2.5 py-1 text-xs bg-white"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* ========================================================== */}
      {/* OPTION 1: MANUAL ADD PLAYER MODAL                          */}
      {/* ========================================================== */}
      {manualAddModal && (
        <Modal
          isOpen={manualAddModal}
          onClose={() => setManualAddModal(false)}
          title="Manual Add Player"
          description="Register a player directly into the system. All registered players automatically join the auction pool."
        >
          <form onSubmit={handleManualAddSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <strong className="block font-semibold">Registration Blocked:</strong>
                  <span>{formError}</span>
                </div>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Photo preview & 20MB File Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Player Photo <span className="text-slate-400 font-normal">(Max 20MB)</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageFile(f);
                }}
                className="hidden"
              />

              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-300 shrink-0">
                  {photo ? (
                    <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
                      className="text-xs py-1 px-2.5 bg-white border-slate-300"
                    >
                      Upload Photo
                    </Button>

                    {photo && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhoto('');
                          setPhotoFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500">
                    {photoFileName ? photoFileName : 'Supports JPEG, PNG, WEBP up to 20MB'}
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Virat Kohli"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Email (Strict Duplicate Check) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
                <span className="ml-1 text-[11px] text-slate-400 font-normal">
                  (Duplicate emails strictly not allowed)
                </span>
              </label>
              <input
                type="email"
                required
                placeholder="player@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Playing Category Dropdown (Base Price is removed, defaults to auction rule) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Playing Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-500"
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket Keeper">Wicket Keeper</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setManualAddModal(false)}
              >
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={addLoading}>
                Add to Auction Pool
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* OPTION 2: SHARE REGISTRATION LINK MODAL                    */}
      {/* ========================================================== */}
      {shareLinkModal && (
        <Modal
          isOpen={shareLinkModal}
          onClose={() => setShareLinkModal(false)}
          title="Share Player Registration Link"
          description="Send this link to players to self-register. Registered players immediately enter the live auction pool."
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <strong className="block font-semibold">Self-Registration & Participation:</strong>
                <span>
                  No admin approval required. Players fill out their Name, Email, Mobile, Category (Batsman, Bowler, All-Rounder, Wicket Keeper), and Photo, and are instantly added to the live auction.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Shareable Registration Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="flex-1 text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 font-mono font-medium selection:bg-blue-100"
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  icon={copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  className={copied ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800">Quick Player Access:</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Strict duplicate email check prevents duplicate entries.</li>
                <li>Players can access live auction and track bids directly.</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShareLinkModal(false)}
              >
                Done
              </Button>
              <a href={shareableUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" icon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Preview Link
                </Button>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* EDIT PLAYER MODAL                                          */}
      {/* ========================================================== */}
      {editPlayerModal && (
        <Modal
          isOpen={!!editPlayerModal}
          onClose={() => setEditPlayerModal(null)}
          title={`Edit Player: ${editPlayerModal.full_name}`}
          description="Update player details, role category, or base price."
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
              <input
                type="text"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket Keeper">Wicket Keeper</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  step="5000"
                  value={editBasePrice}
                  onChange={(e) => setEditBasePrice(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditPlayerModal(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={editLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* DELETE PLAYER CONFIRMATION MODAL                           */}
      {/* ========================================================== */}
      {deletePlayerModal && (
        <Modal
          isOpen={!!deletePlayerModal}
          onClose={() => setDeletePlayerModal(null)}
          title="Confirm Delete Player"
          description={`Are you sure you want to delete ${deletePlayerModal.full_name}? This will remove them from the auction pool.`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              This action cannot be undone. Any bids or squad history for this player will also be removed.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setDeletePlayerModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeletePlayer}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
