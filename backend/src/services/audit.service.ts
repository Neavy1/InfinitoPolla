import { prisma } from '../prisma.js';

export async function logAudit(
  userId: string,
  category: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
): Promise<void> {
  await prisma.predictionAudit.create({
    data: { userId, category, field, oldValue, newValue },
  });
}

export async function logAuditBatch(
  entries: Array<{
    userId: string;
    category: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }>,
): Promise<void> {
  if (entries.length === 0) return;
  await prisma.predictionAudit.createMany({ data: entries });
}
