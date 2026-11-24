import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { AuctionRoomState, Team } from '../../types';
import { LivePlayerCard } from '../../components/auction/LivePlayerCard';
import { LiveTimer } from '../../components/auction/LiveTimer';
import { LiveBidFeed } from '../../components/auction/LiveBidFeed';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import {
  Gavel,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  XCircle,
  Undo2,
  Square,
  Users,
  Layers,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Coins,
  Shield,
  Radio,
} from 'lucide-react';

export const LiveAuctionAdmin: React.FC = () => {
  const { auctionId: routeAuctionId } = useParams<{ auctionId?: string }>();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [auctionId, setAuctionId] = useState<string>(routeAuctionId || 'auc_default');
  const [auctionInfo, setAuctionInfo] = useState<any>(null);
  const [roomState, setRoomState] = useState<AuctionRoomState | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [poolPlayers, setPoolPlayers] = useState<any[]>([]);

  // Modals
  const [selectPlayerModal, setSelectPlayerModal] = useState(false);
  const [markSoldModal, setMarkSoldModal] = useState(false);
  const [soldModal, setSoldModal] = useState<any>(null);

  // Sold player custom team selection state
  const [selectedSoldTeamId, setSelectedSoldTeamId] = useState('');
  const [soldPriceInput, setSoldPriceInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Admin Quick Bid Controls state
  const [adminBiddingTeamId, setAdminBiddingTeamId] = useState<string>('');
  const [customBidAmount, setCustomBidAmount] = useState<string>('');

  // 1. Resolve Active Auction ID
  useEffect(() => {
    if (routeAuctionId) {
      setAuctionId(routeAuctionId);
      return;
    }

    // Otherwise, discover active/live auction from API
    fetch('/api/auctions')
      .then((res) => res.json())
      .then((auctions: any[]) => {
        if (auctions && auctions.length > 0) {
          const live = auctions.find((a) => a.status === 'LIVE');
          const chosen = live ? live.id : auctions[0].id;
          setAuctionId(chosen);
        }
      })
      .catch(console.error);
  }, [routeAuctionId]);

  // 2. Fetch Auction Data & Room State via HTTP for instant loading
  const fetchRoomData = async () => {
    if (!auctionId) return;
    try {
      const [stateRes, teamsRes, poolRes, aucRes] = await Promise.all([
        fetch(`/api/auctions/${auctionId}/room-state`),
        fetch(`/api/teams?auctionId=${auctionId}`),
        fetch(`/api/players/pool/${auctionId}`),
        fetch(`/api/auctions/${auctionId}`),
      ]);

      if (stateRes.ok) {
        const state = await stateRes.json();
        setRoomState(state);
      }
      if (teamsRes.ok) {
        const tList = await teamsRes.json();
        setTeams(tList);
        if (tList && tList.length > 0) {
          setAdminBiddingTeamId((prev) => prev || tList[0].id);
        }
      }
      if (poolRes.ok) setPoolPlayers(await poolRes.json());
      if (aucRes.ok) setAuctionInfo(await aucRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [auctionId]);

  // 3. Setup Socket.IO real-time subscriptions
  useEffect(() => {
    if (!socket || !auctionId) return;

    socket.emit('JOIN_AUCTION', { auctionId, user: { role: 'ADMIN' } });

    const handleAuctionState = (state: AuctionRoomState) => {
      setRoomState(state);
      fetchRoomData();
    };

    const handleTimerTick = ({ seconds }: { seconds: number }) => {
      setRoomState((prev) => (prev ? { ...prev, timerSeconds: seconds, isTimerRunning: true } : prev));
    };

    const handleSoldCelebration = (data: any) => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#3B82F6', '#EFF6FF', '#0F172A'],
      });
      setSoldModal(data);
      fetchRoomData();
    };

    const handleUnsoldEvent = () => {
      fetchRoomData();
    };

    socket.on('AUCTION_STATE', handleAuctionState);
    socket.on('TIMER_TICK', handleTimerTick);
    socket.on('PLAYER_SOLD_CELEBRATION', handleSoldCelebration);
    socket.on('PLAYER_UNSOLD_EVENT', handleUnsoldEvent);

    return () => {
      socket.off('AUCTION_STATE', handleAuctionState);
      socket.off('TIMER_TICK', handleTimerTick);
      socket.off('PLAYER_SOLD_CELEBRATION', handleSoldCelebration);
      socket.off('PLAYER_UNSOLD_EVENT', handleUnsoldEvent);
    };
  }, [socket, auctionId]);

  // Sync all players if pool is empty
  const handleSyncAllPlayers = async () => {
    try {
      setActionLoading(true);
      await fetch(`/api/players/sync-all-to-pool/${auctionId}`, { method: 'POST' });
      await fetchRoomData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Admin Handlers with HTTP Fallback (Guaranteed to work!)
  const handleCallNextPlayer = async (specificPlayerId?: string) => {
    setActionLoading(true);
    setActionError(null);

    // Call via socket if connected
    if (socket && isConnected) {
      socket.emit('CALL_PLAYER', { auctionId, playerId: specificPlayerId }, (res: any) => {
        setActionLoading(false);
        setSelectPlayerModal(false);
        if (!res.success) {
          setActionError(res.message);
        } else {
          fetchRoomData();
        }
      });
      return;
    }

    // Fallback to HTTP
    try {
      const res = await fetch(`/api/auctions/${auctionId}/call-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: specificPlayerId }),
      });
      const data = await res.json();
      setSelectPlayerModal(false);
      if (!data.success) {
        setActionError(data.message || 'Error calling player');
      } else {
        fetchRoomData();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error calling player');
    } finally {
      setActionLoading(false);
    }
  };

  // Open "Mark Sold" Modal: Admin selects the winning team and confirms price
  const openMarkSoldModal = () => {
    if (!roomState?.currentPlayer) return;

    // Reset selected team so admin explicitly chooses winning team
    setSelectedSoldTeamId('');
    setSoldPriceInput(String(roomState.currentBid || roomState.currentPlayer.basePrice || 500));
    setActionError(null);
    setMarkSoldModal(true);
  };

  // Submit Mark Sold
  const handleConfirmSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSoldTeamId) {
      setActionError('Please select the winning team.');
      return;
    }

    const finalAmount = Number(soldPriceInput) || roomState?.currentBid || 500;
    setActionLoading(true);
    setActionError(null);

    // Try Socket first
    if (socket && isConnected) {
      socket.emit(
        'MARK_SOLD',
        {
          auctionId,
          teamId: selectedSoldTeamId,
          amount: finalAmount,
        },
        (res: any) => {
          setActionLoading(false);
          if (!res.success) {
            setActionError(res.message);
          } else {
            setMarkSoldModal(false);
            fetchRoomData();
          }
        }
      );
      return;
    }

    // HTTP Fallback
    try {
      const res = await fetch(`/api/auctions/${auctionId}/mark-sold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedSoldTeamId,
          amount: finalAmount,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setActionError(data.message || 'Error marking player as sold');
      } else {
        setMarkSoldModal(false);
        fetchRoomData();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error marking player as sold');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Unsold
  const handleMarkUnsold = async () => {
    if (!confirm('Mark current player as UNSOLD?')) return;
    setActionLoading(true);

    if (socket && isConnected) {
      socket.emit('MARK_UNSOLD', { auctionId }, (res: any) => {
        setActionLoading(false);
        if (!res.success) alert(res.message);
        else fetchRoomData();
      });
      return;
    }

    try {
      const res = await fetch(`/api/auctions/${auctionId}/mark-unsold`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) alert(data.message);
      else fetchRoomData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Skip Player
  const handleSkipPlayer = async () => {
    setActionLoading(true);
    if (socket && isConnected) {
      socket.emit('SKIP_PLAYER', { auctionId }, () => {
        setActionLoading(false);
        fetchRoomData();
      });
      return;
    }

    try {
      await fetch(`/api/auctions/${auctionId}/skip-player`, { method: 'POST' });
      fetchRoomData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Bid
  const handleUndoBid = async () => {
    if (socket && isConnected) {
      socket.emit('UNDO_LAST_BID', { auctionId }, () => fetchRoomData());
      return;
    }
    try {
      await fetch(`/api/auctions/${auctionId}/undo-bid`, { method: 'POST' });
      fetchRoomData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Clock Pause / Resume
  const handleTogglePause = async () => {
    const isRunning = roomState?.isTimerRunning;
    if (socket && isConnected) {
      socket.emit(isRunning ? 'PAUSE_AUCTION' : 'RESUME_AUCTION', { auctionId }, () => fetchRoomData());
      return;
    }

    try {
      await fetch(`/api/auctions/${auctionId}/${isRunning ? 'pause-clock' : 'resume-clock'}`, { method: 'POST' });
      fetchRoomData();
    } catch (e) {
      console.error(e);
    }
  };

  // Admin placing / incrementing bid on stage without requiring team selection
  const submitAdminBid = async (teamId: string = '', amount: number) => {
    if (socket && isConnected) {
      socket.emit('PLACE_BID', { auctionId, teamId: teamId || undefined, customAmount: amount }, (res: any) => {
        if (!res.success) alert(res.message);
        else fetchRoomData();
      });
      return;
    }

    try {
      const res = await fetch(`/api/auctions/${auctionId}/place-bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamId || undefined, customAmount: amount }),
      });
      const data = await res.json();
      if (!data.success) alert(data.message);
      else fetchRoomData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminBidIncrement = async (increment: number) => {
    if (!roomState?.currentPlayer) return;
    const currentPrice = roomState.currentBid || roomState.currentPlayer.basePrice || 500;
    const amount = currentPrice + increment;
    await submitAdminBid('', amount);
  };

  const handleAdminCustomBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomState?.currentPlayer) return;
    const amount = Number(customBidAmount);
    if (!amount || amount <= (roomState.currentBid || 0)) {
      alert(`Bid amount must be greater than current bid (₹${roomState.currentBid || 0})`);
      return;
    }
    await submitAdminBid('', amount);
    setCustomBidAmount('');
  };

  const pendingPoolPlayers = poolPlayers.filter((p) => p.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Top Banner: Master Console Controls */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-elevated border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="PPL"
            className="w-12 h-12 object-contain shrink-0 drop-shadow"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-black tracking-tight uppercase">
                Priyanka Premiere League
              </h2>
              <Badge variant="blue" size="sm" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold">
                {auctionInfo?.name || 'Live Auction'}
              </Badge>
            </div>
            <p className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wide mt-0.5">
              United We Play, United We Win!
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Status: <strong className="text-emerald-400">{roomState?.status || 'LIVE'}</strong> • Active Auction Pool: <strong>{pendingPoolPlayers.length}</strong> Players Available
            </p>
          </div>
        </div>

        {/* Action Controls Bar - ONLY Super Admin can control the auction */}
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            <Button
              size="sm"
              onClick={() => handleCallNextPlayer()}
              loading={actionLoading}
              icon={<Play className="w-3.5 h-3.5 text-white" />}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Call Next Player
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectPlayerModal(true)}
              icon={<Layers className="w-3.5 h-3.5 text-slate-700" />}
            >
              Select from Pool ({pendingPoolPlayers.length})
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleTogglePause}
              icon={roomState?.isTimerRunning ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
            >
              {roomState?.isTimerRunning ? 'Pause Clock' : 'Resume Clock'}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleUndoBid}
              disabled={!roomState?.bidHistory?.length}
              icon={<Undo2 className="w-3.5 h-3.5 text-slate-700" />}
            >
              Undo Bid
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleSkipPlayer}
              disabled={!roomState?.currentPlayer}
              icon={<SkipForward className="w-3.5 h-3.5 text-slate-700" />}
            >
              Skip
            </Button>

            {/* MARK SOLD BUTTON: Opens the Team Selection Modal */}
            <Button
              size="sm"
              onClick={openMarkSoldModal}
              disabled={!roomState?.currentPlayer}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              MARK SOLD
            </Button>

            <Button
              size="sm"
              onClick={handleMarkUnsold}
              disabled={!roomState?.currentPlayer}
              className="bg-slate-700 hover:bg-slate-800 text-white font-semibold"
              icon={<XCircle className="w-3.5 h-3.5" />}
            >
              MARK UNSOLD
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              Live Spectator Screen
            </span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-slate-600 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* When Pool is Empty */}
      {!roomState?.currentPlayer && pendingPoolPlayers.length === 0 && (
        isAdmin ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Auction Pool is Ready</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Click "Call Next Player" or sync all registered players into this auction to begin live bidding.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                size="sm"
                onClick={handleSyncAllPlayers}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                loading={actionLoading}
              >
                Sync All Registered Players into Pool
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/players')}
                icon={<Users className="w-3.5 h-3.5" />}
              >
                Manage Players
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center font-bold mb-3">
              <Radio className="w-6 h-6 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Live Auction Standing By</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              The auctioneer will call the next player to the stage shortly. Stay tuned!
            </p>
          </div>
        )
      )}

      {/* Main Live Stage: Player Showcase & Timer vs Bid History */}
      {/* REQUIREMENT: DO NOT show teams list on the stage. Just the live player, timer, bid controls & feed! */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Player Details & Countdown Timer (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <LivePlayerCard
                player={roomState?.currentPlayer || null}
                currentBid={roomState?.currentBid || 0}
                highestBidder={roomState?.highestBidder || null}
                status={roomState?.status || 'IDLE'}
              />
            </div>

            <div className="sm:col-span-1 flex flex-col justify-between">
              <LiveTimer
                seconds={roomState?.timerSeconds || 0}
                isRunning={roomState?.isTimerRunning || false}
              />

              {/* Quick Admin Increment Controls - ONLY FOR SUPER ADMIN */}
              {isAdmin && (
                <div className="mt-4 p-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1 uppercase text-[10px] tracking-wider">
                      <Coins className="w-3.5 h-3.5 text-blue-600" />
                      Auctioneer Bid Controls
                    </span>
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Admin Only
                    </span>
                  </div>


                  {/* Increments */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Quick Increments
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => handleAdminBidIncrement(100)}
                        disabled={!roomState?.currentPlayer}
                        className="py-1 px-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-lg font-bold text-blue-800 text-center transition-colors text-xs cursor-pointer"
                      >
                        +₹100
                      </button>
                      <button
                        onClick={() => handleAdminBidIncrement(200)}
                        disabled={!roomState?.currentPlayer}
                        className="py-1 px-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-lg font-bold text-blue-800 text-center transition-colors text-xs cursor-pointer"
                      >
                        +₹200
                      </button>
                      <button
                        onClick={() => handleAdminBidIncrement(500)}
                        disabled={!roomState?.currentPlayer}
                        className="py-1 px-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-lg font-bold text-blue-800 text-center transition-colors text-xs cursor-pointer"
                      >
                        +₹500
                      </button>
                      <button
                        onClick={() => handleAdminBidIncrement(1000)}
                        disabled={!roomState?.currentPlayer}
                        className="py-1 px-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-lg font-bold text-blue-800 text-center transition-colors text-xs cursor-pointer"
                      >
                        +₹1,000
                      </button>
                    </div>
                  </div>

                  {/* Custom Bid Input */}
                  <form onSubmit={handleAdminCustomBid} className="pt-1.5 border-t border-slate-100 flex gap-1">
                    <input
                      type="number"
                      placeholder="Custom ₹"
                      min={(roomState?.currentBid || 0) + 50}
                      step="50"
                      value={customBidAmount}
                      onChange={(e) => setCustomBidAmount(e.target.value)}
                      disabled={!roomState?.currentPlayer}
                      className="w-full text-xs font-semibold p-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!roomState?.currentPlayer || !customBidAmount}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shrink-0 transition-colors cursor-pointer"
                    >
                      Bid
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Bid Feed Stream (4 cols) */}
        <div className="lg:col-span-4">
          <LiveBidFeed bids={roomState?.bidHistory || []} />
        </div>
      </div>

      {/* ========================================================== */}
      {/* 1. MARK SOLD MODAL - SHOWS TEAM OPTION ONLY WHEN SELLING   */}
      {/* ========================================================== */}
      {markSoldModal && roomState?.currentPlayer && (
        <Modal
          isOpen={markSoldModal}
          onClose={() => setMarkSoldModal(false)}
          title={`Sell Player: ${roomState.currentPlayer.fullName}`}
          description="Select the acquiring franchise team and confirm the final winning purchase price."
        >
          <form onSubmit={handleConfirmSold} className="space-y-4">
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Player Quick Info */}
            <div className="flex items-center gap-3 p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-blue-200 shrink-0">
                {roomState.currentPlayer.photo ? (
                  <img src={roomState.currentPlayer.photo} alt={roomState.currentPlayer.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-blue-600">
                    {roomState.currentPlayer.fullName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{roomState.currentPlayer.fullName}</h4>
                <p className="text-xs text-blue-700 font-semibold">
                  {roomState.currentPlayer.playingRole} • Base: {formatCurrency(roomState.currentPlayer.basePrice)}
                </p>
              </div>
            </div>

            {/* TEAM OPTION SELECTION */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Winning Team <span className="text-rose-500">*</span>
              </label>
              {teams.length === 0 ? (
                <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg">
                  No teams registered for this auction. Please create teams in Team Management first.
                </div>
              ) : (
                <select
                  required
                  value={selectedSoldTeamId}
                  onChange={(e) => setSelectedSoldTeamId(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Purchasing Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Remaining Purse: {formatCurrency(t.remainingPurse ?? (t as any).remaining_purse ?? 20000)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Winning Sold Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final Winning Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="50"
                min="100"
                required
                value={soldPriceInput}
                onChange={(e) => setSoldPriceInput(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setMarkSoldModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="submit"
                loading={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Confirm & Sell Player
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 2. SELECT PLAYER FROM POOL MODAL                           */}
      {/* ========================================================== */}
      {selectPlayerModal && (
        <Modal
          isOpen={selectPlayerModal}
          onClose={() => setSelectPlayerModal(false)}
          title="Select Player from Auction Pool"
          description="Choose a pending player to call to the active auction stage."
          maxWidth="2xl"
        >
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {pendingPoolPlayers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No pending players in pool. Add players or sync registered players into pool.
              </div>
            ) : (
              pendingPoolPlayers.map((player) => (
                <div
                  key={player.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {player.photo ? (
                        <img src={player.photo} alt={player.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                          {player.full_name?.charAt(0) || 'P'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{player.full_name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {player.playing_role} • Base: {formatCurrency(player.base_price)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCallNextPlayer(player.player_id)}
                  >
                    Call Now
                  </Button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* 3. SOLD CELEBRATION MODAL                                  */}
      {/* ========================================================== */}
      {soldModal && (
        <Modal
          isOpen={!!soldModal}
          onClose={() => setSoldModal(null)}
          title="PLAYER SOLD!"
          maxWidth="md"
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official Result
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                {soldModal.player?.fullName || soldModal.player?.full_name}
              </h2>
              <p className="text-xs text-slate-500">{soldModal.player?.playingRole}</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-xs text-slate-500">Acquired by</span>
              <h3 className="text-lg font-bold text-blue-700">
                {soldModal.winningTeam?.teamName || soldModal.winningTeam?.name || 'Franchise Team'}
              </h3>
              <div className="text-2xl font-black text-slate-900 pt-1">
                {formatCurrency(soldModal.finalAmount)}
              </div>
            </div>

            <Button
              size="md"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setSoldModal(null);
                handleCallNextPlayer();
              }}
            >
              Continue to Next Player
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
