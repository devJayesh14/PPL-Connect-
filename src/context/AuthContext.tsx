import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Team, User } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoggedIn: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setRole: (role: UserRole) => void;
  currentTeamId: string;
  setCurrentTeamId: (teamId: string) => void;
  availableTeams: Team[];
  refreshTeams: () => void;
  currentUserId: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ppl_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [role, setRoleState] = useState<UserRole>(() => {
    const savedUser = localStorage.getItem('ppl_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser).role;
      } catch {}
    }
    return (localStorage.getItem('ppl_role') as UserRole) || 'PLAYER';
  });

  const [currentTeamId, setCurrentTeamIdState] = useState<string>(() => {
    const saved = localStorage.getItem('ppl_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.teamId) return parsed.teamId;
      } catch {}
    }
    return localStorage.getItem('ppl_team_id') || '';
  });

  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setAvailableTeams(data);

        // Auto-link captain to their actual team
        const saved = localStorage.getItem('ppl_user');
        const currentUser = saved ? JSON.parse(saved) : user;
        if (currentUser?.role === 'CAPTAIN') {
          const myTeam = data.find(
            (t: any) =>
              t.id === currentUser.teamId ||
              (t.captain_email && t.captain_email.toLowerCase() === currentUser.email?.toLowerCase())
          );
          if (myTeam) {
            setCurrentTeamIdState(myTeam.id);
            localStorage.setItem('ppl_team_id', myTeam.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load teams', e);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Login failed' };
      }

      setUser(data.user);
      setRoleState(data.user.role);
      localStorage.setItem('ppl_user', JSON.stringify(data.user));
      localStorage.setItem('ppl_role', data.user.role);

      if (data.user.teamId) {
        setCurrentTeamIdState(data.user.teamId);
        localStorage.setItem('ppl_team_id', data.user.teamId);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    setRoleState('PLAYER');
    localStorage.removeItem('ppl_user');
    localStorage.removeItem('ppl_role');
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('ppl_role', newRole);
  };

  const setCurrentTeamId = (teamId: string) => {
    setCurrentTeamIdState(teamId);
    localStorage.setItem('ppl_team_id', teamId);
  };

  const currentUserId = user?.id || (role === 'ADMIN' ? 'usr_admin' : 'usr_guest');

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoggedIn: !!user,
        login,
        logout,
        setRole,
        currentTeamId,
        setCurrentTeamId,
        availableTeams,
        refreshTeams: fetchTeams,
        currentUserId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
