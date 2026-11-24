import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { RoleSwitcher } from './RoleSwitcher';
import { Button } from '../common/Button';
import { Trophy, Radio, Share2, Menu, UserCheck, LogIn, LogOut, Shield } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { isConnected } = useSocket();
  const { user, role, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="Priyanka Premiere League"
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="leading-tight">
                <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight block uppercase">
                  PRIYANKA PREMIERE LEAGUE
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-600 tracking-wider uppercase block">
                  UNITED WE PLAY, UNITED WE WIN!
                </span>
              </div>
            </Link>

            {/* Live Sync Status */}
            <div className="hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-slate-600 font-medium text-[11px]">
                {isConnected ? 'Live Sync' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Player Quick Register Action (ONLY shown when NOT logged in) */}
            {!isLoggedIn && (
              <Link to="/register-player" className="hidden sm:inline-flex">
                <Button size="sm" variant="outline" className="text-xs" icon={<UserCheck className="w-3.5 h-3.5" />}>
                  <span className="hidden md:inline">Player Registration</span>
                  <span className="md:hidden">Register</span>
                </Button>
              </Link>
            )}

            {/* Live Auction Spectator View */}
            <Link
              to="/live-auction"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span className="hidden sm:inline">Live Auction</span>
            </Link>

            {/* Role indicator (purely read-only badge when logged in, no role switching) */}
            {isLoggedIn && (
              <>
                <div className="h-5 w-px bg-slate-200 hidden sm:block" />
                <RoleSwitcher />
              </>
            )}

            {/* Login / Logout status */}
            {isLoggedIn ? (
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title={`Signed in as ${user?.name} (${role}) - Click to Log Out`}
                className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <Link to="/login">
                <Button size="sm" icon={<LogIn className="w-3.5 h-3.5" />}>
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
