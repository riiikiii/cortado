import { beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, String(v));
  removeItem = (k: string) => void this.m.delete(k);
  clear = () => this.m.clear();
}

const loc = { hash: '', pathname: '/', search: '', origin: 'https://example.github.io', assign: vi.fn() };
Object.assign(globalThis, {
  localStorage: new MemoryStorage(),
  sessionStorage: new MemoryStorage(),
  location: loc,
  history: { replaceState: vi.fn() },
});

const g = await import('./google');

const token = (accessToken: string, inMs = 3600_000) => ({ accessToken, expiresAt: Date.now() + inMs });
const profile = (email: string) =>
  new Response(JSON.stringify({ user: { displayName: 'Ada L', emailAddress: email, photoLink: 'https://x/p.png' } }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  loc.hash = '';
  loc.assign.mockReset();
});

describe('Google accounts', () => {
  it('identifies the account behind a token and keeps tokens per account', async () => {
    const fetchA = vi.fn(async () => profile('Ada@Example.com'));
    const a = await g.identify(token('tok-a'), fetchA as unknown as typeof fetch);
    expect(a).toEqual({ id: 'ada@example.com', email: 'Ada@Example.com', name: 'Ada L', photo: 'https://x/p.png' });
    expect((fetchA.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { Authorization: 'Bearer tok-a' } });

    await g.identify(token('tok-b'), (async () => profile('bob@example.com')) as unknown as typeof fetch);
    expect(g.listAccounts().map((x) => x.id)).toEqual(['bob@example.com', 'ada@example.com']);
    expect(g.getToken('ada@example.com')).toBe('tok-a');
    expect(g.getToken('bob@example.com')).toBe('tok-b');
    expect(g.getToken('nobody@example.com')).toBeNull();
  });

  it('treats tokens close to expiry as expired', async () => {
    await g.identify(token('old', 60_000), (async () => profile('c@example.com')) as unknown as typeof fetch);
    expect(g.getToken('c@example.com')).toBeNull();
    expect(g.hasSession('c@example.com')).toBe(false);
    expect(g.getToken()).toBeNull();
  });

  it('forgets an account and revokes its token', async () => {
    await g.identify(token('tok-d'), (async () => profile('d@example.com')) as unknown as typeof fetch);
    const revoke = vi.fn(async () => new Response(''));
    vi.stubGlobal('fetch', revoke);
    await g.removeAccount('d@example.com');
    vi.unstubAllGlobals();
    expect(g.listAccounts()).toEqual([]);
    expect(g.getToken('d@example.com')).toBeNull();
    expect((revoke.mock.calls[0] as unknown[])[0]).toBe('https://oauth2.googleapis.com/revoke');
  });
});

describe('sign-in redirect', () => {
  it('needs a client ID, then sends the user to Google with the right hints', () => {
    expect(() => g.signIn()).toThrow(/client ID/);
    g.setClientId('123-abc.apps.googleusercontent.com');
    g.signIn({ resume: { action: 'sync', vaultId: 'v1' }, loginHint: 'ada@example.com' });
    const url = new URL(loc.assign.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('123-abc.apps.googleusercontent.com');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.github.io/');
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.readonly');
    expect(url.searchParams.get('login_hint')).toBe('ada@example.com');
    expect(url.searchParams.get('prompt')).toBeNull();

    g.signIn({ chooseAccount: true });
    expect(new URL(loc.assign.mock.calls[1][0] as string).searchParams.get('prompt')).toBe('select_account');
  });

  it('reads the token and the saved intent when Google sends the user back', () => {
    g.setClientId('123-abc.apps.googleusercontent.com');
    g.signIn({ resume: { action: 'pick-folder' } });
    const state = new URL(loc.assign.mock.calls[0][0] as string).searchParams.get('state');
    loc.hash = `#access_token=fresh&expires_in=3599&state=${state}`;
    const r = g.readRedirect()!;
    expect(r.error).toBeUndefined();
    expect(r.token?.accessToken).toBe('fresh');
    expect(r.resume).toEqual({ action: 'pick-folder' });
    expect(g.readRedirect()).not.toBeNull(); // hash isn't cleared by the shim, but state is now spent:
    expect(g.readRedirect()?.error).toMatch(/didn’t match/);
  });

  it('explains a cancelled sign-in', () => {
    loc.hash = '#error=access_denied&state=x';
    expect(g.readRedirect()?.error).toBe('Google sign-in was cancelled.');
    loc.hash = '';
    expect(g.readRedirect()).toBeNull();
  });

  it('validates client IDs', () => {
    expect(g.CLIENT_ID_PATTERN.test('1234567890-abc123def.apps.googleusercontent.com')).toBe(true);
    expect(g.CLIENT_ID_PATTERN.test('not-a-client-id')).toBe(false);
  });
});
