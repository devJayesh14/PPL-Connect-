import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gavel, Sparkles, Trophy, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { PlayerAvatar } from '../common/PlayerAvatar';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';

export interface SoldCelebrationData {
  player: {
    playerId?: string;
    fullName?: string;
    full_name?: string;
    photo?: string;
    playingRole?: string;
    playing_role?: string;
    categoryName?: string;
  };
  winningTeam?: {
    teamId?: string;
    teamName?: string;
    name?: string;
    teamLogo?: string;
    teamColor?: string;
  } | null;
  finalAmount: number;
  timestamp?: string;
}

interface SoldCelebrationOverlayProps {
  data: SoldCelebrationData | null;
  isAdmin?: boolean;
  loading?: boolean;
  onClose: () => void;
  onNextPlayer?: () => void;
}

/**
 * Celebratory broadcast-style SOLD overlay with multi-burst confetti,
 * hammer stamp animation, player avatar ring, and winning team highlight.
 */
export const SoldCelebrationOverlay: React.FC<SoldCelebrationOverlayProps> = ({
  data,
  isAdmin = false,
  loading = false,
  onClose,
  onNextPlayer,
}) => {
  useEffect(() => {
    if (!data) return;

    const teamColor = data.winningTeam?.teamColor || '#2563EB';
    const colors = [teamColor, '#10B981', '#F59E0B', '#FFFFFF'];

    // Center burst
    confetti({
      particleCount: 95,
      spread: 85,
      origin: { y: 0.55 },
      colors,
    });

    // Twin side cannons
    const timer1 = window.setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.08, y: 0.65 },
        colors,
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.92, y: 0.65 },
        colors,
      });
    }, 220);

    // Golden finale shower
    const timer2 = window.setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 110,
        startVelocity: 32,
        origin: { y: 0.35 },
        colors: ['#F59E0B', '#FBBF24', '#10B981', '#3B82F6'],
      });
    }, 600);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, [data]);

  if (!data) return null;

  const playerName = data.player?.fullName || data.player?.full_name || 'Player';
  const playerRole = (data.player?.playingRole || data.player?.playing_role || 'PLAYER').replace('_', ' ');
  const teamName = data.winningTeam?.teamName || data.winningTeam?.name || 'Franchise Team';
  const teamColor = data.winningTeam?.teamColor || '#2563EB';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-2xl text-white animate-sold-card">
        {/* Ambient Team Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-35 pointer-events-none"
          style={{ backgroundColor: teamColor }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          aria-label="Close celebration"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Celebration Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-slate-800/80">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Hammer Down • Official Deal</span>
          </div>

          {/* Player Avatar + Slammed SOLD Stamp */}
          <div className="relative w-32 h-32 mx-auto my-2">
            <div
              className="w-32 h-32 rounded-2xl p-1 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${teamColor}, #10B981, #F59E0B)`,
              }}
            >
              <PlayerAvatar
                src={data.player?.photo}
                name={playerName}
                className="w-full h-full rounded-[13px] overflow-hidden bg-slate-800"
                imgClassName="w-full h-full object-cover object-top"
                fallbackClassName="w-full h-full flex items-center justify-center text-3xl font-black text-white bg-slate-800"
              />
            </div>

            {/* Slammed SOLD Stamp */}
            <div className="absolute -bottom-2.5 -right-4 px-3.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm tracking-widest uppercase border-2 border-white shadow-lg flex items-center gap-1 animate-sold-stamp">
              <Gavel className="w-4 h-4" />
              <span>SOLD!</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-4">
            {playerName}
          </h2>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-0.5">
            {playerRole}
            {data.player?.categoryName ? ` • ${data.player.categoryName}` : ''}
          </p>
        </div>

        {/* Winning Franchise & Shimmering Final Bid */}
        <div className="relative p-6 space-y-4">
          <div className="rounded-2xl bg-slate-800/70 border border-slate-700/80 p-4 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Acquired By Franchise
            </span>
            <div className="flex items-center justify-center gap-2.5">
              {data.winningTeam?.teamLogo && (
                <img
                  src={data.winningTeam.teamLogo}
                  alt={teamName}
                  className="w-7 h-7 rounded-full object-cover border border-slate-600"
                />
              )}
              <span className="text-xl font-black text-blue-400 tracking-tight">{teamName}</span>
            </div>

            {/* Final Price with Shimmer Sweep */}
            <div className="relative overflow-hidden mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg">
              <div className="absolute inset-0 w-1/2 bg-white/25 blur-sm animate-shimmer-sweep pointer-events-none" />
              <span className="relative text-[10px] font-bold uppercase tracking-widest text-emerald-100 block">
                Final Winning Bid
              </span>
              <span className="relative text-3xl font-black tracking-tight">
                {formatCurrency(data.finalAmount)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {isAdmin && onNextPlayer ? (
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                Stay Here
              </Button>
              <Button
                type="button"
                size="md"
                loading={loading}
                onClick={onNextPlayer}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-lg"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Call Next Player
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="md"
              onClick={onClose}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Awesome! Back to Stage
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
