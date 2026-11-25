import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';
import {
  Trophy,
  Calendar,
  Clock,
  Radio,
  Share2,
  Shield,
  Layers,
  Wallet,
  UserCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';

export const PublicAuctionView: React.FC = () => {
  const { auctionId = 'auc_default' } = useParams();
  const { isLoggedIn } = useAuth();
  const [auction, setAuction] = useState<any>(null);
  const [poolPlayers, setPoolPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/auctions/${auctionId}`),
      fetch(`/api/players/pool/${auctionId}`),
    ])
      .then(async ([aucRes, poolRes]) => {
        if (aucRes.ok) setAuction(await aucRes.json());
        if (poolRes.ok) setPoolPlayers(await poolRes.json());
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [auctionId]);

  if (loading || !auction) {
    return <div className="p-8 text-center text-slate-500">Loading auction details...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-elevated">
        <div className="h-56 w-full relative bg-gradient-to-r from-blue-900 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        </div>

        <div className="relative p-6 -mt-24 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src="/logo.png"
              alt="Priyanka Premiere League"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="sm" className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold uppercase">
                  Priyanka Premiere League
                </Badge>
                <Badge variant="navy" size="sm" className="bg-slate-800 text-slate-200 border-slate-700">
                  {auction.status}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">{auction.name}</h1>
              <p className="text-xs font-black text-amber-400 uppercase tracking-wider">
                ★ United We Play, United We Win! ★
              </p>
              <p className="text-xs text-slate-300 max-w-2xl">{auction.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link to="/live-auction" className="flex-1 sm:flex-none">
              <Button size="md" icon={<Radio className="w-4 h-4 animate-pulse text-white" />} className="w-full sm:w-auto text-xs">
                Watch Live Auction
              </Button>
            </Link>
            {!isLoggedIn && (
              <Link to="/register-player" className="flex-1 sm:flex-none">
                <Button size="md" variant="secondary" icon={<UserCheck className="w-4 h-4" />} className="w-full sm:w-auto text-xs">
                  Register as Player
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Auction Date
          </span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">
            {auction.auction_date}
          </h4>
          <span className="text-[11px] text-slate-500">{auction.start_time}</span>
        </Card>

        <Card className="text-center">
          <Wallet className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Team Purse
          </span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(auction.config?.total_purse_per_team || 20000)}
          </h4>
          <span className="text-[11px] text-slate-500">Per franchise team</span>
        </Card>

        <Card className="text-center">
          <Shield className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Squad Requirement
          </span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">
            Min {auction.config?.min_players_per_team || 11} - Max {auction.config?.max_players_per_team || 15}
          </h4>
          <span className="text-[11px] text-slate-500">Smart purse protected</span>
        </Card>

        <Card className="text-center">
          <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Bid Clock
          </span>
          <h4 className="text-base font-bold text-slate-900 mt-0.5">
            {auction.config?.bid_timer_seconds || 30} Seconds
          </h4>
          <span className="text-[11px] text-slate-500">With auto-extension</span>
        </Card>
      </div>

      {/* Participating Franchise Teams */}
      <Card header={<h3 className="text-sm font-bold text-slate-900">Franchise Teams ({auction.teams?.length || 0})</h3>} noPadding>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 p-4 gap-4">
          {auction.teams?.map((team: any) => (
            <div key={team.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-xs"
                  style={{ backgroundColor: team.color || '#2563EB' }}
                >
                  {team.short_name || team.name.substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{team.name}</h4>
                  <span className="text-[10px] text-slate-500">
                    Captain: <strong>{team.captain_name || 'Unassigned'}</strong>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Purse:</span>
                <span className="font-extrabold text-blue-700">{formatCurrency(team.remaining_purse)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Registered Players in Auction Pool */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Players in Pool ({poolPlayers.length})</h3>
              <p className="text-xs text-slate-500">Players registered and scheduled for the live bidding stage</p>
            </div>
            <Link to="/player/register">
              <Button size="sm" icon={<UserCheck className="w-3.5 h-3.5" />}>
                Register Now
              </Button>
            </Link>
          </div>
        }
        noPadding
      >
        {poolPlayers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-slate-800">No Players Registered Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first player to register! Registration takes less than 1 minute and requires no login or approval.
            </p>
            <div className="pt-2">
              <Link to="/player/register">
                <Button size="sm" icon={<UserCheck className="w-3.5 h-3.5" />}>
                  Register as Player
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {poolPlayers.map((player) => {
              const displayName = player.full_name || player.fullName || 'Player';
              const displayRole = player.playing_role || player.playingRole || 'PLAYER';
              const displayCat = player.category_name || player.categoryName || 'Standard';
              const displayBase = player.base_price ?? player.basePrice ?? 500;
              return (
                <div key={player.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar
                      src={player.photo}
                      name={displayName}
                      className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200"
                      fallbackClassName="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs bg-slate-100"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{displayName}</h4>
                      <p className="text-[11px] text-slate-500">
                        {displayRole} • {displayCat} • Base: {formatCurrency(displayBase)}
                      </p>
                    </div>
                  </div>

                <Badge
                  variant={
                    player.status === 'SOLD'
                      ? 'green'
                      : player.status === 'IN_AUCTION'
                      ? 'blue'
                      : 'gray'
                  }
                  size="sm"
                >
                  {player.status === 'PENDING' ? 'IN POOL' : player.status}
                </Badge>
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
