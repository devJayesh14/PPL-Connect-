import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Award, User } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { user, role, currentTeamId, availableTeams, isLoggedIn } = useAuth();

  // If not logged in, do not render any role indicator
  if (!isLoggedIn || !user) {
    return null;
  }

  // Purely read-only badge based on actual logged in account - NO role switching buttons
  if (role === 'ADMIN') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs bg-amber-50 text-amber-800 border border-amber-300 shadow-xs">
          <Shield className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Super Admin</span>
        </span>
      </div>
    );
  }

  if (role === 'CAPTAIN') {
    const currentTeam = availableTeams.find((t) => t.id === currentTeamId);
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs bg-blue-50 text-blue-800 border border-blue-200 truncate max-w-[140px] sm:max-w-none shadow-xs">
          <Award className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">{currentTeam?.shortName || currentTeam?.name || 'Team Captain'}</span>
        </span>
      </div>
    );
  }

  // If Player
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-[140px] sm:max-w-none shadow-xs">
        <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <span className="truncate">{user?.name || 'Player'}</span>
      </span>
    </div>
  );
};
