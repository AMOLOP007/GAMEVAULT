// ── Auth Types ───────────────────────────────
export interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  username: string;
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

// ── Game Types ───────────────────────────────
export type GameStatus = 'PLAYING' | 'COMPLETED' | 'DROPPED' | 'BACKLOG' | 'WISHLIST';
export type LinkTag = 'OFFICIAL' | 'STORE' | 'MOD' | 'GUIDE' | 'BACKUP' | 'OTHER';

export interface GameInput {
  title: string;
  description?: string;
  coverUrl?: string;
  genre?: string[];
  platform?: string[];
  developer?: string;
  publisher?: string;
  status?: GameStatus;
  processName?: string;
}

export interface GameUpdateInput {
  status?: GameStatus;
  rating?: number;
  notes?: string;
  isFavorite?: boolean;
  processName?: string;
}

// ── Playtime Types ───────────────────────────
export interface PlaySessionInput {
  userGameId: string;
  processName?: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface BatchSyncInput {
  sessions: PlaySessionInput[];
}

// ── Stats Types ──────────────────────────────
export interface DashboardStats {
  totalPlaytime: number;
  totalGames: number;
  completedGames: number;
  currentlyPlaying: number;
  mostPlayed: Array<{
    game: { id: number; title: string; coverUrl: string | null };
    totalPlaytime: number;
  }>;
  recentSessions: Array<{
    id: string;
    gameName: string;
    duration: number;
    startTime: string;
  }>;
}

export interface WeeklyStats {
  days: Array<{
    date: string;
    totalSeconds: number;
    sessions: number;
  }>;
}

// ── Achievement Types ────────────────────────
export interface AchievementInput {
  gameId: number;
  name: string;
  description?: string;
  iconUrl?: string;
  isSecret?: boolean;
}

// ── External Link Types ──────────────────────
export interface ExternalLinkInput {
  userGameId: string;
  url: string;
  label: string;
  tag?: LinkTag;
}

// ── API Response Wrapper ─────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
