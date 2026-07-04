'use client';

import { Match, Participant, Picks, ScoringConfig, Slot } from '@/lib/types';
import { BonusScore, SlotScore, SlotTeams } from '@/lib/scoring';

export interface LeaderboardEntry {
  id: string;
  name: string;
  hasPicks: boolean;
  matchPoints: number;
  bonusPoints: number;
  bonus: BonusScore;
  total: number;
  exactCount: number;
}

export interface BoardEntry {
  id: string;
  name: string;
  picks: Picks;
  slots: Record<string, SlotScore>;
  predTeams: Record<Slot, SlotTeams>;
}

export interface BolaoState {
  matches: Partial<Record<Slot, Match>>;
  scoring: ScoringConfig;
  lockAt: string | null;
  locked: boolean;
  lastSync: string | null;
  leaderboard: LeaderboardEntry[];
  board: BoardEntry[] | null;
  me: { id: string; name: string | null; picks: Picks } | null;
}

const TOKEN_KEY = 'bolao_token';
const NAME_KEY = 'bolao_name';
const ADMIN_KEY = 'bolao_admin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function getMyName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}
export function saveSession(token: string, name: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NAME_KEY, name);
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NAME_KEY);
}
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_KEY);
}
export function saveAdminToken(token: string) {
  localStorage.setItem(ADMIN_KEY, token);
}
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_KEY);
}

export async function api<T = any>(path: string, options: RequestInit = {}, admin = false): Promise<T> {
  const token = admin ? getAdminToken() : getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data as T;
}

export async function fetchState(): Promise<BolaoState> {
  return api<BolaoState>('/api/state');
}
