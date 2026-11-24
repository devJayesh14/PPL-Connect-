import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TournamentsPage } from './pages/admin/TournamentsPage';
import { AuctionsListPage } from './pages/admin/AuctionsListPage';
import { CreateAuctionWizard } from './pages/admin/CreateAuctionWizard';
import { TeamsPage } from './pages/admin/TeamsPage';
import { CaptainsPage } from './pages/admin/CaptainsPage';
import { PlayersPage } from './pages/admin/PlayersPage';
import { AuctionPoolPage } from './pages/admin/AuctionPoolPage';
import { RetentionsPage } from './pages/admin/RetentionsPage';
import { LiveAuctionAdmin } from './pages/admin/LiveAuctionAdmin';
import { SoldUnsoldPage } from './pages/admin/SoldUnsoldPage';
import { FinalSquadsPage } from './pages/admin/FinalSquadsPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

// Captain Pages
import { CaptainDashboard } from './pages/captain/CaptainDashboard';
import { CaptainLiveAuction } from './pages/captain/CaptainLiveAuction';
import { CaptainRetentionPage } from './pages/captain/CaptainRetentionPage';

// Player Pages
import { PlayerRegistrationPage } from './pages/player/PlayerRegistrationPage';

// Public / Simplified Player View
import { PublicAuctionView } from './pages/public/PublicAuctionView';
import { ConfirmRetentionPage } from './pages/public/ConfirmRetentionPage';

const AppContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isLoggedIn } = useAuth();

  // Standalone public routes (No login needed)
  const isRegisterRoute =
    window.location.pathname === '/register-player' ||
    window.location.pathname.startsWith('/register-player') ||
    window.location.pathname === '/player/register';

  if (isRegisterRoute) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4 sm:px-6 font-sans text-slate-900">
        <PlayerRegistrationPage />
      </div>
    );
  }

  // Standalone public Player Retention Confirmation
  if (window.location.pathname.startsWith('/confirm-retention')) {
    return <ConfirmRetentionPage />;
  }

  // STRICT REQUIREMENT: "without login do not show anything"
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
        <LoginPage />
      </div>
    );
  }

  // Once authenticated, show role-based layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 w-full max-w-full">
          <Routes>
            {/* Role Home Routing */}
            <Route
              path="/"
              element={
                role === 'ADMIN' ? (
                  <AdminDashboard />
                ) : role === 'CAPTAIN' ? (
                  <CaptainDashboard />
                ) : (
                  <PublicAuctionView />
                )
              }
            />

            {/* Admin Management (Strictly accessible ONLY when logged in as ADMIN) */}
            <Route path="/tournaments" element={role === 'ADMIN' ? <TournamentsPage /> : <Navigate to="/" replace />} />
            <Route path="/auctions" element={role === 'ADMIN' ? <AuctionsListPage /> : <Navigate to="/" replace />} />
            <Route path="/auctions/create" element={role === 'ADMIN' ? <CreateAuctionWizard /> : <Navigate to="/" replace />} />
            <Route path="/teams" element={role === 'ADMIN' ? <TeamsPage /> : <Navigate to="/" replace />} />
            <Route path="/captains" element={role === 'ADMIN' ? <CaptainsPage /> : <Navigate to="/" replace />} />
            <Route path="/players" element={role === 'ADMIN' ? <PlayersPage /> : <Navigate to="/" replace />} />
            <Route path="/auction-pool" element={role === 'ADMIN' ? <AuctionPoolPage /> : <Navigate to="/" replace />} />
            <Route path="/retentions" element={role === 'ADMIN' ? <RetentionsPage /> : <Navigate to="/" replace />} />
            <Route
              path="/live-auction"
              element={
                role === 'CAPTAIN' ? (
                  <CaptainLiveAuction />
                ) : (
                  <LiveAuctionAdmin />
                )
              }
            />
            <Route path="/sold-players" element={role === 'ADMIN' ? <SoldUnsoldPage initialTab="sold" /> : <Navigate to="/" replace />} />
            <Route path="/unsold-players" element={role === 'ADMIN' ? <SoldUnsoldPage initialTab="unsold" /> : <Navigate to="/" replace />} />
            <Route path="/final-squads" element={role === 'ADMIN' ? <FinalSquadsPage /> : <Navigate to="/" replace />} />
            <Route path="/reports" element={role === 'ADMIN' ? <ReportsPage /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={role === 'ADMIN' ? <SettingsPage /> : <Navigate to="/" replace />} />

            {/* Captain Specific */}
            <Route path="/captain" element={role === 'CAPTAIN' ? <CaptainDashboard /> : <Navigate to="/" replace />} />
            <Route path="/captain/live" element={role === 'CAPTAIN' ? <CaptainLiveAuction /> : <Navigate to="/" replace />} />
            <Route path="/captain/retentions" element={role === 'CAPTAIN' ? <CaptainRetentionPage /> : <Navigate to="/" replace />} />
            <Route path="/captain/squad" element={role === 'CAPTAIN' ? <CaptainDashboard /> : <Navigate to="/" replace />} />

            {/* Player Specific */}
            <Route path="/register-player" element={<PlayerRegistrationPage />} />
            <Route path="/player/register" element={<PlayerRegistrationPage />} />
            <Route path="/player/profile" element={<PlayerRegistrationPage />} />

            {/* Auction Views */}
            <Route path="/auction/:auctionId" element={<PublicAuctionView />} />
            <Route
              path="/auction/:auctionId/live"
              element={
                role === 'CAPTAIN' ? (
                  <CaptainLiveAuction />
                ) : (
                  <LiveAuctionAdmin />
                )
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
