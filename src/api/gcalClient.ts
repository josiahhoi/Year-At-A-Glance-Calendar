import { ensureToken, forceRenewToken } from '../auth/tokenManager';
import { GCAL_API_BASE } from '../config';

export class GcalError extends Error {
  status: number;
  reason?: string;

  constructor(status: number, message: string, reason?: string) {
    super(message);
    this.name = 'GcalError';
    this.status = status;
    this.reason = reason;
  }
}

const BACKOFF_MS = [250, 1000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function parseError(res: Response): Promise<GcalError> {
  let message = `${res.status} ${res.statusText}`;
  let reason: string | undefined;
  try {
    const body = await res.json();
    message = body?.error?.message ?? message;
    reason = body?.error?.errors?.[0]?.reason;
  } catch {
    // non-JSON error body
  }
  return new GcalError(res.status, message, reason);
}

/**
 * Authenticated fetch against the Calendar API.
 * - injects a fresh bearer token (silent renew when stale)
 * - one renew+retry on 401
 * - exponential backoff on 429 / rate-limit 403
 * - returns null for empty bodies (DELETE)
 */
export async function gfetch<T>(path: string, init?: RequestInit): Promise<T> {
  let token = await ensureToken();
  let attempt = 0;
  let retried401 = false;

  for (;;) {
    const res = await fetch(`${GCAL_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    if (res.ok) {
      if (res.status === 204) return null as T;
      const text = await res.text();
      return (text ? JSON.parse(text) : null) as T;
    }

    if (res.status === 401 && !retried401) {
      retried401 = true;
      token = await forceRenewToken();
      continue;
    }

    const err = await parseError(res);
    const rateLimited =
      res.status === 429 ||
      (res.status === 403 && (err.reason === 'rateLimitExceeded' || err.reason === 'userRateLimitExceeded'));
    if (rateLimited && attempt < BACKOFF_MS.length) {
      await sleep(BACKOFF_MS[attempt]);
      attempt += 1;
      continue;
    }

    throw err;
  }
}
