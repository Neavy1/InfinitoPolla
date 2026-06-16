import { MatchStatus, Phase } from '@prisma/client';
import { PHASE_ORDER, PHASE_LABELS } from '../constants.js';
import { prisma } from '../prisma.js';
import { recalculateAllScores, recalculateThirdsTable } from './scoring.service.js';

async function allMatchesFinished(phase: Phase): Promise<boolean> {
  const total = await prisma.match.count({ where: { phase } });
  if (total === 0) return false;
  const finished = await prisma.match.count({
    where: { phase, status: MatchStatus.FINISHED },
  });
  return finished >= total;
}

async function isGroupsPhaseReady(): Promise<boolean> {
  if (!(await allMatchesFinished(Phase.GROUPS))) return false;

  const groupCount = await prisma.group.count();
  const groupsWithStandings = await prisma.groupStanding.groupBy({
    by: ['groupId'],
    where: { position: { in: [1, 2] } },
    _count: { position: true },
  });

  return groupsWithStandings.length >= groupCount;
}

async function isPhaseReady(phase: Phase): Promise<boolean> {
  if (phase === Phase.GROUPS) return isGroupsPhaseReady();
  return allMatchesFinished(phase);
}

export async function processCompletedPhases(): Promise<Phase[]> {
  const newlyCompleted: Phase[] = [];

  for (const phase of PHASE_ORDER) {
    const alreadyDone = await prisma.phaseCompletion.findUnique({ where: { phase } });
    if (alreadyDone) continue;

    const ready = await isPhaseReady(phase);
    if (!ready) continue;

    if (phase === Phase.GROUPS) {
      await recalculateThirdsTable();
    }

    await prisma.phaseCompletion.create({
      data: { phase, completedAt: new Date(), rankingUpdatedAt: new Date() },
    });
    newlyCompleted.push(phase);
  }

  if (newlyCompleted.length > 0) {
    await recalculateAllScores();
    await prisma.phaseCompletion.updateMany({
      where: { phase: { in: newlyCompleted } },
      data: { rankingUpdatedAt: new Date() },
    });
  }

  return newlyCompleted;
}

export async function getPhaseCompletionStatus(): Promise<
  Array<{ phase: Phase; label: string; completed: boolean; completedAt: string | null; rankingUpdatedAt: string | null }>
> {
  const completions = await prisma.phaseCompletion.findMany();
  const completionMap = new Map(completions.map((c) => [c.phase, c]));

  return PHASE_ORDER.map((phase) => {
    const record = completionMap.get(phase);
    return {
      phase,
      label: PHASE_LABELS[phase],
      completed: Boolean(record),
      completedAt: record?.completedAt.toISOString() ?? null,
      rankingUpdatedAt: record?.rankingUpdatedAt.toISOString() ?? null,
    };
  });
}

export async function onAdminDataChanged(phase: Phase): Promise<{ recalculated: boolean; newlyCompleted: Phase[] }> {
  if (phase === Phase.GROUPS) {
    await recalculateThirdsTable();
  }

  const newlyCompleted = await processCompletedPhases();
  await recalculateAllScores();

  return { recalculated: true, newlyCompleted };
}
