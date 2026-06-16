import { Router, Request, Response, NextFunction } from 'express';
import { Phase } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { deadlineGuard } from '../middleware/deadlineGuard.js';
import { logAuditBatch } from '../services/audit.service.js';
import { getAllDeadlines } from '../services/deadline.service.js';

const router = Router();

const groupPredictionSchema = z.object({
  predictions: z.array(
    z.object({
      groupId: z.string(),
      firstTeamId: z.string(),
      secondTeamId: z.string(),
    }),
  ),
});

const thirdPredictionSchema = z.object({
  predictions: z.array(
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

router.get('/groups', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const predictions = await prisma.groupPrediction.findMany({
      where: { userId: req.user!.userId },
      include: { group: true, firstTeam: true, secondTeam: true },
    });
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/groups',
  authenticate,
  deadlineGuard(Phase.GROUPS),
  validateBody(groupPredictionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { predictions } = req.body;
      const audits: Parameters<typeof logAuditBatch>[0] = [];

      for (const pred of predictions) {
        if (pred.firstTeamId === pred.secondTeamId) {
          res.status(400).json({ error: 'El 1ro y 2do del grupo deben ser equipos distintos' });
          return;
        }

        const existing = await prisma.groupPrediction.findUnique({
          where: { userId_groupId: { userId, groupId: pred.groupId } },
        });

        await prisma.groupPrediction.upsert({
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

        if (existing) {
          if (existing.firstTeamId !== pred.firstTeamId) {
            audits.push({
              userId,
              category: 'groups',
              field: `${pred.groupId}.first`,
              oldValue: existing.firstTeamId,
              newValue: pred.firstTeamId,
            });
          }
          if (existing.secondTeamId !== pred.secondTeamId) {
            audits.push({
              userId,
              category: 'groups',
              field: `${pred.groupId}.second`,
              oldValue: existing.secondTeamId,
              newValue: pred.secondTeamId,
            });
          }
        } else {
          audits.push({
            userId,
            category: 'groups',
            field: `${pred.groupId}`,
            oldValue: null,
            newValue: `${pred.firstTeamId},${pred.secondTeamId}`,
          });
        }
      }

      await logAuditBatch(audits);
      const result = await prisma.groupPrediction.findMany({
        where: { userId },
        include: { group: true, firstTeam: true, secondTeam: true },
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

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
  '/thirds',
  authenticate,
  deadlineGuard(Phase.GROUPS),
  validateBody(thirdPredictionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { predictions } = req.body;

      const groupIds = predictions.map((p: { groupId: string }) => p.groupId);
      if (new Set(groupIds).size !== 8) {
        res.status(400).json({ error: 'Los 8 terceros deben ser de grupos distintos' });
        return;
      }

      const existing = await prisma.thirdPrediction.findMany({ where: { userId } });
      const audits = predictions.map((p: { groupId: string; teamId: string }) => {
        const old = existing.find((e) => e.groupId === p.groupId);
        return {
          userId,
          category: 'thirds',
          field: p.groupId,
          oldValue: old?.teamId ?? null,
          newValue: p.teamId,
        };
      });

      await prisma.$transaction([
        prisma.thirdPrediction.deleteMany({ where: { userId } }),
        prisma.thirdPrediction.createMany({
          data: predictions.map((p: { groupId: string; teamId: string }) => ({
            userId,
            groupId: p.groupId,
            teamId: p.teamId,
          })),
        }),
      ]);

      await logAuditBatch(audits);
      const result = await prisma.thirdPrediction.findMany({
        where: { userId },
        include: { group: true, team: true },
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get('/bracket/:phase', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phase = req.params.phase as Phase;
    const predictions = await prisma.bracketPrediction.findMany({
      where: { userId: req.user!.userId, phase },
      include: { team: true },
      orderBy: { slot: 'asc' },
    });
    res.json(predictions);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/bracket',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = bracketPredictionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
        return;
      }

      const { phase, predictions } = parsed.data;
      const locked = await import('../services/deadline.service.js').then((m) => m.isPhaseLocked(phase));
      if (locked) {
        res.status(423).json({ error: 'Fase bloqueada', phase });
        return;
      }

      const userId = req.user!.userId;
      const existing = await prisma.bracketPrediction.findMany({ where: { userId, phase } });
      const audits = predictions.map((p) => {
        const old = existing.find((e) => e.slot === p.slot);
        return {
          userId,
          category: `bracket.${phase}`,
          field: p.slot,
          oldValue: old?.teamId ?? null,
          newValue: p.teamId,
        };
      });

      await prisma.$transaction(
        predictions.map((p) =>
          prisma.bracketPrediction.upsert({
            where: { userId_phase_slot: { userId, phase, slot: p.slot } },
            create: { userId, phase, slot: p.slot, teamId: p.teamId },
            update: { teamId: p.teamId },
          }),
        ),
      );

      await logAuditBatch(audits);
      const result = await prisma.bracketPrediction.findMany({
        where: { userId, phase },
        include: { team: true },
        orderBy: { slot: 'asc' },
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get('/final', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prediction = await prisma.finalPrediction.findUnique({
      where: { userId: req.user!.userId },
      include: { champion: true, runnerUp: true, third: true, fourth: true },
    });
    res.json(prediction);
  } catch (error) {
    next(error);
  }
});

router.put(
  '/final',
  authenticate,
  deadlineGuard(Phase.GROUPS),
  validateBody(finalPredictionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { championId, runnerUpId, thirdId, fourthId } = req.body;
      const ids = [championId, runnerUpId, thirdId, fourthId];
      if (new Set(ids).size !== 4) {
        res.status(400).json({ error: 'Los 4 equipos finales deben ser distintos' });
        return;
      }

      const existing = await prisma.finalPrediction.findUnique({ where: { userId } });

      await prisma.finalPrediction.upsert({
        where: { userId },
        create: { userId, championId, runnerUpId, thirdId, fourthId },
        update: { championId, runnerUpId, thirdId, fourthId },
      });

      await logAuditBatch([
        {
          userId,
          category: 'final',
          field: 'positions',
          oldValue: existing ? JSON.stringify(existing) : null,
          newValue: JSON.stringify({ championId, runnerUpId, thirdId, fourthId }),
        },
      ]);

      const result = await prisma.finalPrediction.findUnique({
        where: { userId },
        include: { champion: true, runnerUp: true, third: true, fourth: true },
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get('/deadlines', authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const deadlines = await getAllDeadlines();
    res.json(deadlines);
  } catch (error) {
    next(error);
  }
});

export default router;
