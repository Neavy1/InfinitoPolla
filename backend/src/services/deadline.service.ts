import { Phase } from '@prisma/client';
import { config } from '../config.js';
import { prisma } from '../prisma.js';

export async function getPhaseDeadline(phase: Phase): Promise<Date | null> {
  const firstMatch = await prisma.match.findFirst({
    where: { phase },
    orderBy: { kickoffAt: 'asc' },
    select: { kickoffAt: true },
  });

  if (!firstMatch) return null;

  const lockAt = new Date(firstMatch.kickoffAt);
  lockAt.setMinutes(lockAt.getMinutes() - config.lockBufferMinutes);
  return lockAt;
}

export async function isPhaseLocked(phase: Phase): Promise<boolean> {
  const deadline = await getPhaseDeadline(phase);
  if (!deadline) return false;
  return new Date() >= deadline;
}

export async function getAllDeadlines(): Promise<
  Array<{ phase: Phase; lockAt: string | null; isLocked: boolean; firstKickoff: string | null }>
> {
  const phases = Object.values(Phase);
  const now = new Date();

  const results = await Promise.all(
    phases.map(async (phase) => {
      const firstMatch = await prisma.match.findFirst({
        where: { phase },
        orderBy: { kickoffAt: 'asc' },
        select: { kickoffAt: true },
      });

      if (!firstMatch) {
        return { phase, lockAt: null, isLocked: false, firstKickoff: null };
      }

      const lockAt = new Date(firstMatch.kickoffAt);
      lockAt.setMinutes(lockAt.getMinutes() - config.lockBufferMinutes);

      return {
        phase,
        lockAt: lockAt.toISOString(),
        isLocked: now >= lockAt,
        firstKickoff: firstMatch.kickoffAt.toISOString(),
      };
    }),
  );

  return results;
}
