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
}

type Fetch = typeof fetch;

export function createDriveProvider(opts: { fetch?: Fetch; token?: () => string | null } = {}) {
  const doFetch: Fetch = opts.fetch ?? ((...a) => fetch(...a));
  const tokenOf = opts.token ?? getToken;

  async function api(url: string, signal?: AbortSignal): Promise<Response> {
    const token = tokenOf();
    if (!token) throw new AuthRequiredError();
    const res = await doFetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
    if (res.status === 401) throw new AuthRequiredError();
    if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`);
    return res;
  }

  /** All direct children of a folder, following pagination. */
  async function listChildren(folderId: string, signal?: AbortSignal, foldersOnly = false): Promise<DriveItem[]> {
    const items: DriveItem[] = [];
    let pageToken: string | undefined;
    do {
      const q = `'${folderId}' in parents and trashed = false${foldersOnly ? ` and mimeType = '${FOLDER}'` : ''}`;
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken, files(id,name,mimeType,md5Checksum,modifiedTime,size,shortcutDetails)',
        pageSize: '1000',
        orderBy: 'folder,name',
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

  const provider: VaultProvider & { listFolders: typeof listFolders } = {
    async listTree(rootId, signal) {
      const out: RemoteEntry[] = [];
      // Breadth-first walk, a few folders at a time.
      let queue: { id: string; prefix: string }[] = [{ id: rootId, prefix: '' }];
      while (queue.length) {
        const batch = queue.splice(0, 4);
        const results = await Promise.all(batch.map((f) => listChildren(f.id, signal).then((items) => ({ f, items }))));
        for (const { f, items } of results) {
          for (const it of items) {
            const path = f.prefix + it.name;
            const isFolderShortcut = it.mimeType === SHORTCUT && it.shortcutDetails?.targetMimeType === FOLDER;
            if (it.mimeType === FOLDER || isFolderShortcut) {
              queue.push({ id: isFolderShortcut ? it.shortcutDetails!.targetId : it.id, prefix: path + '/' });
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

    async download(entry, signal) {
      const res = await api(`${API}/files/${encodeURIComponent(entry.id)}?alt=media&supportsAllDrives=true`, signal);
      return res.blob();
    },

    listFolders,
  };

  /** Folders inside `parentId` ('root' for My Drive), for the folder picker. */
  async function listFolders(parentId: string, signal?: AbortSignal) {
    return listChildren(parentId, signal, true);
  }

  return provider;
}

export const driveProvider = createDriveProvider();
