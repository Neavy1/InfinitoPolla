import { config } from '../config.js';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  if (config.isDev && !config.turnstileSecret) return true;
  if (!config.turnstileSecret) return false;
  if (!token) return false;

  const body = new URLSearchParams({
    secret: config.turnstileSecret,
    response: token,
  });
  if (remoteIp) body.append('remoteip', remoteIp);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = (await response.json()) as TurnstileResponse;
  return data.success;
}
