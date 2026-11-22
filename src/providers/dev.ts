import type { RemoteEntry, VaultProvider } from './types';

/** Reads ./sample-vault through the dev server plugin (scripts/devVaultPlugin.ts). */
export const devProvider: VaultProvider = {
  async listTree(_rootId, signal) {
    const res = await fetch('/__dev-vault/list', { signal });
    if (!res.ok) throw new Error(`Dev vault list failed: ${res.status}`);
    return (await res.json()) as RemoteEntry[];
  },
  async download(entry, signal) {
    const res = await fetch(`/__dev-vault/file?path=${encodeURIComponent(entry.path)}`, { signal });
    if (!res.ok) throw new Error(`Dev vault download failed: ${entry.path}`);
    return res.blob();
  },
};
