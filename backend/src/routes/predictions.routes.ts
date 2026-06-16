import { Router, Request, Response, NextFunction } from 'express';
import { Phase, PredictionCategory } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { logAuditBatch } from '../services/audit.service.js';
import {
  assertNotLocked,
  getUserLocks,
  lockSubmission,
  phaseToCategory,
} from '../services/submissionLock.service.js';

const router = Router();

const groupsSubmitSchema = z.object({
  groups: z.array(
    z.object({
      groupId: z.string(),
      firstTeamId: z.string(),
      secondTeamId: z.string(),
    }),
  ),
  thirds: z.array(
    z.object({
      groupId: z.string(),
      teamId: z.string(),
    }),
  ).length(8, 'Debes seleccionar exactamente 8 mejores terceros'),
});

const bracketPredictionSchema = z.object({
  phase: z.nativeEnum(Phase),
  predictions: z.array(
    z.object({
      slot: z.string(),
      teamId: z.string(),
    }),
  ),
});

const finalPredictionSchema = z.object({
  championId: z.string(),
  runnerUpId: z.string(),
  thirdId: z.string(),
  fourthId: z.string(),
});

function handleRouteError(error: unknown, res: Response, next: NextFunction): void {
  if (error && typeof error === 'object' && 'statusCode' in error && (error as { statusCode: number }).statusCode === 423) {
    res.status(423).json({
      error: 'Pronóstico bloqueado',
      message: error instanceof Error ? error.message : 'Ya enviaste este pronóstico',
    });
    return;
  }
  next(error);
}

router.get('/locks', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locks = await getUserLocks(req.user!.userId);
    res.json(locks);
  } catch (error) {
    next(error);
  }
});

router.get('/groups', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const [predictions, locks] = await Promise.all([
      prisma.groupPrediction.findMany({
        where: { userId },
        include: { group: true, firstTeam: true, secondTeam: true },
      }),
      getUserLocks(userId),
    ]);
    res.json({
      predictions,
      locked: locks.some((l) => l.category === PredictionCategory.GROUPS),
      locks,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/thirds', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const predictions = await prisma.thirdPrediction.findMany({
      where: { userId: req.user!.userId },
      include: { group: true, team: true },
    });
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/submit/groups',
  authenticate,
  validateBody(groupsSubmitSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      await assertNotLocked(userId, PredictionCategory.GROUPS);

      const { groups, thirds } = req.body;
      const allGroups = await prisma.group.count();

      if (groups.length < allGroups) {
        res.status(400).json({
          error: `Debes pronosticar los ${allGroups} grupos (1ro y 2do en cada uno)`,
        });
        return;
      }

      const thirdGroupIds = thirds.map((t: { groupId: string }) => t.groupId);
      if (new Set(thirdGroupIds).size !== 8) {
        res.status(400).json({ error: 'Los 8 terceros deben ser de grupos distintos' });
        return;
      }

      const audits: Parameters<typeof logAuditBatch>[0] = [];

      await prisma.$transaction(async (tx) => {
        for (const pred of groups) {
          if (pred.firstTeamId === pred.secondTeamId) {
            throw new Error('El 1ro y 2do del grupo deben ser equipos distintos');
          }
          await tx.groupPrediction.upsert({
            where: { userId_groupId: { userId, groupId: pred.groupId } },
            create: {
              userId,
              groupId: pred.groupId,
              firstTeamId: pred.firstTeamId,
              secondTeamId: pred.secondTeamId,
            },
            update: {
              firstTeamId: pred.firstTeamId,
              secondTeamId: pred.secondTeamId,
            },
          });
          audits.push({
            userId,
            category: 'groups.submit',
            field: pred.groupId,
            oldValue: null,
            newValue: `${pred.firstTeamId},${pred.secondTeamId}`,
          });
        }

        await tx.thirdPrediction.deleteMany({ where: { userId } });
        await tx.thirdPrediction.createMany({
          data: thirds.map((p: { groupId: string; teamId: string }) => ({
            userId,
            groupId: p.groupId,
            teamId: p.teamId,
          })),
        });

        for (const p of thirds) {
          audits.push({
            userId,
            category: 'thirds.submit',
            field: p.groupId,
            oldValue: null,
            newValue: p.teamId,
          });
        }

        await tx.predictionLock.create({
          data: { userId, category: PredictionCategory.GROUPS },
        });
      });

      await logAuditBatch(audits);

      const [groupPreds, thirdPreds] = await Promise.all([
        prisma.groupPrediction.findMany({
          where: { userId },
          include: { group: true, firstTeam: true, secondTeam: true },
        }),
        prisma.thirdPrediction.findMany({
          where: { userId },
          include: { group: true, team: true },
        }),
      ]);

      res.json({
        message: 'Pronóstico de grupos enviado y bloqueado. No podrás modificarlo.',
        locked: true,
        groups: groupPreds,
        thirds: thirdPreds,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('equipos distintos')) {
        res.status(400).json({ error: error.message });
        return;
      }
      handleRouteError(error, res, next);
    }
  },
);

