import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { AuctionRoomState, Team } from '../../types';
import { LivePlayerCard } from '../../components/auction/LivePlayerCard';
import { LiveTimer } from '../../components/auction/LiveTimer';
import { LiveBidFeed } from '../../components/auction/LiveBidFeed';
import { BidButton } from '../../components/auction/BidButton';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import confetti from 'canvas-confetti';
import { Shield, Wallet, Users, Award, Radio } from 'lucide-react';

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

          {/* Captain Large Bid Control Box (Section 15 & 26) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Instant Bidding Action
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Bid Increment: <strong>{formatCurrency(auctionConfig?.bidIncrement || 5000)}</strong>
              </span>
            </div>

            <BidButton
              nextBidAmount={roomState?.nextBidAmount || 0}
              currentBid={roomState?.currentBid || 0}
              team={
                teamData
                  ? {
                      id: teamData.id,
                      name: teamData.name,
                      remainingPurse: teamData.remainingPurse,
                      squadCount: currentSquadCount,
                    }
                  : null
              }
              highestBidderId={roomState?.highestBidder?.teamId}
              onPlaceBid={handlePlaceBid}
              isAuctionActive={roomState?.status === 'BIDDING'}
              minSquad={auctionConfig?.minPlayersPerTeam || 11}
              maxSquad={auctionConfig?.maxPlayersPerTeam || 15}
              minBasePrice={auctionConfig?.minBasePrice || 10000}
            />
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
