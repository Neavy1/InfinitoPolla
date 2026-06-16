import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/polla_infinito'),
  jwtSecret: requireEnv('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
  jwtExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
  corsOrigin: requireEnv('CORS_ORIGIN', 'http://localhost:5173'),
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? '',
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
  lockBufferMinutes: 1,
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
};
