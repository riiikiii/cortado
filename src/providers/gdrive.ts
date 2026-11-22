import { AuthRequiredError, getToken } from '../auth/google';
import type { RemoteEntry, VaultProvider } from './types';

const API = 'https://www.googleapis.com/drive/v3';
const FOLDER = 'application/vnd.google-apps.folder';
const SHORTCUT = 'application/vnd.google-apps.shortcut';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  md5Checksum?: string;
  modifiedTime?: string;
  size?: string;
  shortcutDetails?: { targetId: string; targetMimeType: string };
  owners?: { displayName?: string }[];
}

type Fetch = typeof fetch;

export function createDriveProvider(opts: { fetch?: Fetch; token?: () => string | null; accountId?: string } = {}) {
  const doFetch: Fetch = opts.fetch ?? ((...a) => fetch(...a));
  const tokenOf = opts.token ?? (() => getToken(opts.accountId));

  async function api(url: string, signal?: AbortSignal): Promise<Response> {
    const token = tokenOf();
    if (!token) throw new AuthRequiredError(opts.accountId);
    const res = await doFetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
    if (res.status === 401) throw new AuthRequiredError(opts.accountId);
    if (res.status === 404) throw new Error('Google Drive couldn’t find this folder. It may have been moved, or belong to another account.');
    if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`);
    return res;
  }

  async function listQuery(q: string, signal?: AbortSignal, orderBy = 'folder,name'): Promise<DriveItem[]> {
    const items: DriveItem[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken, files(id,name,mimeType,md5Checksum,modifiedTime,size,shortcutDetails,owners(displayName))',
        pageSize: '1000',
        orderBy,
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const res = await api(`${API}/files?${params}`, signal);
      const body = (await res.json()) as { files: DriveItem[]; nextPageToken?: string };
      items.push(...body.files);
      pageToken = body.nextPageToken;
    } while (pageToken);
    return items;
  }

  /** All direct children of a folder, following pagination. */
  function listChildren(folderId: string, signal?: AbortSignal, foldersOnly = false): Promise<DriveItem[]> {
    const q = `'${folderId}' in parents and trashed = false${foldersOnly ? ` and (mimeType = '${FOLDER}' or mimeType = '${SHORTCUT}')` : ''}`;
    return listQuery(q, signal);
  }

  const isFolder = (it: DriveItem) => it.mimeType === FOLDER || (it.mimeType === SHORTCUT && it.shortcutDetails?.targetMimeType === FOLDER);

  return {
    async listTree(rootId: string, signal?: AbortSignal): Promise<RemoteEntry[]> {
      const out: RemoteEntry[] = [];
      // Breadth-first walk, a few folders at a time.
      const queue: { id: string; prefix: string }[] = [{ id: rootId, prefix: '' }];
      while (queue.length) {
        const batch = queue.splice(0, 4);
        const results = await Promise.all(batch.map((f) => listChildren(f.id, signal).then((items) => ({ f, items }))));
        for (const { f, items } of results) {
          for (const it of items) {
            const path = f.prefix + it.name;
            if (isFolder(it)) {
              queue.push({ id: it.shortcutDetails?.targetId ?? it.id, prefix: path + '/' });
            } else if (it.mimeType.startsWith('application/vnd.google-apps.')) {
              // Google Docs/Sheets etc. have no file content to download; skip them.
              continue;
            } else {
              out.push({
                id: it.id,
                path,
                size: Number(it.size ?? 0),
                md5: it.md5Checksum,
                modifiedTime: it.modifiedTime,
              });
            }
          }
        }
      }
      return out;
    },

    async download(entry: RemoteEntry, signal?: AbortSignal): Promise<Blob> {
      const res = await api(`${API}/files/${encodeURIComponent(entry.id)}?alt=media&supportsAllDrives=true`, signal);
      return res.blob();
    },

    /** Folders inside `parentId` ('root' for My Drive), for the folder picker. */
    async listFolders(parentId: string, signal?: AbortSignal): Promise<DriveItem[]> {
      return (await listChildren(parentId, signal, true)).filter(isFolder);
    },

    /** Folders other people have shared with this account. */
    listSharedFolders(signal?: AbortSignal): Promise<DriveItem[]> {
      return listQuery(`sharedWithMe = true and mimeType = '${FOLDER}' and trashed = false`, signal, 'name');
    },

    /** Shared drives this account is a member of. */
    async listDrives(signal?: AbortSignal): Promise<DriveItem[]> {
      const res = await api(`${API}/drives?pageSize=100&fields=drives(id,name)`, signal);
      const body = (await res.json()) as { drives?: { id: string; name: string }[] };
      return (body.drives ?? []).map((d) => ({ ...d, mimeType: FOLDER }));
    },
  } satisfies VaultProvider & Record<string, unknown>;
}

export type DriveProvider = ReturnType<typeof createDriveProvider>;

/** A Drive provider that signs requests as `accountId` (any connected account when omitted). */
export const driveFor = (accountId?: string) => createDriveProvider({ accountId });
