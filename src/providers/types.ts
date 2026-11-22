export interface RemoteEntry {
  /** Provider-specific id used to download the file. */
  id: string;
  /** Path relative to the vault root, POSIX-style. */
  path: string;
  size: number;
  md5?: string;
  modifiedTime?: string;
}

export interface VaultProvider {
  listTree(rootId: string, signal?: AbortSignal): Promise<RemoteEntry[]>;
  download(entry: RemoteEntry, signal?: AbortSignal): Promise<Blob>;
}
