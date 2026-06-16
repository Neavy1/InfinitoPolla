import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { buildLeaderboard } from '../services/ranking.service.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await buildLeaderboard();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await buildLeaderboard();
    res.json({
      leader: summary.leader,
      podium: summary.podium,
      totalPlayers: summary.totalPlayers,
      lastUpdatedAt: summary.lastUpdatedAt,
      completedPhases: summary.completedPhases.filter((p) => p.completed),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await buildLeaderboard(req.user!.userId);
    const myEntry = summary.entries.find((e) => e.userId === req.user!.userId);
    const score = await prisma.score.findUnique({ where: { userId: req.user!.userId } });

    res.json({
      rank: myEntry?.rank ?? summary.entries.length,
      userId: req.user!.userId,
      username: req.user!.username,
      totalPoints: myEntry?.totalPoints ?? 0,
      groupPoints: myEntry?.groupPoints ?? 0,
      thirdPoints: myEntry?.thirdPoints ?? 0,
      r32Points: myEntry?.r32Points ?? 0,
      r16Points: myEntry?.r16Points ?? 0,
      qfPoints: myEntry?.qfPoints ?? 0,
      finalPosPoints: myEntry?.finalPosPoints ?? 0,
      breakdown: score?.breakdown ?? {},
      leader: summary.leader,
      lastUpdatedAt: summary.lastUpdatedAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
