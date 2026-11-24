import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Trophy, CheckCircle2, AlertCircle, User, Upload, X } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const playerFileInputRef = useRef<HTMLInputElement>(null);

  // Unified Login form (NO mention of admin/captain/player)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form
  const [registerRole, setRegisterRole] = useState<'PLAYER' | 'CAPTAIN'>('PLAYER');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhoto, setRegPhoto] = useState('');
  const [regCategory, setRegCategory] = useState('Batsman');
  const [regTeamName, setRegTeamName] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoginLoading(true);
    setLoginError(null);

    const res = await login(email, password);
    setLoginLoading(false);
    if (res.success) {
      navigate('/');
    } else {
      setLoginError(res.message || 'Invalid email or password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail) return;

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      if (registerRole === 'PLAYER') {
        const res = await fetch('/api/auth/register-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: regName,
            email: regEmail,
            mobile: regMobile,
            password: regPassword || 'admin123',
            photo: regPhoto || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
            category: regCategory,
            auctionId: 'auc_default',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        // Automatically log in newly registered player
        const loginRes = await login(regEmail, regPassword || 'admin123');
        if (loginRes.success) {
          navigate('/');
        } else {
          setRegSuccess('Player registered successfully! You are now in the auction pool.');
        }
      } else {
        // Captain Registration
        if (!regTeamName) {
          throw new Error('Team Name is required for Captain registration.');
        }

        const res = await fetch('/api/auth/register-captain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName,
            email: regEmail,
            mobile: regMobile,
            password: regPassword || 'admin123',
            teamName: regTeamName,
            auctionId: 'auc_default',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Captain registration failed');

        setRegSuccess('Captain registration submitted successfully. Super Admin confirmation is required before you can access team bidding.');
      }
    } catch (err: any) {
      setRegError(err.message || 'Error during registration');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 sm:py-10 px-3 sm:px-4 space-y-5 sm:space-y-6">
      {/* Brand Header with Official Crest & Tagline */}
      <div className="text-center space-y-2.5">
        <div className="relative inline-block">
          <img
            src="/logo.png"
            alt="Priyanka Premiere League"
            className="w-28 h-28 sm:w-32 sm:h-32 object-contain mx-auto drop-shadow-md"
          />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Priyanka Premiere League
          </h1>
          <p className="text-xs sm:text-sm font-extrabold text-amber-600 tracking-wide uppercase mt-1">
            ★ United We Play, United We Win! ★
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Official Live Auction & Tournament Management Portal
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-center">
        <button
          onClick={() => {
            setTab('login');
            setLoginError(null);
          }}
          className={`py-2 rounded-lg transition-all cursor-pointer ${
            tab === 'login'
              ? 'bg-white text-blue-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => {
            setTab('register');
            setRegError(null);
            setRegSuccess(null);
          }}
          className={`py-2 rounded-lg transition-all cursor-pointer ${
            tab === 'register'
              ? 'bg-white text-blue-700 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Register
        </button>
      </div>

      {/* TAB 1: CLEAN SIGN IN (Zero role indicators, purely user credentials) */}
      {tab === 'login' && (
        <Card noPadding className="shadow-sm border border-slate-200">
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your credentials to access your account.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address / User ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" size="md" className="w-full text-xs font-bold" loading={loginLoading}>
                Sign In
              </Button>
            </form>

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: REGISTER (With Dropdown: Player or Captain) */}
      {tab === 'register' && (
        <Card noPadding className="shadow-sm border border-slate-200">
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Account</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your account type below to get started.
              </p>
            </div>

            {regSuccess ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Registration Complete</h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  {regSuccess}
                </p>
                <div className="pt-2">
                  <Button size="sm" variant="secondary" onClick={() => setTab('login')}>
                    Proceed to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {regError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* ROLE DROPDOWN: ONLY PLAYER AND CAPTAIN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Register As <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={registerRole}
                    onChange={(e) => {
                      setRegisterRole(e.target.value as 'PLAYER' | 'CAPTAIN');
                      setRegError(null);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PLAYER">Player</option>
                    <option value="CAPTAIN">Captain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder={registerRole === 'PLAYER' ? 'e.g. Virat Kohli' : 'e.g. Rohit Sharma'}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Fields for PLAYER */}
                {registerRole === 'PLAYER' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Playing Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={regCategory}
                        onChange={(e) => setRegCategory(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Batsman">Batsman</option>
                        <option value="Bowler">Bowler</option>
                        <option value="All-Rounder">All-Rounder</option>
                        <option value="Wicket Keeper">Wicket Keeper</option>
                      </select>
                    </div>

                    {/* Photo Upload with 20MB limit */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Profile Photo <span className="text-slate-400 font-normal">(Max 20MB)</span>
                      </label>
                      <input
                        type="file"
                        ref={playerFileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 20 * 1024 * 1024) {
                            setRegError(`Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 20MB.`);
                            return;
                          }
                          setRegError(null);
                          const reader = new FileReader();
                          reader.onload = () => setRegPhoto(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                      <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-300 shrink-0">
                          {regPhoto ? (
                            <img src={regPhoto} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => playerFileInputRef.current?.click()}
                            icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
                            className="text-xs py-1 px-2.5 bg-white border-slate-300"
                          >
                            Upload Photo
                          </Button>
                          {regPhoto && (
                            <button
                              type="button"
                              onClick={() => {
                                setRegPhoto('');
                                if (playerFileInputRef.current) playerFileInputRef.current.value = '';
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Fields for CAPTAIN */}
                {registerRole === 'CAPTAIN' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Team / Franchise Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regTeamName}
                      onChange={(e) => setRegTeamName(e.target.value)}
                      placeholder="e.g. Mumbai Titans"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Super Admin confirmation is required before accessing the captain dashboard and placing bids.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" size="md" className="w-full text-xs font-bold" loading={regLoading}>
                    {registerRole === 'PLAYER' ? 'Register as Player' : 'Submit Captain Registration'}
                  </Button>
                </div>
              </form>
            )}

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
