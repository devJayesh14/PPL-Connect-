import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  Gavel,
  Shield,
  Award,
  Users,
  Layers,
  Lock,
  Radio,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  BarChart3,
  Settings,
  UserCheck,
  X,
  LogIn,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, currentTeamId, availableTeams, user, isLoggedIn } = useAuth();
  const currentTeam = availableTeams.find((t) => t.id === currentTeamId);

  // Full Admin suite
  const adminNav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Auctions', path: '/auctions', icon: Gavel },
    { name: 'Teams', path: '/teams', icon: Shield },
    { name: 'Captains & Approvals', path: '/captains', icon: Award },
    { name: 'Players Registry', path: '/players', icon: Users },
    { name: 'Shareable Players Pool', path: '/players-list', icon: Users, highlight: true },
    { name: 'Auction Pool', path: '/auction-pool', icon: Layers },
    { name: 'Retentions', path: '/retentions', icon: Lock },
    { name: 'Live Auction Room', path: '/live-auction', icon: Radio, highlight: true },
    { name: 'Sold Players', path: '/sold-players', icon: CheckCircle2 },
    { name: 'Unsold Players', path: '/unsold-players', icon: XCircle },
    { name: 'Final Squads', path: '/final-squads', icon: FileSpreadsheet },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Auction Rules & Bid Config', path: '/settings', icon: Settings },
  ];

  // Captain suite
  const captainNav = [
    { name: 'Captain Dashboard', path: '/captain', icon: LayoutDashboard },
    { name: 'Live Auction Bidding', path: '/captain/live', icon: Radio, highlight: true },
    { name: 'Shareable Players Pool', path: '/players-list', icon: Users, highlight: true },
    { name: 'Team Retentions', path: '/captain/retentions', icon: Lock },
    { name: 'My Squad & Purse', path: '/captain/squad', icon: Shield },
    { name: 'Auction Pool View', path: '/auction-pool', icon: Layers },
  ];

  // Player / Public suite: SIMPLIFIED (NO player registration once logged in!)
  const playerNav = [
    { name: 'Auction Details', path: '/', icon: Gavel },
    { name: 'Shareable Players Pool', path: '/players-list', icon: Users, highlight: true },
    ...(!isLoggedIn ? [{ name: 'Player Registration', path: '/register-player', icon: UserCheck, highlight: true }] : []),
    { name: 'Live Auction Screen', path: '/live-auction', icon: Radio },
  ];

  const navItems = role === 'ADMIN' ? adminNav : (role === 'CAPTAIN' ? captainNav : playerNav);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200 lg:hidden">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="PPL" className="w-8 h-8 object-contain shrink-0" />
            <div className="leading-tight">
              <span className="font-extrabold text-xs text-slate-900 uppercase block">Priyanka Premiere League</span>
              <span className="text-[8px] font-bold text-amber-600 uppercase block">United We Play, United We Win!</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Identity Card in Sidebar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Active Mode
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
              {role === 'ADMIN' ? 'Super Admin' : (role === 'CAPTAIN' ? 'Team Captain' : 'Player / Public')}
            </span>
            {role === 'CAPTAIN' && currentTeam && (
              <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[100px]">
                {currentTeam.shortName || currentTeam.name}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : item.highlight
                    ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
              {item.highlight && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer info with Logo & Tagline */}
        <div className="p-4 border-t border-slate-200 text-center bg-slate-50/60">
          <img src="/logo.png" alt="PPL Logo" className="w-12 h-12 object-contain mx-auto mb-1.5 opacity-90 drop-shadow-xs" />
          <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
            Priyanka Premiere League
          </div>
          <div className="text-[9px] font-extrabold text-amber-600 mt-0.5 uppercase tracking-wide">
            United We Play, United We Win!
          </div>
        </div>
      </aside>
    </>
  );
};
