import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Award, CheckCircle2, XCircle, Shield, Phone, Mail, UserPlus, AlertCircle } from 'lucide-react';

export const CaptainsPage: React.FC = () => {
  const [captains, setCaptains] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Captain Modal
  const [assignModal, setAssignModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customMobile, setCustomMobile] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [capsRes, teamsRes, playersRes] = await Promise.all([
        fetch('/api/auth/captains'),
        fetch('/api/teams'),
        fetch('/api/players'),
      ]);

      if (capsRes.ok) setCaptains(await capsRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (playersRes.ok) setPlayers(await playersRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/auth/captains/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setActionMessage(`Captain status updated to ${status}.`);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCaptain = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete captain "${name}"? This will unassign them from the team.`)) return;
    try {
      const res = await fetch(`/api/auth/captains/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionMessage(`Captain "${name}" deleted successfully.`);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete captain');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignCaptain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    setAssignLoading(true);
    try {
      const res = await fetch('/api/auth/assign-captain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeamId,
          playerId: selectedPlayerId || null,
          captainName: customName || null,
          email: customEmail || null,
          mobile: customMobile || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign captain');

      setAssignModal(false);
      setActionMessage(data.message || 'Captain assigned successfully!');
      setSelectedPlayerId('');
      setCustomName('');
      setCustomEmail('');
      setCustomMobile('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error assigning captain');
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Captain Approvals & Team Leadership
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Super Admin decides which player or leader is assigned as Captain. Captain requests require Super Admin confirmation before accessing bidding.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            if (teams.length > 0) setSelectedTeamId(teams[0].id);
            setAssignModal(true);
          }}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Assign Team Captain
        </Button>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Captains Grid */}
      {captains.length === 0 ? (
        <Card className="text-center py-12">
          <Award className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-slate-800">No Captains Assigned Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Click "Assign Team Captain" above to choose any registered player or candidate and promote them to franchise captain.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {captains.map((cap) => (
            <Card key={cap.id} noPadding className="hover:border-blue-300 transition-all">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                    {cap.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{cap.name}</h3>
                    <span className="text-[11px] font-semibold text-blue-700">
                      {cap.team_name || 'Team Leader'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant={cap.status === 'APPROVED' ? 'green' : cap.status === 'REJECTED' ? 'red' : 'amber'}
                  size="sm"
                >
                  {cap.status}
                </Badge>
              </div>

              <div className="p-5 space-y-3 text-xs">
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cap.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cap.mobile || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned Team: <strong className="text-slate-900">{cap.team_name}</strong></span>
                  </div>
                </div>

                {/* Confirmation controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  {cap.status !== 'APPROVED' ? (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(cap.id, 'APPROVED')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Confirm & Approve Captain
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Confirmed by Super Admin
                    </span>
                  )}
                  {cap.status !== 'REJECTED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUpdateStatus(cap.id, 'REJECTED')}
                      className="text-xs py-1"
                    >
                      Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteCaptain(cap.id, cap.name)}
                    className="text-xs py-1 px-2.5"
                    title="Delete Captain"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Super Admin Assign Captain Modal */}
      {assignModal && (
        <Modal
          isOpen={assignModal}
          onClose={() => setAssignModal(false)}
          title="Super Admin: Assign Team Captain"
          description="Select a franchise team and appoint any registered player or individual as Captain."
        >
          <form onSubmit={handleAssignCaptain} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Franchise Team <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-semibold"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.short_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pick Registered Player as Captain (Optional)
              </label>
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  const p = players.find((pl) => pl.id === e.target.value);
                  if (p) {
                    setCustomName(p.full_name);
                    setCustomEmail(p.email);
                    setCustomMobile(p.mobile || '');
                  }
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900"
              >
                <option value="">-- Choose from Registered Players --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.playing_role} • {p.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Captain Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Rohit Sharma"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Captain Email ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="captain@franchise.com"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={customMobile}
                onChange={(e) => setCustomMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" size="sm" type="button" onClick={() => setAssignModal(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" loading={assignLoading} icon={<Award className="w-3.5 h-3.5" />}>
                Confirm & Appoint Captain
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
