import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, verifyRefreshToken, signAccessToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import * as authService from '../services/auth.service.js';
import { usernameSchema, optionalEmailSchema } from '../validators/auth.validators.js';

const router = Router();

const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
  email: optionalEmailSchema,
  turnstileToken: z.string().min(1, 'Completa la verificación de seguridad'),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  turnstileToken: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6).max(100),
});

router.post('/register', validateBody(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, email, turnstileToken } = req.body;
    const result = await authService.registerUser(username, password, turnstileToken, email, req.ip);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al registrar';
    res.status(400).json({ error: message });
  }
});

router.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, turnstileToken } = req.body;
    const result = await authService.loginUser(username, password, turnstileToken, req.ip);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : 'Error al iniciar sesión' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token requerido' });
      return;
    }
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(payload);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    await authService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Contraseña actualizada' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error' });
  }
});

export default router;
