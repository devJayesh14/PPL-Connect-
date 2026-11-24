import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Radio,
  Gavel,
} from 'lucide-react';

export const PlayerRegistrationPage: React.FC = () => {
  const { user, isLoggedIn, role } = useAuth();
  const [allowNewRegistration, setAllowNewRegistration] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [category, setCategory] = useState<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper'>('Batsman');

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle 20MB Max Image Upload
  const handleImageFile = (file: File) => {
    const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

    if (file.size > MAX_SIZE_BYTES) {
      setError(`Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 20MB limit. Please choose a smaller photo.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setError(null);
    setPhotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setPhoto(compressed);
        } else {
          setPhoto(reader.result as string);
        }
      };
      img.onerror = () => setPhoto(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto('');
    setPhotoFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      setError('Player Full Name and Email Address are required.');
      return;
    }

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/register-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: cleanEmail,
          mobile: mobile.trim(),
          photo: photo.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
          category,
          auctionId: 'auc_default',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessData(data.player);
    } catch (err: any) {
      setError(err.message || 'Error completing player registration');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN - Ultra clean, zero distraction
  if (successData) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-5">
          <img
            src="/logo.png"
            alt="Priyanka Premiere League"
            className="w-20 h-20 object-contain mx-auto drop-shadow-md"
          />

          <div>
            <Badge variant="green" size="sm">
              REGISTRATION SUCCESSFUL
            </Badge>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              Welcome, {successData.full_name}!
            </h2>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mt-1">
              United We Play, United We Win!
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Your registration has been submitted and is pending Super Admin confirmation for the auction pool.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-left text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Player Name:</span>
              <strong className="text-slate-800">{successData.full_name}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Playing Category:</span>
              <strong className="text-blue-700">{successData.playing_role}</strong>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Email:</span>
              <span className="font-mono text-slate-700">{successData.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Mobile:</span>
              <span className="font-mono text-slate-700">{successData.mobile || '—'}</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs"
              onClick={() => {
                setSuccessData(null);
                setFullName('');
                setEmail('');
                setMobile('');
                setPhoto('');
                setPhotoFileName('');
                setCategory('Batsman');
              }}
            >
              Register Another Player
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If already logged in, do not show the registration form by default
  if (isLoggedIn && !allowNewRegistration) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6 space-y-1.5">
          <img
            src="/logo.png"
            alt="Priyanka Premiere League"
            className="w-24 h-24 object-contain mx-auto drop-shadow-md"
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Priyanka Premiere League
          </h1>
          <p className="text-xs font-extrabold text-amber-600 tracking-wide uppercase">
            ★ United We Play, United We Win! ★
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Logged In</span>
            <h2 className="text-base font-extrabold text-slate-900 mt-0.5">{user?.name}</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Role: {role}
            </div>
          </div>

          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            You are already registered and signed in to PPL Connect. You can view live auction bidding or check auction details below.
          </p>

          <div className="space-y-2 pt-2">
            <Link to="/live-auction" className="block">
              <Button size="md" className="w-full text-xs font-bold" icon={<Radio className="w-4 h-4 animate-pulse" />}>
                Go to Live Auction Screen
              </Button>
            </Link>
            <Link to="/" className="block">
              <Button size="md" variant="secondary" className="w-full text-xs font-semibold" icon={<Gavel className="w-4 h-4" />} >
                View Auction Details
              </Button>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setAllowNewRegistration(true)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium underline cursor-pointer"
            >
              Need to register another candidate?
            </button>
          </div>
        </div>
      </div>
    );
  }

  // REGISTRATION FORM - Ultra clean, zero extra UI, 20MB image upload, no base price
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header with Official Crest & Tagline */}
      <div className="text-center mb-6 space-y-1.5">
        <img
          src="/logo.png"
          alt="Priyanka Premiere League"
          className="w-24 h-24 object-contain mx-auto drop-shadow-md"
        />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
          Priyanka Premiere League
        </h1>
        <p className="text-xs font-extrabold text-amber-600 tracking-wide uppercase">
          ★ United We Play, United We Win! ★
        </p>
        <p className="text-xs text-slate-500 font-medium">
          Official Player Registration Portal
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <strong className="block font-semibold">Cannot Register:</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Upload (Max 20MB) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Player Photo <span className="text-slate-400 font-normal">(Max 20MB)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex items-center gap-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white border border-slate-300 shrink-0 relative group">
                {photo ? (
                  <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 bg-slate-100">
                    <User className="w-7 h-7 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
                    className="text-xs py-1 px-2.5 bg-white border-slate-300"
                  >
                    Upload Photo
                  </Button>

                  {photo && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Remove Photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-500">
                  {photoFileName ? (
                    <span className="text-blue-700 font-medium truncate block max-w-[200px]">
                      {photoFileName}
                    </span>
                  ) : (
                    'Supports JPEG, PNG, WEBP up to 20MB'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rohit Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
              <span className="ml-1 text-[10px] text-slate-400 font-normal">
                (Duplicate emails not allowed)
              </span>
            </label>
            <input
              type="email"
              required
              placeholder="player@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Playing Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Playing Category <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="Batsman">Batsman</option>
              <option value="Bowler">Bowler</option>
              <option value="All-Rounder">All-Rounder</option>
              <option value="Wicket Keeper">Wicket Keeper</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="md"
              loading={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 shadow-xs"
              icon={<Sparkles className="w-4 h-4" />}
            >
              Submit & Register for Auction
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
