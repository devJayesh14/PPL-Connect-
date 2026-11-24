import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Trophy, Plus, Calendar, MapPin, Edit2, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  description: string;
  sport: string;
  status: 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  start_date: string;
  end_date: string;
  location: string;
  logo?: string;
  banner?: string;
  auction_count?: number;
  team_count?: number;
}

export const TournamentsPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sport: 'CRICKET',
    startDate: '',
    endDate: '',
    location: '',
    banner: '',
  });

  // Edit Modal
  const [editModal, setEditModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    sport: 'CRICKET',
    status: 'UPCOMING' as Tournament['status'],
    startDate: '',
    endDate: '',
    location: '',
    banner: '',
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Handle Create Tournament
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setCreateModal(false);
        setFormData({
          name: '',
          description: '',
          sport: 'CRICKET',
          startDate: '',
          endDate: '',
          location: '',
          banner: '',
        });
        showNotification('success', 'Tournament created successfully!');
        await fetchTournaments();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to create tournament');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error creating tournament');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (t: Tournament) => {
    setSelectedTournament(t);
    setEditFormData({
      name: t.name || '',
      description: t.description || '',
      sport: t.sport || 'CRICKET',
      status: t.status || 'UPCOMING',
      startDate: t.start_date || '',
      endDate: t.end_date || '',
      location: t.location || '',
      banner: t.banner || '',
    });
    setEditModal(true);
  };

  // Handle Save Edit
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !editFormData.name.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/tournaments/${selectedTournament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          description: editFormData.description.trim(),
          sport: editFormData.sport,
          status: editFormData.status,
          startDate: editFormData.startDate || null,
          endDate: editFormData.endDate || null,
          location: editFormData.location.trim(),
          banner: editFormData.banner.trim(),
        }),
      });

      if (res.ok) {
        setEditModal(false);
        setSelectedTournament(null);
        showNotification('success', 'Tournament updated successfully!');
        await fetchTournaments();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to update tournament');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error updating tournament');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (t: Tournament) => {
    setTournamentToDelete(t);
    setDeleteModal(true);
  };

  // Handle Confirm Delete
  const handleDelete = async () => {
    if (!tournamentToDelete) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/tournaments/${tournamentToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const deletedId = tournamentToDelete.id;
        setDeleteModal(false);
        setTournamentToDelete(null);
        setTournaments((prev) => prev.filter((t) => t.id !== deletedId));
        showNotification('success', 'Tournament and associated records deleted successfully!');
        await fetchTournaments();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'Failed to delete tournament');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'Error deleting tournament');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string): 'green' | 'blue' | 'amber' | 'red' | 'gray' => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'UPCOMING':
        return 'blue';
      case 'COMPLETED':
        return 'gray';
      case 'CANCELLED':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Tournaments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage championships, leagues, auctions, and tournament squads.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
          New Tournament
        </Button>
      </div>

      {/* Notification Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tournaments.length === 0 ? (
        /* Empty State */
        <Card className="text-center py-16 bg-slate-50 border-dashed border-2 border-slate-200">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Tournaments Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            Create your first tournament to organize player auctions, team rosters, and championship fixtures.
          </p>
          <Button size="sm" onClick={() => setCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
            Create Tournament
          </Button>
        </Card>
      ) : (
        /* Tournament Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
            <Card key={t.id} noPadding className="hover:border-blue-300 transition-all flex flex-col justify-between overflow-hidden shadow-sm">
              <div>
                {/* Banner Header */}
                <div className="h-32 bg-slate-800 relative overflow-hidden group">
                  {t.banner ? (
                    <img src={t.banner} alt={t.name} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 flex items-center justify-center p-3">
                      <img src="/logo.png" alt={t.name} className="h-20 object-contain drop-shadow-md opacity-90" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-black/60 text-white backdrop-blur-sm tracking-wider">
                      {t.sport || 'CRICKET'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant={getStatusBadgeVariant(t.status)} size="sm">
                      {t.status}
                    </Badge>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">{t.name}</h3>
                    {t.description ? (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.description}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1">No description provided</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">
                        {t.start_date || 'TBD'} &rarr; {t.end_date || 'TBD'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <span className="truncate">{t.location || 'Location Not Specified'}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded text-slate-700 font-semibold">
                      {t.auction_count || 0} {t.auction_count === 1 ? 'Auction' : 'Auctions'}
                    </span>
                    <span className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded text-blue-700 font-semibold">
                      {t.team_count || 0} {t.team_count === 1 ? 'Team' : 'Teams'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions: Edit and Delete */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-1/2 text-xs flex items-center justify-center gap-1.5 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                  onClick={() => openEditModal(t)}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-1/2 text-xs flex items-center justify-center gap-1.5"
                  onClick={() => openDeleteModal(t)}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create New Tournament"
        description="Establish a new tournament entity for hosting auctions and final squads."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tournament Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Surat Premier League 2026"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sport</label>
              <select
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CRICKET">Cricket</option>
                <option value="FOOTBALL">Football</option>
                <option value="BASKETBALL">Basketball</option>
                <option value="KABADDI">Kabaddi</option>
                <option value="BADMINTON">Badminton</option>
                <option value="TENNIS">Tennis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Wankhede Stadium, Mumbai"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Image URL</label>
            <input
              type="url"
              value={formData.banner}
              onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
              placeholder="https://example.com/banner.jpg"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide a brief overview of the tournament format and participating teams."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={actionLoading}>
              Create Tournament
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Tournament Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Tournament"
        description="Update tournament details, schedules, status, and venue information."
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tournament Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sport</label>
              <select
                value={editFormData.sport}
                onChange={(e) => setEditFormData({ ...editFormData, sport: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CRICKET">Cricket</option>
                <option value="FOOTBALL">Football</option>
                <option value="BASKETBALL">Basketball</option>
                <option value="KABADDI">Kabaddi</option>
                <option value="BADMINTON">Badminton</option>
                <option value="TENNIS">Tennis</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as Tournament['status'] })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={editFormData.startDate}
                onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={editFormData.endDate}
                onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Location</label>
            <input
              type="text"
              value={editFormData.location}
              onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Banner Image URL</label>
            <input
              type="url"
              value={editFormData.banner}
              onChange={(e) => setEditFormData({ ...editFormData, banner: e.target.value })}
              placeholder="https://example.com/banner.jpg"
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setEditModal(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Tournament"
        description="Please confirm permanent deletion of this tournament."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 space-y-1">
              <p className="font-bold">This action cannot be undone!</p>
              <p>
                Deleting <strong className="font-semibold text-slate-900">{tournamentToDelete?.name}</strong> will also permanently delete its associated auctions, teams, and tournament squads.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={actionLoading} icon={<Trash2 className="w-3.5 h-3.5" />}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
