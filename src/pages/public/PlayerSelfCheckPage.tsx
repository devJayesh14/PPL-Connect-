import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  User,
  Shield,
  Trophy,
  ArrowRight,
  UserPlus,
  Share2,
  Copy,
  Check,
  RefreshCw,
  Camera,
  Upload,
  AlertTriangle,
} from 'lucide-react';

interface FoundPlayer {
  id: string;
  fullName: string;
  photo?: string;
  maskedEmail: string;
  maskedMobile: string;
  playingRole: string;
  battingStyle?: string;
  bowlingStyle?: string;
  status: string;
  basePrice: number;
  isRetained: boolean;
  retainedTeam?: string | null;
  registeredAt: string;
  hasPhoto: boolean;
}

export const PlayerSelfCheckPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [foundPlayer, setFoundPlayer] = useState<FoundPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Photo upload and compression state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const registrationUrl = `${window.location.origin}/register`;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !foundPlayer) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    try {
      setUploadingPhoto(true);
      setPhotoError(null);
      setPhotoSuccess(null);

      const compressedBase64 = await compressImage(file);

      const res = await fetch('/api/players/self-update-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: foundPlayer.id,
          query: searchedQuery,
          photo: compressedBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      setFoundPlayer((prev) => (prev ? { ...prev, photo: compressedBase64, hasPhoto: true } : prev));
      setPhotoSuccess('✓ Profile photo updated successfully!');
      setTimeout(() => setPhotoSuccess(null), 5000);
    } catch (err: any) {
      setPhotoError(err.message || 'Error updating photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setError('Please enter your mobile number or email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(false);
    setFoundPlayer(null);
    setSearchedQuery(cleanQuery);

    try {
      const res = await fetch(`/api/players/self-check?q=${encodeURIComponent(cleanQuery)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check registration');
      }

      setHasSearched(true);
      if (data.found && data.player) {
        setFoundPlayer(data.player);
      } else {
        setFoundPlayer(null);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyRegisterLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 px-4">
      {/* Brand Header */}
      <div className="text-center mb-6 space-y-2">
        <Link to="/" className="inline-block">
          <img
            src="/logo.png"
            alt="Priyanka Premiere League"
            className="w-20 h-20 object-contain mx-auto drop-shadow-md hover:scale-105 transition-transform"
          />
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
          Player Registration Check
        </h1>
        <p className="text-xs font-extrabold text-amber-600 tracking-wide uppercase">
          ★ Priyanka Premiere League 2026 ★
        </p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Verify whether you are registered in the player database by entering your mobile number or email.
        </p>
      </div>

      {/* Main Check Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Enter Mobile Number or Email ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 9876543210 or yourname@gmail.com"
                className="w-full text-xs font-medium border border-slate-300 rounded-xl pl-3.5 pr-10 py-3 bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setHasSearched(false);
                    setFoundPlayer(null);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="md"
            className="w-full text-xs font-bold py-2.5 shadow-sm"
            disabled={loading || !query.trim()}
            icon={loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          >
            {loading ? 'Searching Database...' : 'Check Registration Status'}
          </Button>
        </form>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* RESULTS: FOUND PLAYER */}
        {hasSearched && foundPlayer && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <Badge variant="green" size="sm">
                  REGISTRATION CONFIRMED
                </Badge>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5 truncate">
                  {foundPlayer.fullName}
                </h3>
              </div>
            </div>

            {/* Profile Photo Display & Upload Section */}
            <div className="bg-white rounded-xl border border-emerald-100 p-4 flex flex-col items-center justify-center text-center shadow-2xs">
              <div className="relative group">
                <div
                  className={`w-28 h-28 rounded-2xl overflow-hidden border-2 shadow-md transition-all ${
                    foundPlayer.photo && foundPlayer.hasPhoto
                      ? 'border-blue-500 bg-slate-100 ring-2 ring-blue-100'
                      : 'border-amber-400 bg-amber-50 ring-4 ring-amber-100 animate-pulse'
                  }`}
                >
                  {foundPlayer.photo ? (
                    <img
                      src={foundPlayer.photo}
                      alt={foundPlayer.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-600 p-2 text-center bg-amber-50">
                      <User className="w-10 h-10 text-amber-500 mb-1" />
                      <span className="text-[10px] font-black uppercase text-amber-700">No Photo</span>
                    </div>
                  )}
                </div>

                {/* Quick overlay change button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-md border-2 border-white transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                  title={foundPlayer.photo ? 'Change Profile Photo' : 'Upload Profile Photo'}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Action Button Below Image */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {uploadingPhoto
                  ? 'Compressing & Uploading...'
                  : foundPlayer.photo
                  ? 'Change Profile Photo'
                  : 'Upload Profile Photo'}
              </button>
            </div>

            {/* Warning when Photo is missing */}
            {!foundPlayer.photo && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 text-xs space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-900 block text-xs">
                      ⚠️ Action Required: Profile Photo Missing!
                    </span>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      Please upload your profile photo. Photos are shown on the live auction screen during team bidding and on official final team squad rosters.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingPhoto ? 'Uploading Photo...' : 'Upload Profile Photo Now'}
                </Button>
              </div>
            )}

            {/* Success message upon upload */}
            {photoSuccess && (
              <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{photoSuccess}</span>
              </div>
            )}

            {/* Error message upon upload failure */}
            {photoError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}

            <div className="bg-white rounded-xl border border-emerald-100 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Playing Role:</span>
                <strong className="text-blue-700 font-bold">{foundPlayer.playingRole}</strong>
              </div>

              {foundPlayer.isRetained && foundPlayer.retainedTeam && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                    <Shield className="w-3 h-3 text-amber-600" />
                    Retained by {foundPlayer.retainedTeam}
                  </span>
                </div>
              )}

              {!foundPlayer.isRetained && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Auction Pool:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                    <Trophy className="w-3 h-3 text-emerald-600" />
                    In Pool (Base: ₹{foundPlayer.basePrice})
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Mobile:</span>
                <span className="font-mono text-slate-700 font-medium">{foundPlayer.maskedMobile || '—'}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-700 font-medium">{foundPlayer.maskedEmail || '—'}</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 font-medium text-center">
              ✓ You are officially registered for the tournament.
            </p>

            <div className="pt-1 flex gap-2">
              <Link to="/players-list" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs py-2 bg-white">
                  View Full Player List
                </Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button size="sm" variant="secondary" className="w-full text-xs py-2">
                  Go to Home
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* RESULTS: NOT FOUND (DIRECT CALL TO ACTION TO REGISTER) */}
        {hasSearched && !foundPlayer && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50/60 p-5 text-center space-y-4 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full">
                NOT REGISTERED
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-2">
                No Registration Found
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                We could not find any player registered with <strong className="text-slate-800 break-all">"{searchedQuery}"</strong>.
              </p>
            </div>

            {/* Direct Register Button */}
            <div className="pt-2 space-y-2.5">
              <Link to="/register" className="block">
                <Button
                  size="md"
                  variant="primary"
                  className="w-full text-xs font-bold py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-white flex items-center justify-center gap-2"
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Register As A Player Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <p className="text-[11px] text-slate-500 font-medium">
                Registration is free and takes less than 1 minute!
              </p>
            </div>

            {/* Shareable registration link */}
            <div className="pt-2 border-t border-rose-200/60">
              <div className="flex items-center gap-1.5 p-2 bg-white rounded-lg border border-rose-200 text-left">
                <input
                  type="text"
                  readOnly
                  value={registrationUrl}
                  className="flex-1 text-[11px] font-mono text-slate-600 bg-transparent outline-none truncate"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyRegisterLink}
                  className="text-[10px] py-1 px-2 shrink-0 border-slate-300"
                  icon={copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Quick Links */}
        <div className="pt-3 border-t border-slate-100 text-center space-y-2">
          <Link
            to="/register"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Need to register a new player? Click here
          </Link>
          <div>
            <Link
              to="/players-list"
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              View Confirmed Players List →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
