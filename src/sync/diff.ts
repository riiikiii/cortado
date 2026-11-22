import type { FileMeta } from '../storage/db';
import type { RemoteEntry } from '../providers/types';

export interface SyncPlan {
  download: RemoteEntry[];
  remove: string[];
  unchanged: number;
}

/**
 * Decide what to fetch and delete. A file is re-downloaded when its md5 changed, or (when the
 * provider gives no md5) its modifiedTime or size changed, or its body is missing locally.
 */
export function planSync(remote: RemoteEntry[], local: FileMeta[], haveBlob: Set<string>): SyncPlan {
  const localByPath = new Map(local.map((f) => [f.path, f]));
  const remotePaths = new Set<string>();
  const download: RemoteEntry[] = [];
  let unchanged = 0;

  for (const r of remote) {
    remotePaths.add(r.path);
    const l = localByPath.get(r.path);
    const same =
      l &&
      haveBlob.has(r.path) &&
      (r.md5 && l.md5 ? r.md5 === l.md5 : r.modifiedTime === l.modifiedTime && r.size === l.size);
    if (same) unchanged++;
    else download.push(r);
  }

  const remove = local.filter((f) => !remotePaths.has(f.path)).map((f) => f.path);
  return { download, remove, unchanged };
}
