import { encodePath } from '../util/paths';
import type { RemoteEntry, VaultProvider } from './types';

// The library published with the site from the repo's library/ folder (scripts/libraryPlugin.ts).

export const SITE_VAULT_ID = 'site';

export interface SiteLibraryInfo {
  name: string;
  count: number;
}

interface Manifest {
  name: string;
  files: { path: string; size: number; md5: string }[];
}

type Fetch = typeof fetch;

export function createSiteProvider(opts: { fetch?: Fetch; base?: string } = {}) {
  const doFetch: Fetch = opts.fetch ?? ((...a) => fetch(...a));
  const base = opts.base ?? import.meta.env.BASE_URL;

  async function manifest(signal?: AbortSignal): Promise<Manifest | null> {
    // no-cache: always ask the server whether the list changed, so new lessons show up at once.
    const res = await doFetch(`${base}library.json`, { cache: 'no-cache', signal });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Couldn’t read the library list (${res.status}).`);
    const body = (await res.json()) as Manifest;
    return Array.isArray(body?.files) ? body : null;
  }

  return {
    /** The library's name and size, or null when this site doesn't publish one (or we're offline). */
    async info(signal?: AbortSignal): Promise<SiteLibraryInfo | null> {
      try {
        const m = await manifest(signal);
        return m ? { name: m.name || 'Library', count: m.files.length } : null;
      } catch {
        return null;
      }
    },

    async listTree(_rootId: string, signal?: AbortSignal): Promise<RemoteEntry[]> {
      const m = await manifest(signal);
      if (!m) throw new Error('This site doesn’t publish a library any more.');
      return m.files.map((f) => ({ id: f.path, path: f.path, size: f.size, md5: f.md5 }));
    },

    async download(entry: RemoteEntry, signal?: AbortSignal): Promise<Blob> {
      // The md5 in the URL means a changed file is never served from a stale cache.
      const res = await doFetch(`${base}library/${encodePath(entry.path)}?v=${(entry.md5 ?? '').slice(0, 12)}`, { signal });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      return res.blob();
    },
  } satisfies VaultProvider & Record<string, unknown>;
}

export const siteProvider = createSiteProvider();