router.get('/bracket/:phase', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phase = req.params.phase as Phase;
    const category = phaseToCategory(phase);
    const userId = req.user!.userId;
    const [predictions, locks] = await Promise.all([
      prisma.bracketPrediction.findMany({
        where: { userId, phase },
        include: { team: true },
        orderBy: { slot: 'asc' },
      }),
      getUserLocks(userId),
    ]);
    res.json({
      predictions,
      locked: category ? locks.some((l) => l.category === category) : false,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/bracket', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = bracketPredictionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
      return;
    }

    const { phase, predictions } = parsed.data;
    const category = phaseToCategory(phase);
    if (!category) {
      res.status(400).json({ error: 'Fase no válida para pronóstico' });
      return;
    }

    const userId = req.user!.userId;
    await assertNotLocked(userId, category);

    await prisma.$transaction(
      predictions.map((p) =>
        prisma.bracketPrediction.upsert({
          where: { userId_phase_slot: { userId, phase, slot: p.slot } },
          create: { userId, phase, slot: p.slot, teamId: p.teamId },
          update: { teamId: p.teamId },
        }),
      ),
    );

    await lockSubmission(userId, category);
    await logAuditBatch(
      predictions.map((p) => ({
        userId,
        category: `bracket.${phase}.submit`,
        field: p.slot,
        oldValue: null,
        newValue: p.teamId,
      })),
    );

    const result = await prisma.bracketPrediction.findMany({
      where: { userId, phase },
      include: { team: true },
      orderBy: { slot: 'asc' },
    });

    res.json({
      message: 'Pronóstico enviado y bloqueado. No podrás modificarlo.',
      locked: true,
      predictions: result,
    });
  } catch (error) {
    handleRouteError(error, res, next);
  }
});

router.get('/final', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const [prediction, locks] = await Promise.all([
      prisma.finalPrediction.findUnique({
        where: { userId },
        include: { champion: true, runnerUp: true, third: true, fourth: true },
      }),
      getUserLocks(userId),
    ]);
    res.json({
      prediction,
      locked: locks.some((l) => l.category === PredictionCategory.FINAL_POSITIONS),
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/final',
  authenticate,
  validateBody(finalPredictionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      await assertNotLocked(userId, PredictionCategory.FINAL_POSITIONS);

      const { championId, runnerUpId, thirdId, fourthId } = req.body;
      const ids = [championId, runnerUpId, thirdId, fourthId];
      if (new Set(ids).size !== 4) {
        res.status(400).json({ error: 'Los 4 equipos finales deben ser distintos' });
        return;
      }

      await prisma.finalPrediction.upsert({
        where: { userId },
        create: { userId, championId, runnerUpId, thirdId, fourthId },
        update: { championId, runnerUpId, thirdId, fourthId },
      });

      await lockSubmission(userId, PredictionCategory.FINAL_POSITIONS);
      await logAuditBatch([
        {
          userId,
          category: 'final.submit',
          field: 'positions',
          oldValue: null,
          newValue: JSON.stringify({ championId, runnerUpId, thirdId, fourthId }),
        },
      ]);

      const result = await prisma.finalPrediction.findUnique({
        where: { userId },
        include: { champion: true, runnerUp: true, third: true, fourth: true },
      });

      res.json({
        message: 'Posiciones finales enviadas y bloqueadas.',
        locked: true,
        prediction: result,
      });
    } catch (error) {
      handleRouteError(error, res, next);
    }
  },
);

export default router;
