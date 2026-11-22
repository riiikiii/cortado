import { db, type Vault } from '../storage/db';
import type { VaultProvider } from '../providers/types';
import { planSync } from './diff';

export interface SyncProgress {
  phase: 'listing' | 'downloading' | 'cleaning' | 'done';
  done: number;
  total: number;
  bytes: number;
  current?: string;
}

export interface SyncResult {
  downloaded: number;
  removed: number;
  unchanged: number;
  failed: { path: string; error: string }[];
}

const CONCURRENCY = 6;

export async function syncVault(
  vault: Vault,
  provider: VaultProvider,
  onProgress: (p: SyncProgress) => void,
  signal?: AbortSignal,
): Promise<SyncResult> {
  onProgress({ phase: 'listing', done: 0, total: 0, bytes: 0 });
  // Ask the browser not to evict our data under storage pressure.
  navigator.storage?.persist?.().catch(() => {});

  const remote = await provider.listTree(vault.rootFolderId, signal);
  const local = await db.files.where('vaultId').equals(vault.id).toArray();
  const blobKeys = (await db.blobs.where('vaultId').equals(vault.id).primaryKeys()) as [string, string][];
  const plan = planSync(remote, local, new Set(blobKeys.map((k) => k[1])));

  const progress: SyncProgress = { phase: 'downloading', done: 0, total: plan.download.length, bytes: 0 };
  onProgress({ ...progress });
  const failed: SyncResult['failed'] = [];

  let next = 0;
  async function worker() {
    while (next < plan.download.length) {
      signal?.throwIfAborted();
      const entry = plan.download[next++];
      try {
        const blob = await provider.download(entry, signal);
        await db.transaction('rw', db.files, db.blobs, async () => {
          await db.blobs.put({ vaultId: vault.id, path: entry.path, blob });
          await db.files.put({
            vaultId: vault.id,
            path: entry.path,
            remoteId: entry.id,
            size: blob.size,
            md5: entry.md5,
            modifiedTime: entry.modifiedTime,
          });
        });
        progress.bytes += blob.size;
      } catch (e) {
        if (signal?.aborted) throw e;
        failed.push({ path: entry.path, error: (e as Error).message });
      }
      progress.done++;
      progress.current = entry.path;
      onProgress({ ...progress });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, plan.download.length) }, worker));

  onProgress({ ...progress, phase: 'cleaning' });
  if (plan.remove.length) {
    const keys = plan.remove.map((p) => [vault.id, p] as [string, string]);
    await db.transaction('rw', db.files, db.blobs, async () => {
      await db.files.bulkDelete(keys);
      await db.blobs.bulkDelete(keys);
    });
  }
  await db.vaults.update(vault.id, { lastSyncedAt: Date.now() });
  onProgress({ ...progress, phase: 'done' });

  return { downloaded: plan.download.length - failed.length, removed: plan.remove.length, unchanged: plan.unchanged, failed };
}
