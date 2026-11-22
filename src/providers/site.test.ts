import { describe, expect, it, vi } from 'vitest';
import { createSiteProvider } from './site';

const manifest = { name: 'Spanish', files: [{ path: 'Unit 1/01 Hola.md', size: 5, md5: 'abcdef0123456789' }] };

describe('site library provider', () => {
  it('lists the published files and downloads them with a cache-busting version', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.endsWith('library.json') ? new Response(JSON.stringify(manifest)) : new Response('hola!'),
    );
    const p = createSiteProvider({ fetch: fetch as unknown as typeof globalThis.fetch, base: '/cortado/' });

    expect(await p.info()).toEqual({ name: 'Spanish', count: 1 });
    const [entry] = await p.listTree('library');
    expect(entry).toEqual({ id: 'Unit 1/01 Hola.md', path: 'Unit 1/01 Hola.md', size: 5, md5: 'abcdef0123456789' });
    expect(await (await p.download(entry)).text()).toBe('hola!');

    const urls = fetch.mock.calls.map((c) => c[0]);
    expect(urls).toContain('/cortado/library/Unit%201/01%20Hola.md?v=abcdef012345');
    expect((fetch.mock.calls[0] as unknown[])[1]).toMatchObject({ cache: 'no-cache' });
  });

  it('reports no library when the site has none or is offline', async () => {
    const missing = createSiteProvider({ fetch: (async () => new Response('', { status: 404 })) as unknown as typeof fetch, base: '/' });
    expect(await missing.info()).toBeNull();
    await expect(missing.listTree('library')).rejects.toThrow(/doesn’t publish a library/);

    const offline = createSiteProvider({ fetch: (async () => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch, base: '/' });
    expect(await offline.info()).toBeNull();
  });
});
