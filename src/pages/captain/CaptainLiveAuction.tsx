import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { AuctionRoomState, Team } from '../../types';
import { LivePlayerCard } from '../../components/auction/LivePlayerCard';
import { LiveTimer } from '../../components/auction/LiveTimer';
import { LiveBidFeed } from '../../components/auction/LiveBidFeed';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import { Shield, Wallet, Users, Award, Radio, Eye } from 'lucide-react';

export const CaptainLiveAuction: React.FC = () => {
  const { currentTeamId, availableTeams } = useAuth();
  const { socket } = useSocket();
  const auctionId = 'auc_default';

  const [roomState, setRoomState] = useState<AuctionRoomState | null>(null);
  const [teamData, setTeamData] = useState<Team | null>(null);
  const [auctionConfig, setAuctionConfig] = useState<any>(null);

  const currentTeam = availableTeams.find((t) => t.id === currentTeamId);

  const fetchTeamDetails = async () => {
    if (!currentTeamId) return;
    try {
      const res = await fetch(`/api/teams/${currentTeamId}`);
      if (res.ok) {
        const data = await res.json();
        setTeamData(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTeamDetails();
    fetch(`/api/auctions/${auctionId}`)
      .then((r) => r.json())
      .then((d) => setAuctionConfig(d.config))
      .catch(console.error);
  }, [currentTeamId, auctionId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('JOIN_AUCTION', {
      auctionId,
      user: { role: 'CAPTAIN', teamId: currentTeamId },
    });

    socket.on('AUCTION_STATE', (state: AuctionRoomState) => {
      setRoomState(state);
      fetchTeamDetails();
    });

    socket.on('TIMER_TICK', ({ seconds }: { seconds: number }) => {
      setRoomState((prev) => (prev ? { ...prev, timerSeconds: seconds, isTimerRunning: true } : prev));
    });

    socket.on('PLAYER_SOLD_CELEBRATION', (data: any) => {
      if (data.winningTeam?.teamId === currentTeamId) {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#1D4ED8', '#FFFFFF'],
        });
      }
      fetchTeamDetails();
    });

    return () => {
      socket.off('AUCTION_STATE');
      socket.off('TIMER_TICK');
      socket.off('PLAYER_SOLD_CELEBRATION');
    };
  }, [socket, auctionId, currentTeamId]);

  // Handle Captain Bid
  const handlePlaceBid = (bidAmount: number): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
      if (!socket) {
        return resolve({ success: false, message: 'Socket connection not established' });
      }

      socket.emit(
        'PLACE_BID',
        {
          auctionId,
          teamId: currentTeamId,
          captainId: teamData?.captainId,
          customAmount: bidAmount,
        },
        (res: any) => {
          resolve(res);
        }
      );
    });
  };

  const currentSquadCount = teamData?.squadCount ?? (teamData as any)?.squad?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Captain Team Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-xs shrink-0"
            style={{ backgroundColor: teamData?.color || '#2563EB' }}
          >
            {teamData?.shortName || currentTeam?.shortName || 'TM'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {teamData?.name || currentTeam?.name || 'Selected Team'}
              </h2>
              <Badge variant="blue" size="sm">
                Captain View
              </Badge>
              <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                PPL • United We Play, United We Win!
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Captain: <strong className="text-slate-800">{teamData?.captainName || 'You'}</strong> • Priyanka Premiere League Live Bidding
            </p>
          </div>
        </div>

        {/* Live Purse & Squad Metrics */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-6 bg-slate-50 border border-slate-200 px-3 sm:px-4 py-2.5 rounded-xl text-center">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Remaining Purse
            </span>
            <span className="text-base sm:text-lg font-extrabold text-blue-700">
              {formatCurrency(teamData?.remainingPurse ?? 20000)}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Squad Count
            </span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900">
              {currentSquadCount} / {auctionConfig?.maxPlayersPerTeam || 15}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Min Squad Req
            </span>
            <span className="text-base sm:text-lg font-extrabold text-slate-700">
              {auctionConfig?.minPlayersPerTeam || 11}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Player Card & Tactile Bidding */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Player details and Huge Bid Button */}
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
            <div className="sm:col-span-1">
              <LiveTimer
                seconds={roomState?.timerSeconds || 0}
                isRunning={roomState?.isTimerRunning || false}
              />
            </div>
          </div>

          {/* Captain Live Spectator Screen (Admin-only bidding rule) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 shadow-card text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Auction Spectator Console
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                Admin / Auctioneer Controlled
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Official Live Auction is underway. As per tournament regulations, bids are placed exclusively by the Super Admin &amp; Auctioneer. Captains can monitor live bids, leading teams, and purse balances in real time.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Bid</span>
                <span className="text-base sm:text-lg font-black text-amber-400">
                  {formatCurrency(roomState?.currentBid || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Leading Bidder</span>
                <span className="text-sm sm:text-base font-extrabold text-white truncate block">
                  {roomState?.highestBidder?.teamName || 'Opening Stage'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Purse</span>
                <span className="text-base sm:text-lg font-extrabold text-blue-400">
                  {formatCurrency(teamData?.remainingPurse ?? 20000)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Squad</span>
                <span className="text-base sm:text-lg font-extrabold text-emerald-400">
                  {currentSquadCount} / {auctionConfig?.maxPlayersPerTeam || 15}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 cols: Real-Time Bid History */}
        <div className="lg:col-span-4">
          <LiveBidFeed bids={roomState?.bidHistory || []} />
        </div>
      </div>
    </div>
  );
};
