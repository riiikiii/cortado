// Google sign-in with the OAuth 2.0 token flow, using a full-page redirect.
// Popups are unreliable inside an iOS home-screen web app; a redirect always works.
//
// Several Google accounts can be connected at once. Each has its own short-lived access token,
// and each Drive vault remembers which account it came from, so syncing asks the right account.

const BUILT_IN_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null;
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const CLIENT_KEY = 'cortado.google.clientId';
const ACCOUNTS_KEY = 'cortado.google.accounts';
const TOKENS_KEY = 'cortado.google.tokens';
const LEGACY_TOKEN_KEY = 'cortado.gtoken';
const STATE_KEY = 'cortado.oauthState';
const RESUME_KEY = 'cortado.oauthResume';

export const CLIENT_ID_PATTERN = /^\d+-[a-z0-9_]+\.apps\.googleusercontent\.com$/i;

export interface GoogleAccount {
  /** The account's email address, lower-cased. */
  id: string;
  email: string;
  name: string;
  photo?: string;
}

export interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

export class AuthRequiredError extends Error {
  constructor(public accountId?: string) {
    super('Google sign-in required');
    this.name = 'AuthRequiredError';
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

// ---------- client ID ----------

/** The OAuth client ID: built into the app, or entered on this device in Settings. */
export function clientId(): string | null {
  return BUILT_IN_CLIENT_ID ?? (localStorage.getItem(CLIENT_KEY) || null);
}

export const clientIdIsBuiltIn = () => !!BUILT_IN_CLIENT_ID;

export function setClientId(id: string | null) {
  if (id) localStorage.setItem(CLIENT_KEY, id.trim());
  else localStorage.removeItem(CLIENT_KEY);
}

export const googleConfigured = () => !!clientId();

/** Where Google sends the user back to. It must be listed on the OAuth client. */
export function redirectUri(): string {
  return new URL(import.meta.env.BASE_URL, location.origin).href;
}

// ---------- accounts and tokens ----------

export function listAccounts(): GoogleAccount[] {
  return read<GoogleAccount[]>(ACCOUNTS_KEY, []);
}

function tokens(): Record<string, StoredToken> {
  return read<Record<string, StoredToken>>(TOKENS_KEY, {});
}

// Treat tokens about to expire as expired so a sync doesn't die halfway through.
const fresh = (t?: StoredToken) => !!t && Date.now() < t.expiresAt - 5 * 60_000;

/** A usable access token for `accountId`, or for any connected account when none is given. */
export function getToken(accountId?: string): string | null {
  const all = tokens();
  if (accountId) return fresh(all[accountId]) ? all[accountId].accessToken : null;
  return Object.values(all).find(fresh)?.accessToken ?? null;
}

export const hasSession = (accountId: string) => !!getToken(accountId);

function saveAccount(account: GoogleAccount, token: StoredToken) {
  write(ACCOUNTS_KEY, [account, ...listAccounts().filter((a) => a.id !== account.id)]);
  write(TOKENS_KEY, { ...tokens(), [account.id]: token });
}

/** Forget an account on this device and revoke its token with Google. */
export async function removeAccount(id: string): Promise<void> {
  const token = tokens()[id];
  const rest = tokens();
  delete rest[id];
  write(TOKENS_KEY, rest);
  write(ACCOUNTS_KEY, listAccounts().filter((a) => a.id !== id));
  if (token && fresh(token)) {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: token.accessToken }),
    }).catch(() => {});
  }
}

// ---------- sign-in redirect ----------

/** What to do after we come back from Google. */
export type ResumeIntent = { action: 'sync'; vaultId: string } | { action: 'pick-folder' };

export interface SignInOptions {
  resume?: ResumeIntent;
  /** Email of the account to sign in with; Google skips its account chooser. */
  loginHint?: string;
  /** Always show Google's account chooser, e.g. to add a second account. */
  chooseAccount?: boolean;
}

export function signIn(opts: SignInOptions = {}): void {
  const id = clientId();
  if (!id) throw new Error('Google sign-in is not set up yet. Add a client ID in Settings.');
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  localStorage.setItem(STATE_KEY, state); // standalone iOS apps can lose sessionStorage on redirect
  if (opts.resume) write(RESUME_KEY, opts.resume);
  else localStorage.removeItem(RESUME_KEY);
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  if (opts.loginHint) params.set('login_hint', opts.loginHint);
  if (opts.chooseAccount) params.set('prompt', 'select_account');
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

const FRIENDLY_ERRORS: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  invalid_client: 'Google didn’t recognise the client ID. Check it in Settings.',
  redirect_uri_mismatch: 'This address isn’t on the OAuth client’s list of redirect URIs.',
};

/**
 * If the URL holds an OAuth response, clean the URL and return the token (or error) together
 * with the intent saved before the redirect. Returns null when this isn't a sign-in return.
 */
export function readRedirect(): { token?: StoredToken; resume?: ResumeIntent; error?: string } | null {
  if (!location.hash.includes('access_token=') && !location.hash.includes('error=')) return null;
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  const expected = sessionStorage.getItem(STATE_KEY) ?? localStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  const resume = read<ResumeIntent | undefined>(RESUME_KEY, undefined);
  localStorage.removeItem(RESUME_KEY);
  const error = params.get('error');
  if (error) return { error: FRIENDLY_ERRORS[error] ?? `Google sign-in failed (${error}).`, resume };
  if (!expected || params.get('state') !== expected) return { error: 'Sign-in didn’t match this device. Please try again.' };
  return {
    resume,
    token: {
      accessToken: params.get('access_token')!,
      expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000,
    },
  };
}

/** Ask Drive who the token belongs to, then remember the account and its token. */
export async function identify(token: StoredToken, doFetch: typeof fetch = fetch): Promise<GoogleAccount> {
  const res = await doFetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) throw new Error(`Couldn’t read your Google profile (${res.status}).`);
  const { user } = (await res.json()) as { user: { displayName?: string; emailAddress: string; photoLink?: string } };
  const account: GoogleAccount = {
    id: user.emailAddress.toLowerCase(),
    email: user.emailAddress,
    name: user.displayName || user.emailAddress,
    photo: user.photoLink,
  };
  saveAccount(account, token);
  return account;
}

/** Call once at startup: completes a sign-in that just came back from Google. */
export async function finishRedirect(): Promise<{ account?: GoogleAccount; resume?: ResumeIntent; error?: string } | null> {
  const r = readRedirect();
  if (!r) return null;
  if (!r.token) return { error: r.error, resume: r.resume };
  try {
    return { account: await identify(r.token), resume: r.resume };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Earlier versions kept one anonymous token; attach it to its account if it still works. */
export async function migrateLegacyToken(): Promise<void> {
  const legacy = read<StoredToken | null>(LEGACY_TOKEN_KEY, null);
  if (!legacy) return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  if (fresh(legacy)) await identify(legacy).catch(() => {});
}
