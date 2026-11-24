import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import {
  Shield,
  Plus,
  Wallet,
  Edit2,
  Trash2,
  Users,
  Lock,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Search,
  Sparkles,
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Team Modal State
  const [createModal, setCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newColor, setNewColor] = useState('#2563EB');
  const [newInitialPurse, setNewInitialPurse] = useState('20000');
  const [newLogo, setNewLogo] = useState('');
  const [newCaptainPlayerId, setNewCaptainPlayerId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Team Modal State
  const [editModal, setEditModal] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [editColor, setEditColor] = useState('#2563EB');
  const [editLogo, setEditLogo] = useState('');
  const [editPurse, setEditPurse] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Team Modal State
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Assign Captain Modal State (Super Admin Decision)
  const [assignCaptainModal, setAssignCaptainModal] = useState<any>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [customCaptainName, setCustomCaptainName] = useState('');
  const [customCaptainEmail, setCustomCaptainEmail] = useState('');
  const [customCaptainMobile, setCustomCaptainMobile] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Adjust Purse Modal State
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchTeamsAndPlayers = async () => {
    try {
      setLoading(true);
      const [teamsRes, playersRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/players'),
      ]);
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (playersRes.ok) setRegisteredPlayers(await playersRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndPlayers();
  }, []);

  // Handle Create Team Submit
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;
    setCreateLoading(true);
    setCreateError(null);

    try {
      // Find captain if selected
      const selectedPlayer = registeredPlayers.find((p) => p.id === newCaptainPlayerId);

      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: 'tour_ppl_2026',
          auctionId: 'auc_default',
          name: newTeamName.trim(),
          shortName: (newShortName || newTeamName.substring(0, 3)).toUpperCase().trim(),
          color: newColor,
          logo: newLogo,
          initialPurse: Number(newInitialPurse) || 20000,
          captainName: selectedPlayer?.full_name,
          captainEmail: selectedPlayer?.email,
          captainMobile: selectedPlayer?.mobile,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');

      setCreateModal(false);
      setNewTeamName('');
      setNewShortName('');
      setNewLogo('');
      setNewCaptainPlayerId('');
      fetchTeamsAndPlayers();
    } catch (err: any) {
      setCreateError(err.message || 'Error creating team');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Team Modal
  const openEditTeam = (team: any) => {
    setEditModal(team);
    setEditName(team.name || '');
    setEditShortName(team.short_name || '');
    setEditColor(team.color || '#2563EB');
    setEditLogo(team.logo || '');
    setEditPurse(String(team.remaining_purse || 20000));
    setEditError(null);
  };

  // Handle Edit Team Submit
  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/teams/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          shortName: editShortName,
          color: editColor,
          logo: editLogo,
          remainingPurse: Number(editPurse),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update team');

      setEditModal(null);
      fetchTeamsAndPlayers();
    } catch (err: any) {
      setEditError(err.message || 'Error updating team');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async () => {
    if (!deleteModal) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/teams/${deleteModal.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteModal(null);
        fetchTeamsAndPlayers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Assign Captain Modal
  const openAssignCaptain = (team: any) => {
    setAssignCaptainModal(team);
    setSelectedPlayerId('');
    setCustomCaptainName(team.captain_name || '');
    setCustomCaptainEmail(team.captain_email || '');
    setCustomCaptainMobile(team.captain_mobile || '');
    setAssignError(null);
  };

  // Handle Super Admin Assigns Captain
  const handleAssignCaptainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCaptainModal) return;
    setAssignLoading(true);
    setAssignError(null);

    try {
      const selectedPlayer = registeredPlayers.find((p) => p.id === selectedPlayerId);

      const res = await fetch(`/api/teams/${assignCaptainModal.id}/assign-captain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId || null,
          captainName: selectedPlayer ? selectedPlayer.full_name : customCaptainName,
          email: selectedPlayer ? selectedPlayer.email : customCaptainEmail,
          mobile: selectedPlayer ? selectedPlayer.mobile : customCaptainMobile,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign captain');

      setAssignCaptainModal(null);
      fetchTeamsAndPlayers();
    } catch (err: any) {
      setAssignError(err.message || 'Error assigning captain');
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle Manual Purse Adjustment Submit
  const handleAdjustPurse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustmentAmount) return;

    setAdjustLoading(true);
    setAdjustError(null);

    try {
      const res = await fetch(`/api/teams/${adjustModal.id}/adjust-purse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustmentAmount: Number(adjustmentAmount),
          reason: adjustmentReason || 'Admin Manual Purse Adjustment',
          auctionId: adjustModal.auction_id,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to adjust purse');
      }

      setAdjustModal(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      fetchTeamsAndPlayers();
    } catch (err: any) {
      setAdjustError(err.message || 'Error adjusting purse');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Create Team Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Team Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create and edit participating teams, appoint team captains (Super Admin privilege), and manage purse allocations.
          </p>
        </div>

        <Button
          onClick={() => {
            setCreateError(null);
            setCreateModal(true);
          }}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
          className="shadow-xs"
        >
          Create Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((t) => (
          <Card key={t.id} noPadding className="hover:border-blue-300 transition-all shadow-xs border-slate-200 bg-white">
            {/* Team Card Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shadow-xs"
                  style={{ backgroundColor: t.color || '#2563EB' }}
                >
                  {t.short_name || t.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500">Captain:</span>
                    <strong className="text-[11px] text-blue-700">
                      {t.captain_name || 'Unassigned'}
                    </strong>
                    {t.captain_status === 'APPROVED' && (
                      <Badge variant="green" size="sm">Active</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditTeam(t)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Team"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteModal(t)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Team"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Purse Statistics */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    Initial Purse
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {formatCompactCurrency(t.initial_purse)}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                    Spent
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {formatCompactCurrency(t.spent_purse)}
                  </span>
                </div>

                <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-blue-700 font-semibold block uppercase">
                    Remaining
                  </span>
                  <span className="text-xs font-extrabold text-blue-700 mt-0.5 block">
                    {formatCompactCurrency(t.remaining_purse)}
                  </span>
                </div>
              </div>

              {/* Squad & Retention Counters */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Squad: <strong>{t.squad_count || 0}</strong> players</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Retained: <strong>{t.retention_count || 0}</strong></span>
                </div>
              </div>

              {/* Management Buttons: 1. Assign Captain, 2. Adjust Purse */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAssignCaptain(t)}
                  icon={<UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                  className="text-xs py-1.5 w-full bg-white hover:bg-slate-50 border-slate-200"
                >
                  Assign Captain
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdjustModal(t)}
                  icon={<Wallet className="w-3.5 h-3.5 text-blue-600" />}
                  className="text-xs py-1.5 w-full bg-white hover:bg-slate-50 border-slate-200"
                >
                  Adjust Purse
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ========================================================== */}
      {/* 1. CREATE TEAM MODAL                                       */}
      {/* ========================================================== */}
      {createModal && (
        <Modal
          isOpen={createModal}
          onClose={() => setCreateModal(false)}
          title="Create New Team"
          description="Add a new franchise team to participate in the tournament auction."
        >
          <form onSubmit={handleCreateTeam} className="space-y-4">
            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Team Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune Panthers"
                value={newTeamName}
                onChange={(e) => {
                  setNewTeamName(e.target.value);
                  if (!newShortName) {
                    setNewShortName(e.target.value.substring(0, 3).toUpperCase());
                  }
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Code (2-4 letters)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. PP"
                  value={newShortName}
                  onChange={(e) => setNewShortName(e.target.value.toUpperCase())}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Purse (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="50000"
                required
                value={newInitialPurse}
                onChange={(e) => setNewInitialPurse(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Captain (Optional)
              </label>
              <select
                value={newCaptainPlayerId}
                onChange={(e) => setNewCaptainPlayerId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              >
                <option value="">-- Select from Registered Players or Assign Later --</option>
                {registeredPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.playing_role} • {p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={createLoading}>
                Create Team
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 2. EDIT TEAM MODAL                                         */}
      {/* ========================================================== */}
      {editModal && (
        <Modal
          isOpen={!!editModal}
          onClose={() => setEditModal(null)}
          title={`Edit Team: ${editModal.name}`}
          description="Update team credentials, visual brand color, or remaining purse."
        >
          <form onSubmit={handleEditTeam} className="space-y-4">
            {editError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Short Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editShortName}
                  onChange={(e) => setEditShortName(e.target.value.toUpperCase())}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-9 h-9 rounded cursor-pointer border border-slate-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Remaining Purse (₹)</label>
              <input
                type="number"
                value={editPurse}
                onChange={(e) => setEditPurse(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditModal(null)}>
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
      {/* 3. ASSIGN CAPTAIN MODAL (SUPER ADMIN DECISION)             */}
      {/* ========================================================== */}
      {assignCaptainModal && (
        <Modal
          isOpen={!!assignCaptainModal}
          onClose={() => setAssignCaptainModal(null)}
          title={`Assign Captain: ${assignCaptainModal.name}`}
          description="Super Admin privilege: select any registered player or specify captain credentials to lead this team in live bidding."
        >
          <form onSubmit={handleAssignCaptainSubmit} className="space-y-4">
            {assignError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{assignError}</span>
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
              Current Captain: <strong>{assignCaptainModal.captain_name || 'None'}</strong>
              {assignCaptainModal.captain_email && (
                <span className="block text-[11px] text-blue-700 mt-0.5">
                  Email: {assignCaptainModal.captain_email}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select from Registered Players
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  const p = registeredPlayers.find((ply) => ply.id === e.target.value);
                  if (p) {
                    setCustomCaptainName(p.full_name);
                    setCustomCaptainEmail(p.email);
                    setCustomCaptainMobile(p.mobile || '');
                  }
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-medium"
              >
                <option value="">-- Choose a registered player --</option>
                {registeredPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.playing_role} • {p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">Or custom captain details</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Captain Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customCaptainName}
                onChange={(e) => setCustomCaptainName(e.target.value)}
                placeholder="e.g. Rohit Sharma"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Captain Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customCaptainEmail}
                  onChange={(e) => setCustomCaptainEmail(e.target.value)}
                  placeholder="captain@team.com"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={customCaptainMobile}
                  onChange={(e) => setCustomCaptainMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setAssignCaptainModal(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={assignLoading} icon={<UserCheck className="w-3.5 h-3.5" />}>
                Approve & Appoint Captain
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 4. MANUAL PURSE ADJUSTMENT MODAL                           */}
      {/* ========================================================== */}
      {adjustModal && (
        <Modal
          isOpen={!!adjustModal}
          onClose={() => setAdjustModal(null)}
          title={`Adjust Purse for ${adjustModal.name}`}
          description="Enter a positive or negative amount to manually adjust the team's remaining purse balance."
        >
          <form onSubmit={handleAdjustPurse} className="space-y-4">
            {adjustError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div>
                Current Remaining Purse: <strong>{formatCurrency(adjustModal.remaining_purse)}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Amount (₹) <span className="text-slate-400 font-normal">(use positive to add, negative to deduct)</span>
              </label>
              <input
                type="number"
                required
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="e.g. 50000 or -50000"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Justification
              </label>
              <input
                type="text"
                required
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g. Bonus purse allocation / Penalty adjustment"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setAdjustModal(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={adjustLoading}>
                Confirm Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 5. DELETE TEAM CONFIRMATION MODAL                          */}
      {/* ========================================================== */}
      {deleteModal && (
        <Modal
          isOpen={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Confirm Delete Team"
          description={`Are you sure you want to delete ${deleteModal.name}? This will unlink any assigned captains and remove this team from the auction.`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              This action cannot be undone. Any squad members or purse allocation transactions for this team will be cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteTeam} loading={deleteLoading}>
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
