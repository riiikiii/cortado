import Dexie, { type EntityTable } from 'dexie';

export type ProviderKind = 'gdrive' | 'dev';

export interface Vault {
  id: string;
  name: string;
  provider: ProviderKind;
  rootFolderId: string;
  /** Google account (email) a Drive vault belongs to. */
  accountId?: string;
  lastSyncedAt?: number;
  createdAt: number;
}

export interface FileMeta {
  vaultId: string;
  path: string;
  remoteId: string;
  size: number;
  md5?: string;
  modifiedTime?: string;
}

export interface FileBlob {
  vaultId: string;
  path: string;
  blob: Blob;
}

class CortadoDB extends Dexie {
  vaults!: EntityTable<Vault, 'id'>;
  files!: Dexie.Table<FileMeta, [string, string]>;
  blobs!: Dexie.Table<FileBlob, [string, string]>;

  constructor() {
    super('cortado');
    this.version(1).stores({
      vaults: 'id',
      files: '[vaultId+path], vaultId',
      blobs: '[vaultId+path], vaultId',
    });
  }
}

export const db = new CortadoDB();

export async function getBlob(vaultId: string, path: string): Promise<Blob | undefined> {
  return (await db.blobs.get([vaultId, path]))?.blob;
}

export async function deleteVaultData(vaultId: string) {
  await db.transaction('rw', db.vaults, db.files, db.blobs, async () => {
    await db.files.where('vaultId').equals(vaultId).delete();
    await db.blobs.where('vaultId').equals(vaultId).delete();
    await db.vaults.delete(vaultId);
  });
}
