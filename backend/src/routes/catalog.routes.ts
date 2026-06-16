import { Router, Request, Response, NextFunction } from 'express';
import { Phase } from '@prisma/client';
import { prisma } from '../prisma.js';
import { getAllDeadlines } from '../services/deadline.service.js';
import { PHASE_LABELS } from '../constants.js';
import { getLiveMatches } from '../services/footballApi.service.js';

const router = Router();

router.get('/teams', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await prisma.team.findMany({
      include: { group: true },
      orderBy: [{ group: { name: 'asc' } }, { name: 'asc' }],
    });
    res.json(teams);
  } catch (error) {
    next(error);
  }
});

router.get('/groups', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await prisma.group.findMany({
      include: { teams: { orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

router.get('/matches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phase = req.query.phase as string | undefined;
    const matches = await prisma.match.findMany({
      where: phase ? { phase: phase as never } : undefined,
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: 'asc' },
    });
    res.json(matches);
  } catch (error) {
    next(error);
  }
});

router.get('/deadlines', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const deadlines = await getAllDeadlines();
    res.json(
      deadlines.map((d) => ({
        ...d,
        label: PHASE_LABELS[d.phase],
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.get('/bracket-template', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phase = req.query.phase as string | undefined;
    const templates = await prisma.bracketTemplate.findMany({
      where: phase ? { phase: phase as never } : undefined,
      orderBy: [{ phase: 'asc' }, { slot: 'asc' }],
    });
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

router.get('/thirds-table', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const table = await prisma.thirdsTable.findMany({
      include: { team: { include: { group: true } } },
      orderBy: { rank: 'asc' },
    });
    res.json(table);
  } catch (error) {
    next(error);
  }
});

router.get('/scoring-config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await prisma.scoringConfig.findMany({ orderBy: { key: 'asc' } });
    res.json(config);
  } catch (error) {
    next(error);
  }
});

router.get('/matches/live', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phase = req.query.phase as Phase | undefined;
    const data = await getLiveMatches(phase);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
