import { Request, Response, NextFunction } from 'express';
import { Phase } from '@prisma/client';
import { getPhaseDeadline, isPhaseLocked } from '../services/deadline.service.js';
import { PHASE_LABELS } from '../constants.js';

export function deadlineGuard(phase: Phase) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const locked = await isPhaseLocked(phase);
      if (locked) {
        const deadline = await getPhaseDeadline(phase);
        res.status(423).json({
          error: 'Fase bloqueada',
          message: `Los pronósticos de ${PHASE_LABELS[phase]} están cerrados.`,
          phase,
          lockAt: deadline?.toISOString() ?? null,
        });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
