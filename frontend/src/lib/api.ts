const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export interface User {
  id: string;
  username: string;
  email?: string | null;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl?: string | null;
  groupId: string;
  group?: { id: string; name: string };
}

export interface Group {
  id: string;
  name: string;
  teams: Team[];
}

export interface Deadline {
  phase: string;
  lockAt: string | null;
  isLocked: boolean;
  firstKickoff: string | null;
  label?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  groupPoints: number;
  thirdPoints: number;
  r32Points: number;
  r16Points: number;
  qfPoints: number;
  finalPosPoints: number;
  isLeader?: boolean;
  isCurrentUser?: boolean;
}

export interface PhaseCompletionInfo {
  phase: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  rankingUpdatedAt: string | null;
}

export interface LeaderboardSummary {
  leader: LeaderboardEntry | null;
  podium: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  totalPlayers: number;
  lastUpdatedAt: string | null;
  completedPhases: PhaseCompletionInfo[];
}

function getTokens() {
  return {
    access: localStorage.getItem('accessToken'),
    refresh: localStorage.getItem('refreshToken'),
  };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  return data.accessToken;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { access } = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && getTokens().refresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || err.message || `Error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const authApi = {
  register: (data: { username: string; password: string; email?: string; turnstileToken: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { username: string; password: string; turnstileToken: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => api<User>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
};

export const catalogApi = {
  teams: () => api<Team[]>('/catalog/teams'),
  groups: () => api<Group[]>('/catalog/groups'),
  deadlines: () => api<Deadline[]>('/catalog/deadlines'),
  scoringConfig: () => api<Array<{ key: string; label: string; points: number }>>('/catalog/scoring-config'),
  thirdsTable: () => api<unknown[]>('/catalog/thirds-table'),
  bracketTemplate: (phase?: string) =>
    api<Array<{ phase: string; slot: string; homeSource: string; awaySource: string; description?: string }>>(
      `/catalog/bracket-template${phase ? `?phase=${phase}` : ''}`,
    ),
  liveMatches: (phase?: string) =>
    api<{
      matches: Array<{
        id: string;
        phase: string;
        groupName: string | null;
        status: string;
        homeTeam: { name: string; code: string } | null;
        awayTeam: { name: string; code: string } | null;
        homeScore: number | null;
        awayScore: number | null;
      }>;
      synced: number;
      source: string;
      apiConfigured: boolean;
    }>(`/catalog/matches/live${phase ? `?phase=${phase}` : ''}`),
};

export const predictionsApi = {
  getLocks: () => api<Array<{ category: string; lockedAt: string; label: string }>>('/predictions/locks'),
  getGroups: () => api<{
    predictions: unknown[];
    locked: boolean;
    locks: Array<{ category: string; lockedAt: string; label: string }>;
  }>('/predictions/groups'),
  submitGroups: (data: {
    groups: Array<{ groupId: string; firstTeamId: string; secondTeamId: string }>;
    thirds: Array<{ groupId: string; teamId: string }>;
  }) => api('/predictions/submit/groups', { method: 'PUT', body: JSON.stringify(data) }),
  getThirds: () => api<unknown[]>('/predictions/thirds'),
  getBracket: (phase: string) => api<{ predictions: unknown[]; locked: boolean }>(`/predictions/bracket/${phase}`),
  saveBracket: (phase: string, predictions: Array<{ slot: string; teamId: string }>) =>
    api('/predictions/bracket', { method: 'PUT', body: JSON.stringify({ phase, predictions }) }),
  getFinal: () => api<{ prediction: unknown; locked: boolean }>('/predictions/final'),
  saveFinal: (data: { championId: string; runnerUpId: string; thirdId: string; fourthId: string }) =>
    api('/predictions/final', { method: 'PUT', body: JSON.stringify(data) }),
};

export const leaderboardApi = {
  get: () => api<LeaderboardSummary>('/leaderboard'),
  summary: () => api<Pick<LeaderboardSummary, 'leader' | 'podium' | 'totalPlayers' | 'lastUpdatedAt' | 'completedPhases'>>('/leaderboard/summary'),
  me: () => api<LeaderboardEntry & {
    breakdown?: Record<string, number>;
    leader: LeaderboardEntry | null;
    lastUpdatedAt: string | null;
  }>('/leaderboard/me'),
};

export const adminApi = {
  matches: (phase?: string) => api<unknown[]>(`/admin/matches${phase ? `?phase=${phase}` : ''}`),
  updateMatchResult: (id: string, data: { homeScore: number; awayScore: number }) =>
    api(`/admin/matches/${id}/result`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStandings: (standings: unknown[]) =>
    api('/admin/standings', { method: 'PUT', body: JSON.stringify({ standings }) }),
  recalculate: () => api('/admin/recalculate-scores', { method: 'POST' }),
  audit: () => api<unknown[]>('/admin/audit'),
  updateScoring: (configs: Array<{ key: string; points: number }>) =>
    api('/admin/scoring-config', { method: 'PUT', body: JSON.stringify({ configs }) }),
};
