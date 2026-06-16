import { Request, Response, NextFunction } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config.js';

export interface AuthPayload {
  userId: string;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function signAccessToken(payload: AuthPayload): string {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret, options);
}

export function signRefreshToken(payload: AuthPayload): string {
  const options: SignOptions = { expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtRefreshSecret, options);
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as AuthPayload;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }
  next();
}
