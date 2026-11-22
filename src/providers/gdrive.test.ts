import { describe, expect, it } from 'vitest';
import { createDriveProvider } from './gdrive';

const FOLDER = 'application/vnd.google-apps.folder';

describe('Google Drive provider', () => {
  it('walks folders recursively, follows pagination and skips Google Docs', async () => {
    const pages: Record<string, { files: object[]; nextPageToken?: string }[]> = {
      root: [
        { files: [{ id: 'f1', name: 'Guides', mimeType: FOLDER }], nextPageToken: 'p2' },
        { files: [{ id: 'a', name: 'Welcome.md', mimeType: 'text/markdown', md5Checksum: 'm1', size: '10' }] },
      ],
      f1: [
        {
          files: [
            { id: 'b', name: 'Guide.html', mimeType: 'text/html', md5Checksum: 'm2', size: '20' },
            { id: 'd', name: 'A Doc', mimeType: 'application/vnd.google-apps.document' },
          ],
        },
      ],
    };
    const calls: string[] = [];
    const fakeFetch = (async (input: string) => {
      const url = new URL(input);
      calls.push(url.search);
      const folder = /'([^']+)' in parents/.exec(url.searchParams.get('q')!)![1];
      const page = url.searchParams.get('pageToken') ? 1 : 0;
      return new Response(JSON.stringify(pages[folder][page]));
    }) as unknown as typeof fetch;

    const p = createDriveProvider({ fetch: fakeFetch, token: () => 'tok' });
    const tree = await p.listTree('root');
    expect(tree.map((t) => t.path).sort()).toEqual(['Guides/Guide.html', 'Welcome.md']);
    expect(tree.find((t) => t.path === 'Welcome.md')).toMatchObject({ id: 'a', md5: 'm1', size: 10 });
    expect(calls).toHaveLength(3);
  });

  it('asks for sign-in when there is no token', async () => {
    const p = createDriveProvider({ fetch: (async () => new Response('')) as unknown as typeof fetch, token: () => null });
    await expect(p.listTree('root')).rejects.toThrow('Google sign-in required');
  });
});
