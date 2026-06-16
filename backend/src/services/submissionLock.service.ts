import { PredictionCategory } from '@prisma/client';
import { prisma } from '../prisma.js';

const CATEGORY_LABELS: Record<PredictionCategory, string> = {
  GROUPS: 'Pronóstico de grupos',
  R32: 'Dieciseisavos de final',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  FINAL_POSITIONS: 'Posiciones finales',
};

export async function isSubmissionLocked(
  userId: string,
  category: PredictionCategory,
): Promise<boolean> {
  const lock = await prisma.predictionLock.findUnique({
    where: { userId_category: { userId, category } },
  });
  return Boolean(lock);
}

export async function lockSubmission(userId: string, category: PredictionCategory): Promise<void> {
  await prisma.predictionLock.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category },
    update: {},
  });
}

export async function assertNotLocked(userId: string, category: PredictionCategory): Promise<void> {
  const locked = await isSubmissionLocked(userId, category);
  if (locked) {
    const err = new Error(
      `${CATEGORY_LABELS[category]} ya fue enviado y no puede modificarse.`,
    ) as Error & { statusCode: number };
    err.statusCode = 423;
    throw err;
  }
}

export async function getUserLocks(userId: string): Promise<
  Array<{ category: PredictionCategory; lockedAt: string; label: string }>
> {
  const locks = await prisma.predictionLock.findMany({
    where: { userId },
    orderBy: { lockedAt: 'asc' },
  });
  return locks.map((l) => ({
    category: l.category,
    lockedAt: l.lockedAt.toISOString(),
    label: CATEGORY_LABELS[l.category],
  }));
}

export function phaseToCategory(phase: string): PredictionCategory | null {
  const map: Record<string, PredictionCategory> = {
    R32: PredictionCategory.R32,
    R16: PredictionCategory.R16,
    QF: PredictionCategory.QF,
  };
  return map[phase] ?? null;
}
