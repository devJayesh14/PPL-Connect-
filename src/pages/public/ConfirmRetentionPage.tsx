import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CheckCircle2, XCircle, Shield, User, AlertCircle, ArrowRight } from 'lucide-react';

export const ConfirmRetentionPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [retention, setRetention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/retentions/confirm/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Retention offer not found or link has expired.');
        return res.json();
      })
      .then((data) => {
        setRetention(data);
        setLoading(false);
      })
      .catch((err) => {
        setResultMsg({ type: 'error', message: err.message });
        setLoading(false);
      });
  }, [token]);

  const handleAction = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/retentions/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process your response');

      setRetention((prev: any) => ({ ...prev, status: action === 'ACCEPT' ? 'CONFIRMED' : 'REJECTED' }));
      setResultMsg({
        type: 'success',
        message: data.message || (action === 'ACCEPT' ? 'You have accepted the retention offer!' : 'You have declined the retention offer.'),
      });
    } catch (err: any) {
      setResultMsg({ type: 'error', message: err.message || 'An error occurred.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="PPL" className="w-20 h-20 mx-auto object-contain drop-shadow-xl" />
          <h1 className="text-xl font-black text-white tracking-wider uppercase">
            Priyanka Premiere League
          </h1>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            ★ United We Play, United We Win! ★
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-md border border-slate-700 shadow-2xl p-6 rounded-2xl">
          {loading ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading retention details...</p>
            </div>
          ) : resultMsg && !retention ? (
            <div className="text-center py-6 space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h2 className="text-base font-bold text-slate-900">Offer Not Found</h2>
              <p className="text-xs text-slate-600">{resultMsg.message}</p>
              <Link to="/">
                <Button size="sm" variant="outline" className="mt-2 text-xs">
                  Back to Home
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center pb-4 border-b border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Official Franchise Retention
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {retention.team_name}
                </h2>
                <div className="flex justify-center pt-1">
                  <Badge
                    variant={
                      retention.status === 'CONFIRMED'
                        ? 'green'
                        : retention.status === 'REJECTED'
                        ? 'red'
                        : 'amber'
                    }
                    size="sm"
                  >
                    {retention.status === 'CONFIRMED'
                      ? 'Confirmed & Accepted'
                      : retention.status === 'REJECTED'
                      ? 'Declined'
                      : 'Awaiting Your Response'}
                  </Badge>
                </div>
              </div>

              {/* Player details */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0">
                  {retention.player_photo ? (
                    <img src={retention.player_photo} alt={retention.player_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-blue-600 bg-blue-50">
                      {retention.player_name?.charAt(0) || 'P'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{retention.player_name}</div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">{retention.player_email}</div>
                  <div className="text-[10px] font-semibold text-blue-600 uppercase mt-0.5">{retention.playing_role}</div>
                </div>
              </div>

              {/* Feedback Alert */}
              {resultMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                    resultMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {resultMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{resultMsg.message}</span>
                </div>
              )}

              {/* Details text */}
              {retention.status === 'PENDING_CONFIRMATION' && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong>{retention.team_name}</strong> wants to retain you as their franchise player for the PPL 2026 championship! By accepting, you bypass the public bidding auction and secure your spot directly in this team's squad.
                </p>
              )}

              {/* Actions */}
              {retention.status === 'PENDING_CONFIRMATION' ? (
                <div className="space-y-2 pt-2">
                  <Button
                    onClick={() => handleAction('ACCEPT')}
                    loading={actionLoading}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs shadow-md"
                  >
                    Accept & Confirm Retention
                  </Button>
                  <Button
                    onClick={() => handleAction('DECLINE')}
                    loading={actionLoading}
                    variant="outline"
                    icon={<XCircle className="w-4 h-4 text-rose-500" />}
                    className="w-full border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 font-semibold py-2 text-xs"
                  >
                    Decline Offer
                  </Button>
                </div>
              ) : (
                <div className="pt-2 text-center">
                  <Link to="/">
                    <Button size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} className="text-xs">
                      Go to Live Auction
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
