import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Lazy Loaded Page Components for high-performance lazy loading architecture
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const TournamentsPage = lazy(() => import('./pages/admin/TournamentsPage').then(m => ({ default: m.TournamentsPage })));
const AuctionsListPage = lazy(() => import('./pages/admin/AuctionsListPage').then(m => ({ default: m.AuctionsListPage })));
const CreateAuctionWizard = lazy(() => import('./pages/admin/CreateAuctionWizard').then(m => ({ default: m.CreateAuctionWizard })));
const TeamsPage = lazy(() => import('./pages/admin/TeamsPage').then(m => ({ default: m.TeamsPage })));
const CaptainsPage = lazy(() => import('./pages/admin/CaptainsPage').then(m => ({ default: m.CaptainsPage })));
const PlayersPage = lazy(() => import('./pages/admin/PlayersPage').then(m => ({ default: m.PlayersPage })));
const AuctionPoolPage = lazy(() => import('./pages/admin/AuctionPoolPage').then(m => ({ default: m.AuctionPoolPage })));
const RetentionsPage = lazy(() => import('./pages/admin/RetentionsPage').then(m => ({ default: m.RetentionsPage })));
const LiveAuctionAdmin = lazy(() => import('./pages/admin/LiveAuctionAdmin').then(m => ({ default: m.LiveAuctionAdmin })));
const SoldUnsoldPage = lazy(() => import('./pages/admin/SoldUnsoldPage').then(m => ({ default: m.SoldUnsoldPage })));
const FinalSquadsPage = lazy(() => import('./pages/admin/FinalSquadsPage').then(m => ({ default: m.FinalSquadsPage })));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Captain Pages
const CaptainDashboard = lazy(() => import('./pages/captain/CaptainDashboard').then(m => ({ default: m.CaptainDashboard })));
const CaptainLiveAuction = lazy(() => import('./pages/captain/CaptainLiveAuction').then(m => ({ default: m.CaptainLiveAuction })));
const CaptainRetentionPage = lazy(() => import('./pages/captain/CaptainRetentionPage').then(m => ({ default: m.CaptainRetentionPage })));

// Player Pages
const PlayerRegistrationPage = lazy(() => import('./pages/player/PlayerRegistrationPage').then(m => ({ default: m.PlayerRegistrationPage })));

// Public / Simplified Player View
const PublicAuctionView = lazy(() => import('./pages/public/PublicAuctionView').then(m => ({ default: m.PublicAuctionView })));
const ConfirmRetentionPage = lazy(() => import('./pages/public/ConfirmRetentionPage').then(m => ({ default: m.ConfirmRetentionPage })));
const PublicPlayersListPage = lazy(() => import('./pages/public/PublicPlayersListPage').then(m => ({ default: m.PublicPlayersListPage })));
const PlayerSelfCheckPage = lazy(() => import('./pages/public/PlayerSelfCheckPage').then(m => ({ default: m.PlayerSelfCheckPage })));

// Lightweight hardware-friendly fallback loader
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
      Loading Priyanka Premiere League...
    </span>
  </div>
);

const AppContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, isLoggedIn } = useAuth();

  const currentPath = window.location.pathname;

  // Standalone public routes (No login needed)
  const isRegisterRoute =
    currentPath === '/register' ||
    currentPath === '/register-player' ||
    currentPath.startsWith('/register-player') ||
    currentPath === '/player/register';

  if (isRegisterRoute) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4 sm:px-6 font-sans text-slate-900">
          <PlayerRegistrationPage />
        </div>
      </Suspense>
    );
  }

  // Standalone public Player Self Check (Check if registered by phone or email)
  const isSelfCheckRoute =
    currentPath === '/check' ||
    currentPath === '/self-check' ||
    currentPath === '/check-status' ||
    currentPath === '/player-check' ||
    currentPath === '/check-registration';

  if (isSelfCheckRoute) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-10 px-4 sm:px-6 font-sans text-slate-900">
          <PlayerSelfCheckPage />
        </div>
      </Suspense>
    );
  }

  // Standalone public Player Retention Confirmation
  if (currentPath.startsWith('/confirm-retention')) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/confirm-retention/:token" element={<ConfirmRetentionPage />} />
          <Route path="/confirm-retention" element={<ConfirmRetentionPage />} />
          <Route path="*" element={<ConfirmRetentionPage />} />
        </Routes>
      </Suspense>
    );
  }

  // Standalone shareable Player Pool (Captains / Public link)
  if (currentPath === '/players-list' || currentPath === '/players-pool') {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <PublicPlayersListPage />
      </Suspense>
    );
  }

  // STRICT REQUIREMENT: "without login do not show anything"
  if (!isLoggedIn) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
          <LoginPage />
        </div>
      </Suspense>
    );
  }

  // Once authenticated, show role-based layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 w-full max-w-full">
          <Suspense fallback={<PageLoadingFallback />}>
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

              {/* Shareable Players Pool (Accessible to all logged in users) */}
              <Route path="/players-list" element={<PublicPlayersListPage />} />
              <Route path="/players-pool" element={<PublicPlayersListPage />} />

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

              {/* Player Self-Check & Registration */}
              <Route path="/register" element={<PlayerRegistrationPage />} />
              <Route path="/register-player" element={<PlayerRegistrationPage />} />
              <Route path="/player/register" element={<PlayerRegistrationPage />} />
              <Route path="/player/profile" element={<PlayerRegistrationPage />} />
              <Route path="/check" element={<PlayerSelfCheckPage />} />
              <Route path="/self-check" element={<PlayerSelfCheckPage />} />
              <Route path="/check-status" element={<PlayerSelfCheckPage />} />
              <Route path="/player-check" element={<PlayerSelfCheckPage />} />
              <Route path="/check-registration" element={<PlayerSelfCheckPage />} />

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
          </Suspense>
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
