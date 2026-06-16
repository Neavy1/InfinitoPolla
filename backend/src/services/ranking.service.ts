import { Phase } from '@prisma/client';
import { prisma } from '../prisma.js';
import { processCompletedPhases, getPhaseCompletionStatus } from './phaseCompletion.service.js';

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
  isLeader: boolean;
  isCurrentUser?: boolean;
}

export interface LeaderboardSummary {
  leader: LeaderboardEntry | null;
  podium: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  totalPlayers: number;
  lastUpdatedAt: string | null;
  completedPhases: Array<{
    phase: Phase;
    label: string;
    completed: boolean;
    completedAt: string | null;
    rankingUpdatedAt: string | null;
  }>;
}

async function ensureScoresForAllUsers(): Promise<void> {
  const usersWithoutScore = await prisma.user.findMany({
    where: { score: null },
    select: { id: true },
  });
  if (usersWithoutScore.length === 0) return;
  await prisma.score.createMany({
    data: usersWithoutScore.map((u) => ({ userId: u.id })),
    skipDuplicates: true,
  });
}

export async function buildLeaderboard(currentUserId?: string): Promise<LeaderboardSummary> {
  await processCompletedPhases();
  await ensureScoresForAllUsers();

  const scores = await prisma.score.findMany({
    include: { user: { select: { id: true, username: true } } },
    orderBy: [{ totalPoints: 'desc' }, { updatedAt: 'asc' }],
  });

  const entries: LeaderboardEntry[] = scores.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: entry.user.username,
    totalPoints: entry.totalPoints,
    groupPoints: entry.groupPoints,
    thirdPoints: entry.thirdPoints,
    r32Points: entry.r32Points,
    r16Points: entry.r16Points,
    qfPoints: entry.qfPoints,
    finalPosPoints: entry.finalPosPoints,
    isLeader: index === 0 && entry.totalPoints > 0,
    isCurrentUser: currentUserId ? entry.userId === currentUserId : undefined,
  }));

  const leader = entries.length > 0 && entries[0].totalPoints > 0
    ? { ...entries[0], isLeader: true }
    : entries.length > 0
      ? { ...entries[0], isLeader: false }
      : null;

  const lastUpdated = scores.reduce<Date | null>((latest, s) => {
    if (!latest || s.updatedAt > latest) return s.updatedAt;
    return latest;
  }, null);

  const phaseStatus = await getPhaseCompletionStatus();

  return {
    leader,
    podium: entries.slice(0, 3),
    entries,
    totalPlayers: entries.length,
    lastUpdatedAt: lastUpdated?.toISOString() ?? null,
    completedPhases: phaseStatus,
  };
}
