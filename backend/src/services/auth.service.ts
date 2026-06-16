import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { prisma } from '../prisma.js';
import { signAccessToken, signRefreshToken } from '../middleware/auth.js';
import { verifyTurnstile } from './turnstile.service.js';

export async function registerUser(
  username: string,
  password: string,
  turnstileToken: string,
  email?: string,
  remoteIp?: string,
) {
  const valid = await verifyTurnstile(turnstileToken, remoteIp);
  if (!valid) throw new Error('Verificación Turnstile fallida');

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
  });
  if (existing) throw new Error('Usuario o email ya registrado');

  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, role: Role.USER },
  });

  await prisma.score.create({ data: { userId: user.id } });

  const payload = { userId: user.id, username: user.username, role: user.role };
  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function loginUser(
  username: string,
  password: string,
  turnstileToken: string,
  remoteIp?: string,
) {
  const valid = await verifyTurnstile(turnstileToken, remoteIp);
  if (!valid) throw new Error('Verificación Turnstile fallida');

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error('Credenciales inválidas');

  const validPassword = await argon2.verify(user.passwordHash, password);
  if (!validPassword) throw new Error('Credenciales inválidas');

  const payload = { userId: user.id, username: user.username, role: user.role };
  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuario no encontrado');

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) throw new Error('Contraseña actual incorrecta');

  const passwordHash = await argon2.hash(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw new Error('Usuario no encontrado');
  return user;
}
