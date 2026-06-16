import { z } from 'zod';

/** Letras (incluye tildes/ñ), números, punto, guion y guion bajo. Sin espacios. */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(30, 'El usuario no puede superar 30 caracteres')
  .regex(/^[\p{L}\p{N}_.-]+$/u, 'Usa solo letras, números, puntos, guiones o guiones bajos (sin espacios)');

export const optionalEmailSchema = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.string().email('Email inválido').optional(),
);

export function formatZodErrors(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  const first = Object.entries(fieldErrors).find(([, msgs]) => msgs && msgs.length > 0);
  if (first) {
    const [field, msgs] = first;
    const labels: Record<string, string> = {
      username: 'Usuario',
      password: 'Contraseña',
      email: 'Email',
      turnstileToken: 'Verificación',
    };
    return `${labels[field] ?? field}: ${msgs![0]}`;
  }
  return 'Datos inválidos';
}
