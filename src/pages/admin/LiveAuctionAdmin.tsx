import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { AuctionRoomState, Team } from '../../types';
import { LivePlayerCard } from '../../components/auction/LivePlayerCard';
import { LiveTimer } from '../../components/auction/LiveTimer';
import { LiveBidFeed } from '../../components/auction/LiveBidFeed';
import { SoldCelebrationOverlay, SoldCelebrationData } from '../../components/auction/SoldCelebrationOverlay';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
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
  Trophy,
  Flag,
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
  const [soldModal, setSoldModal] = useState<SoldCelebrationData | null>(null);
  const lastCelebratedKeyRef = useRef<string>('');

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

  // Trigger celebration once per sold player transition (works for both Socket & HTTP fallback)
  const triggerSoldCelebration = useCallback((data: SoldCelebrationData) => {
    const key = `${data.player?.playerId || data.player?.fullName}_${data.finalAmount}_${data.winningTeam?.teamId || ''}`;
    if (lastCelebratedKeyRef.current === key) return;
    lastCelebratedKeyRef.current = key;
    setSoldModal(data);
  }, []);

  // Fetch auxiliary data (teams, pool, auction metadata) without overwriting live roomState
  const fetchAuxiliaryData = useCallback(async () => {
    if (!auctionId) return;
    try {
      const [teamsRes, poolRes, aucRes] = await Promise.all([
        fetch(`/api/teams?auctionId=${auctionId}`),
        fetch(`/api/players/pool/${auctionId}`),
        fetch(`/api/auctions/${auctionId}`),
      ]);
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
  }, [auctionId]);

  // 2. Fetch Auction Data & Room State via HTTP for instant loading & serverless sync
  const fetchRoomData = useCallback(async () => {
    if (!auctionId) return;
    try {
      const [stateRes, teamsRes, poolRes, aucRes] = await Promise.all([
        fetch(`/api/auctions/${auctionId}/room-state`),
        fetch(`/api/teams?auctionId=${auctionId}`),
        fetch(`/api/players/pool/${auctionId}`),
        fetch(`/api/auctions/${auctionId}`),
      ]);

      if (stateRes.ok) {
        const state: AuctionRoomState = await stateRes.json();
        setRoomState(state);
        if (state.status === 'BIDDING' && state.currentPlayer) {
          setSoldModal(null);
        } else if (state.status === 'SOLD' && state.currentPlayer && state.highestBidder) {
          triggerSoldCelebration({
            player: state.currentPlayer,
            winningTeam: state.highestBidder,
            finalAmount: state.currentBid,
          });
        }
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
  }, [auctionId, triggerSoldCelebration]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  // 3. Setup Socket.IO real-time subscriptions + automatic HTTP polling fallback
  useEffect(() => {
    if (!auctionId) return;

    if (socket) {
      socket.emit('JOIN_AUCTION', { auctionId, user: { role: isAdmin ? 'ADMIN' : 'SPECTATOR' } });
    }

    const handleAuctionState = (state: AuctionRoomState) => {
      setRoomState(state);
      if (state.status === 'BIDDING' && state.currentPlayer) {
        setSoldModal(null);
      }
      fetchAuxiliaryData();
    };

    const handleTimerTick = ({ seconds }: { seconds: number }) => {
      setRoomState((prev) => (prev ? { ...prev, timerSeconds: seconds, isTimerRunning: true } : prev));
    };

    const handleSoldCelebration = (data: SoldCelebrationData) => {
      triggerSoldCelebration(data);
      fetchAuxiliaryData();
    };

    const handleUnsoldEvent = () => {
      fetchAuxiliaryData();
    };

    if (socket) {
      socket.on('AUCTION_STATE', handleAuctionState);
      socket.on('TIMER_TICK', handleTimerTick);
      socket.on('PLAYER_SOLD_CELEBRATION', handleSoldCelebration);
      socket.on('PLAYER_UNSOLD_EVENT', handleUnsoldEvent);
    }

    // Resilient HTTP polling fallback (keeps serverless & spectators always synced)
    const pollIntervalMs = isConnected ? 8000 : 2500;
    const pollTimer = window.setInterval(() => {
      fetchRoomData();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(pollTimer);
      if (socket) {
        socket.off('AUCTION_STATE', handleAuctionState);
        socket.off('TIMER_TICK', handleTimerTick);
        socket.off('PLAYER_SOLD_CELEBRATION', handleSoldCelebration);
        socket.off('PLAYER_UNSOLD_EVENT', handleUnsoldEvent);
      }
    };
  }, [socket, isConnected, auctionId, isAdmin, fetchRoomData, fetchAuxiliaryData, triggerSoldCelebration]);

  // Resilient Socket-with-HTTP-Fallback helper (times out after 2.5s if socket ack is lost)
  const runActionWithFallback = async (
    socketEvent: string,
    socketPayload: Record<string, any>,
    httpPath: string,
    httpBody?: Record<string, any>
  ): Promise<any> => {
    if (socket && isConnected) {
      const socketResult = await new Promise<any>((resolve) => {
        let settled = false;
        const timeout = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        }, 2500);

        socket.emit(socketEvent, socketPayload, (res: any) => {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeout);
            resolve(res);
          }
        });
      });

      if (socketResult) {
        if (socketResult.state) setRoomState(socketResult.state);
        return socketResult;
      }
    }

    const res = await fetch(httpPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: httpBody ? JSON.stringify(httpBody) : undefined,
    });
    const data = await res.json();
    if (data?.state) setRoomState(data.state);
    return data;
  };

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

  // 4. Admin Handlers with Resilient Socket + HTTP Fallback
  const handleCallNextPlayer = async (specificPlayerId?: string) => {
    setActionLoading(true);
    setActionError(null);
    setSoldModal(null);

    try {
      const data = await runActionWithFallback(
        'CALL_PLAYER',
        { auctionId, playerId: specificPlayerId },
        `/api/auctions/${auctionId}/call-player`,
        { playerId: specificPlayerId }
      );
      setSelectPlayerModal(false);
      if (!data?.success) {
        setActionError(data?.message || 'Error calling player');
      } else {
        await fetchAuxiliaryData();
      }
    } catch (err: any) {
      setSelectPlayerModal(false);
      setActionError(err.message || 'Error calling player');
    } finally {
      setActionLoading(false);
    }
  };

  // Open "Mark Sold" Modal: Admin selects the winning team and confirms price
  const openMarkSoldModal = () => {
    if (!roomState?.currentPlayer) return;

    // Pre-fill highest bidder team if one bid, otherwise let admin choose
    setSelectedSoldTeamId(roomState.highestBidder?.teamId || '');
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

    try {
      const data = await runActionWithFallback(
        'MARK_SOLD',
        { auctionId, teamId: selectedSoldTeamId, amount: finalAmount },
        `/api/auctions/${auctionId}/mark-sold`,
        { teamId: selectedSoldTeamId, amount: finalAmount }
      );

      if (!data?.success) {
        setActionError(data?.message || 'Error marking player as sold');
      } else {
        setMarkSoldModal(false);
        if (data.soldData) {
          triggerSoldCelebration(data.soldData);
        } else if (roomState?.currentPlayer) {
          const teamObj = teams.find((t) => t.id === selectedSoldTeamId);
          triggerSoldCelebration({
            player: roomState.currentPlayer,
            winningTeam: teamObj
              ? { teamId: teamObj.id, teamName: teamObj.name, teamLogo: teamObj.logo, teamColor: teamObj.color }
              : roomState.highestBidder,
            finalAmount,
          });
        }
        await fetchAuxiliaryData();
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

    try {
      const data = await runActionWithFallback(
        'MARK_UNSOLD',
        { auctionId },
        `/api/auctions/${auctionId}/mark-unsold`
      );
      if (!data?.success) alert(data?.message || 'Error marking player unsold');
      else await fetchAuxiliaryData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Skip Player
  const handleSkipPlayer = async () => {
    setActionLoading(true);
    try {
      await runActionWithFallback('SKIP_PLAYER', { auctionId }, `/api/auctions/${auctionId}/skip-player`);
      await fetchAuxiliaryData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Undo Last Bid
  const handleUndoBid = async () => {
    try {
      await runActionWithFallback('UNDO_LAST_BID', { auctionId }, `/api/auctions/${auctionId}/undo-bid`);
      await fetchAuxiliaryData();
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Clock Pause / Resume
  const handleTogglePause = async () => {
    const isRunning = roomState?.isTimerRunning;
    try {
      await runActionWithFallback(
        isRunning ? 'PAUSE_AUCTION' : 'RESUME_AUCTION',
        { auctionId },
        `/api/auctions/${auctionId}/${isRunning ? 'pause-clock' : 'resume-clock'}`
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Finish / Conclude Entire Live Auction
  const handleFinishAuction = async () => {
    if (!confirm('Are you sure you want to FINISH and COMPLETE this live auction?\n\nThis will officially conclude the auction, stop bidding, and finalize all squads and reports.')) {
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const data = await runActionWithFallback(
        'END_AUCTION',
        { auctionId },
        `/api/auctions/${auctionId}/end-auction`
      );
      if (data && !data.success) {
        setActionError(data.message || 'Error ending auction');
      } else {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
        });
        await fetchRoomData();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error ending auction');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin placing / incrementing bid on stage without requiring team selection
  const submitAdminBid = async (teamId: string = '', amount: number) => {
    try {
      const data = await runActionWithFallback(
        'PLACE_BID',
        { auctionId, teamId: teamId || undefined, customAmount: amount },
        `/api/auctions/${auctionId}/place-bid`,
        { teamId: teamId || undefined, customAmount: amount }
      );
      if (data && !data.success) alert(data.message);
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

            {/* FINISH AUCTION BUTTON */}
            <Button
              size="sm"
              onClick={handleFinishAuction}
              loading={actionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-xs"
              icon={<Flag className="w-3.5 h-3.5 text-white" />}
            >
              Finish Auction
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

      {/* When Auction is Completed */}
      {roomState?.status === 'COMPLETED' && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-amber-500/10 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Auction Officially COMPLETED!</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  Finalized
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                All bidding rounds have concluded. Team squads, purse accounts, and player acquisitions are locked.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/sold-players')}
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            >
              Sold & Unsold
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/final-squads')}
              icon={<Trophy className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              View Final Squads
            </Button>
          </div>
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
              <PlayerAvatar
                src={roomState.currentPlayer.photo}
                name={roomState.currentPlayer.fullName}
                className="w-12 h-12 rounded-full overflow-hidden bg-white border border-blue-200 shrink-0"
                fallbackClassName="w-full h-full flex items-center justify-center font-bold text-blue-600 bg-blue-50"
              />
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
                    <PlayerAvatar
                      src={player.photo}
                      name={player.full_name}
                      className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200"
                      fallbackClassName="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 bg-slate-100"
                    />
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
      {/* 3. SOLD CELEBRATION ANIMATION OVERLAY                      */}
      {/* ========================================================== */}
      <SoldCelebrationOverlay
        data={soldModal}
        isAdmin={isAdmin}
        loading={actionLoading}
        onClose={() => setSoldModal(null)}
        onNextPlayer={() => {
          setSoldModal(null);
          handleCallNextPlayer();
        }}
      />
    </div>
  );
};
