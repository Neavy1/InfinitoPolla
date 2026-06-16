import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { formatZodErrors } from '../validators/auth.validators.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: formatZodErrors(result.error),
        details: result.error.flatten(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
