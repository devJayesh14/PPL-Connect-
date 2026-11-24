import React from 'react';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface LiveTimerProps {
  seconds: number;
  totalSeconds?: number;
  isRunning: boolean;
}

export const LiveTimer: React.FC<LiveTimerProps> = ({
  seconds,
  totalSeconds = 30,
  isRunning,
}) => {
  const percentage = Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));
  const isUrgent = seconds <= 5;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-card">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        <Clock className={clsx('w-3.5 h-3.5', isRunning && isUrgent ? 'text-amber-500 animate-spin' : 'text-blue-600')} />
        <span>Bid Clock</span>
      </div>

      <div className="relative flex items-center justify-center w-24 h-24">
        {/* SVG Circle progress */}
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            className="text-slate-100"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            className={clsx(
              'transition-all duration-500 ease-linear',
              isUrgent ? 'text-amber-500' : 'text-blue-600'
            )}
            strokeWidth="6"
            strokeDasharray={2 * Math.PI * 40}
            strokeDashoffset={(2 * Math.PI * 40) * (1 - percentage / 100)}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute flex flex-col items-center">
          <span
            className={clsx(
              'text-3xl font-extrabold tracking-tight',
              isUrgent ? 'text-amber-600' : 'text-slate-900',
              isRunning && isUrgent && 'animate-pulse'
            )}
          >
            {seconds}s
          </span>
          <span className="text-[10px] text-slate-400 font-medium -mt-1">
            {isRunning ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>
      </div>

      {isUrgent && isRunning && (
        <span className="mt-2 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          Auto-extends on bid
        </span>
      )}
    </div>
  );
};
