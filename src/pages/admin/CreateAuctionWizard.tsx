import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency } from '../../utils/formatters';
import {
  Info,
  Shield,
  Wallet,
  Users,
  Lock,
  Layers,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

export const CreateAuctionWizard: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    tournamentId: '',
    name: 'Surat Premier League 2026 Auction',
    description: 'Annual mega player auction for Surat Premier League championship.',
    auctionDate: '2026-12-10',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    timezone: 'IST (+05:30)',
    logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=400&fit=crop',
    status: 'DRAFT',

    // Step 2: Teams & Captains
    teams: [
      { name: 'Surat Super Kings', shortName: 'SSK', color: '#2563EB', purse: 20000, captainName: 'Kunal Patel', captainEmail: 'kunal@ssk.com', captainMobile: '+91 98980 11111' },
      { name: 'Tapi Titans', shortName: 'TT', color: '#1D4ED8', purse: 20000, captainName: 'Mehul Shah', captainEmail: 'mehul@tt.com', captainMobile: '+91 98980 22222' },
      { name: 'Diamond City Warriors', shortName: 'DCW', color: '#0F172A', purse: 20000, captainName: 'Chirag Desai', captainEmail: 'chirag@dcw.com', captainMobile: '+91 98980 33333' },
      { name: 'Varachha Strikers', shortName: 'VS', color: '#3B82F6', purse: 20000, captainName: 'Hardik Vaghani', captainEmail: 'hardik@vs.com', captainMobile: '+91 98980 44444' },
    ],

    // Step 3: Purse & Pricing
    totalPursePerTeam: 20000,
    currency: 'INR',
    currencySymbol: '₹',
    allowDifferentPursePerTeam: false,
    startingPurse: 20000,
    allowPurseAdjustment: true,
    allowAdminManualPurseAdjustment: true,

    // Step 4: Squad Rules
    minPlayersPerTeam: 11,
    maxPlayersPerTeam: 15,
    minOverseasPlayers: 0,
    maxOverseasPlayers: 4,

    // Step 5: Retention Rules
    enableRetention: true,
    minRetentions: 0,
    maxRetentions: 1,
    retentionUsesPurse: false,
    retentionPriceModel: 'FLAT',
    retentionPrices: [0],

    // Step 6: Player Categories
    categories: [
      { name: 'Batsman', basePrice: 500, minPlayers: 1, maxPlayers: 10, description: 'Top & middle order batsmen' },
      { name: 'Bowler', basePrice: 500, minPlayers: 1, maxPlayers: 10, description: 'Fast bowlers & spinners' },
      { name: 'All-Rounder', basePrice: 500, minPlayers: 1, maxPlayers: 10, description: 'Batting & bowling all-rounders' },
      { name: 'Wicket Keeper', basePrice: 500, minPlayers: 1, maxPlayers: 5, description: 'Wicket keeper batsmen' },
    ],

    // Step 7: Auction Rules
    minBasePrice: 100,
    defaultBasePrice: 500,
    maxBasePrice: 50000,
    allowIndividualBasePrice: true,
    bidIncrement: 100,
    bidIncrementType: 'FIXED',
    bidTimerSeconds: 30,
    autoExtension: true,
    extensionThresholdSeconds: 5,
    extensionDurationSeconds: 10,
    maxReauctionAttempts: 2,

    // Step 8: Registration Rules
    registrationOpen: true,
    registrationDeadline: '2026-12-05',
  });

  useEffect(() => {
    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data) => {
        setTournaments(data);
        if (data.length > 0 && !formData.tournamentId) {
          setFormData((prev) => ({ ...prev, tournamentId: data[0].id }));
        }
      })
      .catch(console.error);
  }, []);

  const stepsList = [
    { num: 1, title: 'Basic Info', icon: Info },
    { num: 2, title: 'Teams & Captains', icon: Shield },
    { num: 3, title: 'Purse & Pricing', icon: Wallet },
    { num: 4, title: 'Squad Rules', icon: Users },
    { num: 5, title: 'Retention Rules', icon: Lock },
    { num: 6, title: 'Categories', icon: Layers },
    { num: 7, title: 'Auction Rules', icon: Clock },
    { num: 8, title: 'Registration', icon: UserCheck },
    { num: 9, title: 'Review & Create', icon: CheckCircle2 },
  ];

  const handleNext = () => {
    if (step < 9) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);

    try {
      const payload = {
        tournamentId: formData.tournamentId,
        name: formData.name,
        description: formData.description,
        auctionDate: formData.auctionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        timezone: formData.timezone,
        logo: formData.logo,
        banner: formData.banner,
        teams: formData.teams,
        totalPursePerTeam: Number(formData.totalPursePerTeam),
        currency: formData.currency,
        currencySymbol: formData.currencySymbol,
        allowDifferentPursePerTeam: formData.allowDifferentPursePerTeam,
        startingPurse: Number(formData.startingPurse),
        allowPurseAdjustment: formData.allowPurseAdjustment,
        allowAdminManualPurseAdjustment: formData.allowAdminManualPurseAdjustment,
        minBasePrice: Number(formData.minBasePrice),
        defaultBasePrice: Number(formData.defaultBasePrice),
        maxBasePrice: Number(formData.maxBasePrice),
        allowIndividualBasePrice: formData.allowIndividualBasePrice,
        bidIncrement: Number(formData.bidIncrement),
        bidIncrementType: formData.bidIncrementType,
        minPlayersPerTeam: Number(formData.minPlayersPerTeam),
        maxPlayersPerTeam: Number(formData.maxPlayersPerTeam),
        minOverseasPlayers: Number(formData.minOverseasPlayers),
        maxOverseasPlayers: Number(formData.maxOverseasPlayers),
        enableRetention: formData.enableRetention,
        minRetentions: Number(formData.minRetentions),
        maxRetentions: Number(formData.maxRetentions),
        retentionUsesPurse: formData.retentionUsesPurse,
        retentionPriceModel: formData.retentionPriceModel,
        retentionPriceConfig: formData.retentionPrices,
        categories: formData.categories,
        bidTimerSeconds: Number(formData.bidTimerSeconds),
        autoExtension: formData.autoExtension,
        extensionThresholdSeconds: Number(formData.extensionThresholdSeconds),
        extensionDurationSeconds: Number(formData.extensionDurationSeconds),
        maxReauctionAttempts: Number(formData.maxReauctionAttempts),
        registrationOpen: formData.registrationOpen,
        registrationDeadline: formData.registrationDeadline,
        status: 'AUCTION_SCHEDULED',
      };

      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create auction');
      }

      const created = await res.json();
      navigate('/auctions');
    } catch (e: any) {
      setSubmitError(e.message || 'Error creating auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Create New Sports Auction
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete the 9-step configuration flow. All auction rules, purse constraints, and retention limits are dynamically stored in database.
        </p>
      </div>

      {/* Mobile Step Header (visible on < md) */}
      <div className="md:hidden bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-blue-600 uppercase tracking-wider">
            Step {step} of 9
          </span>
          <span className="font-bold text-slate-800">
            {stepsList[step - 1]?.title}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 9) * 100}%` }}
          />
        </div>
      </div>

      {/* Stepper (Section 25 - Desktop md+) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl p-3 shadow-card overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {stepsList.map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCompleted
                      ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-blue-600'
                        : isCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </span>
                  <span>{s.title}</span>
                </button>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`h-0.5 w-6 ${
                      step > s.num ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
          {submitError}
        </div>
      )}

      {/* Wizard Step Content */}
      <Card noPadding>
        <div className="p-6">
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 1: Basic Auction Information</h3>
                <p className="text-xs text-slate-500">Provide the auction title, connected tournament, schedule, and assets.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tournament <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.tournamentId}
                    onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {tournaments.length === 0 ? (
                      <option value="">Default Tournament (PPL Championship)</option>
                    ) : (
                      tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.sport})
                        </option>
                      ))
                    )}
                  </select>
                  {tournaments.length === 0 && (
                    <p className="text-[11px] text-blue-600 mt-1">
                      No custom tournaments found. A default PPL Championship tournament will be linked automatically.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auction Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Surat Premier League 2026 Auction"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auction Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Auction Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.auctionDate}
                    onChange={(e) => setFormData({ ...formData, auctionDate: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      placeholder="10:00 AM"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="text"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      placeholder="06:00 PM"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shareable Link Slug Preview
                  </label>
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-blue-700">
                    /auction/{formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-preview
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Teams & Captains */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Step 2: Teams & Captains</h3>
                  <p className="text-xs text-slate-500">Configure participating franchise teams and assign approved captains.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      teams: [
                        ...formData.teams,
                        {
                          name: `Team ${formData.teams.length + 1}`,
                          shortName: `T${formData.teams.length + 1}`,
                          color: '#2563EB',
                          purse: formData.totalPursePerTeam,
                          captainName: '',
                          captainEmail: '',
                          captainMobile: '',
                        },
                      ],
                    });
                  }}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Team
                </Button>
              </div>

              <div className="space-y-3">
                {formData.teams.map((t, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Team #{idx + 1}</span>
                      {formData.teams.length > 2 && (
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              teams: formData.teams.filter((_, i) => i !== idx),
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Team Name
                        </label>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...formData.teams];
                            updated[idx].name = e.target.value;
                            setFormData({ ...formData, teams: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Short Code
                        </label>
                        <input
                          type="text"
                          value={t.shortName}
                          onChange={(e) => {
                            const updated = [...formData.teams];
                            updated[idx].shortName = e.target.value;
                            setFormData({ ...formData, teams: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Captain Name
                        </label>
                        <input
                          type="text"
                          value={t.captainName}
                          onChange={(e) => {
                            const updated = [...formData.teams];
                            updated[idx].captainName = e.target.value;
                            setFormData({ ...formData, teams: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Captain Email
                        </label>
                        <input
                          type="email"
                          value={t.captainEmail}
                          onChange={(e) => {
                            const updated = [...formData.teams];
                            updated[idx].captainEmail = e.target.value;
                            setFormData({ ...formData, teams: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Captain Mobile
                        </label>
                        <input
                          type="text"
                          value={t.captainMobile}
                          onChange={(e) => {
                            const updated = [...formData.teams];
                            updated[idx].captainMobile = e.target.value;
                            setFormData({ ...formData, teams: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                        />
                      </div>
                      {formData.allowDifferentPursePerTeam && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Individual Purse (₹)
                          </label>
                          <input
                            type="number"
                            value={t.purse}
                            onChange={(e) => {
                              const updated = [...formData.teams];
                              updated[idx].purse = Number(e.target.value);
                              setFormData({ ...formData, teams: updated });
                            }}
                            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Purse & Pricing (Section 5) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 3: Auction Purse Configuration</h3>
                <p className="text-xs text-slate-500">Configure total purse per team, currency, manual purse adjustments, and differential purses.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Starting Purse Per Team (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.totalPursePerTeam}
                    onChange={(e) => setFormData({ ...formData, totalPursePerTeam: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Display: {formatCurrency(formData.totalPursePerTeam)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.allowDifferentPursePerTeam}
                      onChange={(e) => setFormData({ ...formData, allowDifferentPursePerTeam: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Allow Different Purse Per Team (e.g. Team A: ₹10L, Team B: ₹12L)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.allowAdminManualPurseAdjustment}
                      onChange={(e) => setFormData({ ...formData, allowAdminManualPurseAdjustment: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Allow Admin Manual Purse Adjustment during / after auction</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Squad Rules (Section 7) */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 4: Squad Limits & Overseas Configuration</h3>
                <p className="text-xs text-slate-500">Configure minimum and maximum squad sizes. The system will enforce smart purse locks based on these values.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Players Per Team <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.minPlayersPerTeam}
                    onChange={(e) => setFormData({ ...formData, minPlayersPerTeam: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Used by Smart Purse Validator to reserve funds for remaining squad spots.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maximum Players Per Team <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.maxPlayersPerTeam}
                    onChange={(e) => setFormData({ ...formData, maxPlayersPerTeam: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    System prevents bidding once team reaches this ceiling.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Overseas Players
                  </label>
                  <input
                    type="number"
                    value={formData.minOverseasPlayers}
                    onChange={(e) => setFormData({ ...formData, minOverseasPlayers: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maximum Overseas Players
                  </label>
                  <input
                    type="number"
                    value={formData.maxOverseasPlayers}
                    onChange={(e) => setFormData({ ...formData, maxOverseasPlayers: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Retention Rules (Section 9) */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 5: Retention Configuration</h3>
                <p className="text-xs text-slate-500">Configure team retention window, tiered or flat price deduction models.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.enableRetention}
                    onChange={(e) => setFormData({ ...formData, enableRetention: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Enable Pre-Auction Player Retentions</span>
                </label>

                {formData.enableRetention && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Maximum Retentions Per Team
                      </label>
                      <input
                        type="number"
                        value={formData.maxRetentions}
                        onChange={(e) => setFormData({ ...formData, maxRetentions: Number(e.target.value) })}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pricing Model
                      </label>
                      <select
                        value={formData.retentionPriceModel}
                        onChange={(e) => setFormData({ ...formData, retentionPriceModel: e.target.value })}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="TIERED">Tiered Pricing (1st, 2nd, 3rd retention)</option>
                        <option value="FLAT">Flat Price for all retentions</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tiered Retention Prices (₹)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {formData.retentionPrices.map((price, idx) => (
                          <div key={idx}>
                            <span className="text-[10px] text-slate-500 block mb-0.5">
                              Retention #{idx + 1}
                            </span>
                            <input
                              type="number"
                              value={price}
                              onChange={(e) => {
                                const updated = [...formData.retentionPrices];
                                updated[idx] = Number(e.target.value);
                                setFormData({ ...formData, retentionPrices: updated });
                              }}
                              className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {formatCurrency(price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                        <input
                          type="checkbox"
                          checked={formData.retentionUsesPurse}
                          onChange={(e) => setFormData({ ...formData, retentionUsesPurse: e.target.checked })}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Retention Price Deducts From Team Starting Purse</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Player Categories (Section 10) */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Step 6: Player Categories</h3>
                  <p className="text-xs text-slate-500">Define custom tiers or role categories with specific base prices and limits.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      categories: [
                        ...formData.categories,
                        { name: `Category ${formData.categories.length + 1}`, basePrice: 500, minPlayers: 1, maxPlayers: 5, description: '' },
                      ],
                    });
                  }}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Category
                </Button>
              </div>

              <div className="space-y-3">
                {formData.categories.map((cat, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const updated = [...formData.categories];
                          updated[idx].name = e.target.value;
                          setFormData({ ...formData, categories: updated });
                        }}
                        className="text-xs font-bold border border-slate-300 rounded-lg p-1.5 bg-white text-slate-900"
                      />
                      {formData.categories.length > 1 && (
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              categories: formData.categories.filter((_, i) => i !== idx),
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Base Price (₹)</span>
                        <input
                          type="number"
                          value={cat.basePrice}
                          onChange={(e) => {
                            const updated = [...formData.categories];
                            updated[idx].basePrice = Number(e.target.value);
                            setFormData({ ...formData, categories: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Min Players</span>
                        <input
                          type="number"
                          value={cat.minPlayers}
                          onChange={(e) => {
                            const updated = [...formData.categories];
                            updated[idx].minPlayers = Number(e.target.value);
                            setFormData({ ...formData, categories: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">Max Players</span>
                        <input
                          type="number"
                          value={cat.maxPlayers}
                          onChange={(e) => {
                            const updated = [...formData.categories];
                            updated[idx].maxPlayers = Number(e.target.value);
                            setFormData({ ...formData, categories: updated });
                          }}
                          className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: Auction Rules (Sections 6, 16) */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 7: Bidding Rules & Countdown Timer</h3>
                <p className="text-xs text-slate-500">Configure bid increment amounts, bid timer, auto-extension window, and re-auction limits.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bid Increment Value
                  </label>
                  <input
                    type="number"
                    value={formData.bidIncrement}
                    onChange={(e) => setFormData({ ...formData, bidIncrement: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bid Increment Type
                  </label>
                  <select
                    value={formData.bidIncrementType}
                    onChange={(e) => setFormData({ ...formData, bidIncrementType: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="FIXED">Fixed Amount (e.g. ₹5,000 per bid)</option>
                    <option value="PERCENTAGE">Percentage of current bid (e.g. 5%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bid Countdown Timer (Seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.bidTimerSeconds}
                    onChange={(e) => setFormData({ ...formData, bidTimerSeconds: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Re-Auction Attempts for Unsold
                  </label>
                  <input
                    type="number"
                    value={formData.maxReauctionAttempts}
                    onChange={(e) => setFormData({ ...formData, maxReauctionAttempts: Number(e.target.value) })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.autoExtension}
                      onChange={(e) => setFormData({ ...formData, autoExtension: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>
                      Enable Auto Extension: If a bid is placed in the last {formData.extensionThresholdSeconds} seconds, automatically extend timer by {formData.extensionDurationSeconds} seconds.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Registration Rules (Section 11) */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 8: Player Registration Rules</h3>
                <p className="text-xs text-slate-500">Configure online registration window for players and approval criteria.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.registrationOpen}
                    onChange={(e) => setFormData({ ...formData, registrationOpen: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Open Public Player Registration for this Auction</span>
                </label>

                {formData.registrationOpen && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registration Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                      className="w-full max-w-xs text-xs border border-slate-300 rounded-lg p-2.5 text-slate-900"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Admin review and approval is strictly required before any registered player enters the auction pool.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 9: Review & Create (Section 25) */}
          {step === 9 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 9: Auction Summary & Final Confirmation</h3>
                <p className="text-xs text-slate-500">Review all configured rules before creating the auction.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Basic Info
                  </span>
                  <div><strong>Auction Name:</strong> {formData.name}</div>
                  <div><strong>Date & Time:</strong> {formData.auctionDate} • {formData.startTime} ({formData.timezone})</div>
                  <div><strong>Shareable URL:</strong> /auction/{formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Purse & Squad Constraints
                  </span>
                  <div><strong>Total Purse:</strong> {formatCurrency(formData.totalPursePerTeam)} / team</div>
                  <div><strong>Squad Size:</strong> Min {formData.minPlayersPerTeam} • Max {formData.maxPlayersPerTeam}</div>
                  <div><strong>Overseas Limits:</strong> Max {formData.maxOverseasPlayers}</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Bidding & Retention
                  </span>
                  <div><strong>Base Price Default:</strong> {formatCurrency(formData.defaultBasePrice)}</div>
                  <div><strong>Bid Increment:</strong> {formatCurrency(formData.bidIncrement)} ({formData.bidIncrementType})</div>
                  <div><strong>Max Retentions:</strong> {formData.maxRetentions} ({formData.retentionPriceModel})</div>
                  <div><strong>Bid Timer:</strong> {formData.bidTimerSeconds}s (Auto-extends by {formData.extensionDurationSeconds}s)</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Teams & Categories
                  </span>
                  <div><strong>Teams Count:</strong> {formData.teams.length} teams configured</div>
                  <div><strong>Categories:</strong> {formData.categories.map(c => c.name).join(', ')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBack}
            disabled={step === 1}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Step {step} of 9</span>
            {step < 9 ? (
              <Button size="sm" onClick={handleNext} icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Save & Continue
              </Button>
            ) : (
              <Button
                size="md"
                onClick={handleSubmit}
                loading={loading}
                icon={<Sparkles className="w-4 h-4" />}
              >
                CREATE AUCTION
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
