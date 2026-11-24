export type UserRole = 'ADMIN' | 'CAPTAIN' | 'PLAYER';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  teamId?: string;
  status: string;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  sport: string;
  status: 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  location?: string;
  logo?: string;
  banner?: string;
  auctionCount?: number;
  teamCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionConfig {
  id: string;
  auctionId: string;
  totalPursePerTeam: number;
  currency: string;
  currencySymbol: string;
  allowDifferentPursePerTeam: boolean;
  startingPurse: number;
  allowPurseAdjustment: boolean;
  allowAdminManualPurseAdjustment: boolean;
  minBasePrice: number;
  defaultBasePrice: number;
  maxBasePrice: number;
  allowIndividualBasePrice: boolean;
  bidIncrement: number;
  bidIncrementType: 'FIXED' | 'PERCENTAGE';
  minPlayersPerTeam: number;
  maxPlayersPerTeam: number;
  minOverseasPlayers: number;
  maxOverseasPlayers: number;
  enableRetention: boolean;
  minRetentions: number;
  maxRetentions: number;
  retentionUsesPurse: boolean;
  retentionPriceModel: 'FLAT' | 'TIERED';
  retentionPriceConfig: string;
  bidTimerSeconds: number;
  autoExtension: boolean;
  extensionThresholdSeconds: number;
  extensionDurationSeconds: number;
  maxReauctionAttempts: number;
  registrationOpen: boolean;
  registrationDeadline?: string;
}

export interface Auction {
  id: string;
  tournamentId: string;
  tournamentName?: string;
  name: string;
  description?: string;
  auctionDate: string;
  startTime: string;
  endTime?: string;
  timezone: string;
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'RETENTION_OPEN' | 'AUCTION_SCHEDULED' | 'LIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  logo?: string;
  banner?: string;
  shareLink: string;
  config?: AuctionConfig;
  teamCount?: number;
  totalPoolPlayers?: number;
  soldPlayers?: number;
  unsoldPlayers?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerCategory {
  id: string;
  auctionId: string;
  name: string;
  basePrice?: number;
  minPlayers: number;
  maxPlayers: number;
  description?: string;
}

export interface Team {
  id: string;
  tournamentId: string;
  auctionId?: string;
  name: string;
  shortName: string;
  logo?: string;
  color?: string;
  initialPurse: number;
  spentPurse: number;
  remainingPurse: number;
  captainId?: string;
  captainName?: string;
  captainEmail?: string;
  captainMobile?: string;
  squadCount?: number;
  retentionCount?: number;
  createdAt: string;
}

export interface Player {
  id: string;
  fullName: string;
  photo?: string;
  mobile?: string;
  email?: string;
  dateOfBirth?: string;
  age?: number;
  playingRole: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
  battingStyle?: string;
  bowlingStyle?: string;
  isOverseas: boolean;
  experience?: string;
  previousTeam?: string;
  playerBio?: string;
  createdAt: string;
}

export interface AuctionPlayer {
  id: string;
  auctionId: string;
  playerId: string;
  fullName: string;
  photo?: string;
  playingRole: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isOverseas: boolean;
  age?: number;
  experience?: string;
  previousTeam?: string;
  categoryId?: string;
  categoryName?: string;
  basePrice: number;
  currentOrder: number;
  status: 'PENDING' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD' | 'SKIPPED';
  reauctionCount: number;
  finalBid?: number;
  winningTeamId?: string;
  winningTeamName?: string;
  winningTeamLogo?: string;
  soldAt?: string;
}

export interface LiveBid {
  id: string;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  teamColor?: string;
  captainName?: string;
  amount: number;
  timestamp: string;
}

export interface AuctionRoomState {
  auctionId: string;
  status: 'IDLE' | 'BIDDING' | 'PAUSED' | 'SOLD' | 'UNSOLD' | 'COMPLETED';
  currentPlayer: {
    auctionPlayerId: string;
    playerId: string;
    fullName: string;
    photo?: string;
    playingRole: string;
    battingStyle?: string;
    bowlingStyle?: string;
    categoryName?: string;
    basePrice: number;
    currentOrder: number;
    isOverseas: boolean;
    age?: number;
    previousTeam?: string;
    experience?: string;
  } | null;
  currentBid: number;
  highestBidder: {
    teamId: string;
    teamName: string;
    teamLogo?: string;
    teamColor?: string;
  } | null;
  nextBidAmount: number;
  bidHistory: LiveBid[];
  timerSeconds: number;
  isTimerRunning: boolean;
  totalPendingPlayers: number;
  totalSoldPlayers: number;
  totalUnsoldPlayers: number;
}
