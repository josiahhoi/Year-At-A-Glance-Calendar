/**
 * GIS access-token lifecycle.
 *
 * The token lives in memory only (never persisted — it's a bearer credential).
 * A localStorage hint remembers that the user signed in before, so a reload
 * attempts silent re-acquisition instead of showing the sign-in screen.
 *
 * Interactive token requests open a popup, which browsers only allow from a
 * user gesture — so `signInInteractive` must only ever be called from a click
 * handler. Background renewal always uses silent mode and, on failure, flips
 * state to 'needs-signin' so the UI can offer a Reconnect button.
 */
import { GCAL_SCOPE, GOOGLE_CLIENT_ID } from '../config';
import { loadGis } from './gis';

export type AuthStatus = 'init' | 'signed-out' | 'signing-in' | 'signed-in' | 'needs-signin';

const AUTH_HINT_KEY = 'yag.authHint.v1';
const EXPIRY_SAFETY_MS = 2 * 60 * 1000; // treat tokens expiring in <2min as stale
const PROACTIVE_RENEW_MS = 5 * 60 * 1000; // renew 5min before expiry

interface TokenState {
  accessToken: string | null;
  expiresAt: number; // epoch ms
}

const state: TokenState = { accessToken: null, expiresAt: 0 };

let status: AuthStatus = 'init';
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let pendingRequest: {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
} | null = null;
let inFlight: Promise<string> | null = null;
let renewTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

export function subscribeAuth(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAuthStatus(): AuthStatus {
  return status;
}

function setStatus(next: AuthStatus) {
  if (status !== next) {
    status = next;
    listeners.forEach((fn) => fn());
  }
}

function hasFreshToken(): boolean {
  return !!state.accessToken && Date.now() < state.expiresAt - EXPIRY_SAFETY_MS;
}

async function ensureClient(): Promise<google.accounts.oauth2.TokenClient> {
  if (tokenClient) return tokenClient;
  await loadGis();
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GCAL_SCOPE,
    callback: (resp) => {
      const pending = pendingRequest;
      pendingRequest = null;
      if (resp.error) {
        pending?.reject(new Error(resp.error));
        return;
      }
      state.accessToken = resp.access_token;
      state.expiresAt = Date.now() + Number(resp.expires_in) * 1000;
      localStorage.setItem(AUTH_HINT_KEY, '1');
      scheduleProactiveRenew();
      setStatus('signed-in');
      pending?.resolve(resp.access_token);
    },
    error_callback: (err) => {
      const pending = pendingRequest;
      pendingRequest = null;
      pending?.reject(new Error(err?.type ?? 'token_request_failed'));
    },
  });
  return tokenClient;
}

function requestToken(silent: boolean): Promise<string> {
  // Concurrent callers (e.g. parallel API requests hitting an expired token)
  // share one request; GIS only supports one at a time anyway.
  if (inFlight) return inFlight;
  inFlight = ensureClient()
    .then(
      (client) =>
        new Promise<string>((resolve, reject) => {
          pendingRequest = { resolve, reject };
          // prompt 'none' never shows UI (fails with interaction_required
          // instead); '' shows consent only when Google requires it.
          client.requestAccessToken({ prompt: silent ? 'none' : '' });
        }),
    )
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function scheduleProactiveRenew() {
  if (renewTimer) clearTimeout(renewTimer);
  const delay = Math.max(state.expiresAt - Date.now() - PROACTIVE_RENEW_MS, 30_000);
  renewTimer = setTimeout(() => {
    requestToken(true).catch(() => {
      // Silent renewal failed — mark stale; next user action shows Reconnect.
      setStatus('needs-signin');
    });
  }, delay);
}

/** Called once on app start: silently restores the session if possible. */
export async function initAuth(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    setStatus('signed-out');
    return;
  }
  if (localStorage.getItem(AUTH_HINT_KEY)) {
    setStatus('signing-in');
    try {
      await requestToken(true);
    } catch {
      setStatus('needs-signin');
    }
  } else {
    setStatus('signed-out');
  }
}

/** Must be called from a user gesture (click). */
export async function signInInteractive(): Promise<void> {
  setStatus('signing-in');
  try {
    await requestToken(false);
  } catch (err) {
    setStatus(localStorage.getItem(AUTH_HINT_KEY) ? 'needs-signin' : 'signed-out');
    throw err;
  }
}

export function signOut(): void {
  if (renewTimer) clearTimeout(renewTimer);
  const token = state.accessToken;
  state.accessToken = null;
  state.expiresAt = 0;
  localStorage.removeItem(AUTH_HINT_KEY);
  setStatus('signed-out');
  if (token && typeof google !== 'undefined') {
    google.accounts.oauth2.revoke(token, () => {});
  }
}

/**
 * Returns a valid access token, silently renewing if needed.
 * Throws (and flips status to needs-signin) when interaction is required.
 */
export async function ensureToken(): Promise<string> {
  if (hasFreshToken()) return state.accessToken!;
  try {
    return await requestToken(true);
  } catch (err) {
    setStatus('needs-signin');
    throw err;
  }
}

/** Forces a silent refresh — used by the API layer after a 401. */
export async function forceRenewToken(): Promise<string> {
  state.accessToken = null;
  state.expiresAt = 0;
  return ensureToken();
}
