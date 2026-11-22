// Google OAuth 2.0 token flow using a full-page redirect.
// Popups are unreliable inside an iOS home-screen web app, a redirect always works.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const TOKEN_KEY = 'cortado.gtoken';
const STATE_KEY = 'cortado.oauthState';
const RESUME_KEY = 'cortado.oauthResume';

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

export function googleConfigured(): boolean {
  return !!CLIENT_ID;
}

function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, location.origin).href;
}

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    // Treat tokens about to expire as expired so a sync doesn't die halfway through.
    if (Date.now() > t.expiresAt - 5 * 60_000) return null;
    return t.accessToken;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
}

/** What to do after we come back from Google, e.g. `{ action: 'sync', vaultId }`. */
export type ResumeIntent = { action: 'sync'; vaultId: string } | { action: 'pick-folder' };

export function signIn(resume?: ResumeIntent): void {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID is not set. See SETUP.md.');
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  localStorage.setItem(STATE_KEY, state); // standalone iOS apps can lose sessionStorage on redirect
  if (resume) localStorage.setItem(RESUME_KEY, JSON.stringify(resume));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

/**
 * Call once at startup. If the URL holds an OAuth response, store the token, clean the URL,
 * and return the intent saved before the redirect.
 */
export function handleRedirect(): { resume?: ResumeIntent; error?: string } | null {
  if (!location.hash.includes('access_token=') && !location.hash.includes('error=')) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  const expected = sessionStorage.getItem(STATE_KEY) ?? localStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  const resumeRaw = localStorage.getItem(RESUME_KEY);
  localStorage.removeItem(RESUME_KEY);
  if (params.get('error')) return { error: params.get('error') ?? 'sign-in failed' };
  if (!expected || params.get('state') !== expected) return { error: 'Sign-in state mismatch, please try again.' };
  const token: StoredToken = {
    accessToken: params.get('access_token')!,
    expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return { resume: resumeRaw ? (JSON.parse(resumeRaw) as ResumeIntent) : undefined };
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Google sign-in required');
  }
}
