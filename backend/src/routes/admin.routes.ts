import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MatchStatus, Phase } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { prisma } from '../prisma.js';
import { recalculateAllScores, recalculateThirdsTable } from '../services/scoring.service.js';
import { onAdminDataChanged, processCompletedPhases } from '../services/phaseCompletion.service.js';

const router = Router();
router.use(authenticate, requireAdmin);

const matchResultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  status: z.nativeEnum(MatchStatus).optional(),
});

const standingSchema = z.object({
  standings: z.array(
    z.object({
      groupId: z.string(),
      teamId: z.string(),
      position: z.number().int().min(1).max(4),
      points: z.number().int().min(0),
      goalsFor: z.number().int().min(0),
      goalsAgainst: z.number().int().min(0),
      yellowCards: z.number().int().min(0).optional(),
      redCards: z.number().int().min(0).optional(),
    }),
  ),
});

const scoringConfigSchema = z.object({
  configs: z.array(
    z.object({
      key: z.string(),
      points: z.number().int().min(0),
    }),
  ),
});

router.put('/matches/:id/result', validateBody(matchResultSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeScore, awayScore, status } = req.body;
    const matchId = String(req.params.id);
    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        status: status ?? MatchStatus.FINISHED,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    const { newlyCompleted, recalculated } = await onAdminDataChanged(match.phase);
    res.json({
      match,
      ranking: {
        recalculated,
        newlyCompletedPhases: newlyCompleted,
        message: newlyCompleted.length > 0
          ? `Ranking actualizado tras completar: ${newlyCompleted.join(', ')}`
          : recalculated
            ? 'Ranking actualizado'
            : 'Resultado guardado',
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/matches/:id/kickoff', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { kickoffAt } = req.body;
    if (!kickoffAt) {
      res.status(400).json({ error: 'kickoffAt requerido' });
      return;
    }
    const matchId = String(req.params.id);
    const match = await prisma.match.update({
      where: { id: matchId },
      data: { kickoffAt: new Date(kickoffAt) },
    });
    res.json(match);
  } catch (error) {
    next(error);
  }
});

router.put('/standings', validateBody(standingSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { standings } = req.body;

    for (const s of standings) {
      await prisma.groupStanding.upsert({
        where: { groupId_teamId: { groupId: s.groupId, teamId: s.teamId } },
        create: {
          groupId: s.groupId,
          teamId: s.teamId,
          position: s.position,
          points: s.points,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalDiff: s.goalsFor - s.goalsAgainst,
          yellowCards: s.yellowCards ?? 0,
          redCards: s.redCards ?? 0,
          fairPlayScore: (s.yellowCards ?? 0) + (s.redCards ?? 0) * 2,
        },
        update: {
          position: s.position,
          points: s.points,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalDiff: s.goalsFor - s.goalsAgainst,
          yellowCards: s.yellowCards ?? 0,
          redCards: s.redCards ?? 0,
          fairPlayScore: (s.yellowCards ?? 0) + (s.redCards ?? 0) * 2,
        },
      });
    }

    await recalculateThirdsTable();
    const { newlyCompleted, recalculated } = await onAdminDataChanged(Phase.GROUPS);
    res.json({
      message: 'Posiciones actualizadas',
      ranking: {
        recalculated,
        newlyCompletedPhases: newlyCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/recalculate-scores', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await processCompletedPhases();
    await recalculateAllScores();
    res.json({ message: 'Puntajes recalculados' });
  } catch (error) {
    next(error);
  }
});

router.put('/scoring-config', validateBody(scoringConfigSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { configs } = req.body;
    for (const c of configs) {
      await prisma.scoringConfig.update({
        where: { key: c.key },
        data: { points: c.points },
      });
    }
    const updated = await prisma.scoringConfig.findMany();
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt((req.query.limit as string) ?? '100', 10);
    const audits = await prisma.predictionAudit.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(audits);
  } catch (error) {
    next(error);
  }
});

router.get('/matches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phase = req.query.phase as Phase | undefined;
    const matches = await prisma.match.findMany({
      where: phase ? { phase } : undefined,
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: 'asc' },
    });
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

export default router;
