import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function secret(): string {
  return process.env.AUTH_SECRET || process.env.POSTGRES_URL || process.env.DATABASE_URL || 'bolao-dev-secret';
}

function hmac(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

export function hashPin(pin: string): string {
  const salt = randomBytes(8).toString('hex');
  const hash = createHash('sha256').update(salt + ':' + pin).digest('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = createHash('sha256').update(salt + ':' + pin).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
  } catch {
    return false;
  }
}

export function makeToken(participantId: string): string {
  return `${participantId}.${hmac(participantId)}`;
}

/** Retorna o id do participante se o token for válido, senão null. */
export function verifyToken(header: string | null): string | null {
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(id);
  try {
    if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return id;
  } catch { /* tamanhos diferentes */ }
  return null;
}

export function makeAdminToken(): string {
  return `admin.${hmac('admin-token')}`;
}

export function verifyAdminToken(header: string | null): boolean {
  if (!header) return false;
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token.startsWith('admin.')) return false;
  const sig = token.slice('admin.'.length);
  const expected = hmac('admin-token');
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkAdminPin(pin: string): boolean {
  const expected = process.env.ADMIN_PIN || 'copa2026';
  return pin === expected;
}
