import { create } from 'zustand';
import { AuthRequiredError, signIn } from '../auth/google';
import { devProvider } from '../providers/dev';
import { driveProvider } from '../providers/gdrive';
import type { VaultProvider } from '../providers/types';
import { db, deleteVaultData, type ProviderKind, type Vault } from '../storage/db';
import { syncVault, type SyncProgress, type SyncResult } from '../sync/sync';

export interface Tab {
  id: string;
  path: string;
  hash?: string;
  scrollY?: number;
  /** Bumped to force the viewer to reload. */
  nonce?: number;
}

interface SyncState {
  running: boolean;
  progress?: SyncProgress;
  result?: SyncResult;
  error?: string;
}

interface State {
  ready: boolean;
  vaults: Vault[];
  activeVaultId: string | null;
  paths: string[];
  tabs: Tab[];
  activeTabId: string | null;
  /** Tab ids, most recently used first. Used to decide which iframes stay alive. */
  mru: string[];
  recent: string[];
  sidebarOpen: boolean;
  quickOpen: boolean;
  vaultPickerOpen: boolean;
  sync: SyncState;
  toast?: string;

  init(): Promise<void>;
  setActiveVault(id: string | null): Promise<void>;
  addVault(v: { name: string; provider: ProviderKind; rootFolderId: string }): Promise<Vault>;
  removeVault(id: string): Promise<void>;
  openFile(path: string, opts?: { newTab?: boolean; hash?: string; background?: boolean }): void;
  closeTab(id: string): void;
  closeOtherTabs(id: string): void;
  activateTab(id: string): void;
  moveTab(id: string, toIndex: number): void;
  updateTab(id: string, patch: Partial<Tab>): void;
  setSidebarOpen(open: boolean): void;
  setQuickOpen(open: boolean): void;
  setVaultPickerOpen(open: boolean): void;
  runSync(): Promise<void>;
  cancelSync(): void;
  showToast(msg: string): void;
}

const providers: Record<ProviderKind, VaultProvider> = { gdrive: driveProvider, dev: devProvider };
const ACTIVE_KEY = 'cortado.activeVault';
const tabsKey = (vaultId: string) => `cortado.tabs.${vaultId}`;
const recentKey = (vaultId: string) => `cortado.recent.${vaultId}`;
const newId = () => Math.random().toString(36).slice(2, 10);

let syncAbort: AbortController | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function loadPaths(vaultId: string): Promise<string[]> {
  const keys = (await db.files.where('vaultId').equals(vaultId).primaryKeys()) as [string, string][];
  return keys.map((k) => k[1]).sort((a, b) => a.localeCompare(b));
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  vaults: [],
  activeVaultId: null,
  paths: [],
  tabs: [],
  activeTabId: null,
  mru: [],
  recent: [],
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 900 : true,
  quickOpen: false,
  vaultPickerOpen: false,
  sync: { running: false },

  async init() {
    const vaults = await db.vaults.orderBy('id').toArray();
    vaults.sort((a, b) => a.createdAt - b.createdAt);
    set({ vaults });
    const saved = localStorage.getItem(ACTIVE_KEY);
    const active = vaults.find((v) => v.id === saved) ?? vaults[0];
    await get().setActiveVault(active?.id ?? null);
    set({ ready: true });
  },

  async setActiveVault(id) {
    if (!id) {
      localStorage.removeItem(ACTIVE_KEY);
      set({ activeVaultId: null, paths: [], tabs: [], activeTabId: null, mru: [], recent: [] });
      return;
    }
    localStorage.setItem(ACTIVE_KEY, id);
    const paths = await loadPaths(id);
    const saved = readJSON<{ tabs: Tab[]; activeTabId: string | null }>(tabsKey(id), { tabs: [], activeTabId: null });
    const tabs = saved.tabs.filter((t) => t.path);
    const activeTabId = tabs.some((t) => t.id === saved.activeTabId) ? saved.activeTabId : (tabs[0]?.id ?? null);
    set({
      activeVaultId: id,
      paths,
      tabs,
      activeTabId,
      mru: activeTabId ? [activeTabId] : [],
      recent: readJSON<string[]>(recentKey(id), []),
    });
  },

  async addVault({ name, provider, rootFolderId }) {
    const vault: Vault = { id: newId(), name, provider, rootFolderId, createdAt: Date.now() };
    await db.vaults.put(vault);
    set({ vaults: [...get().vaults, vault] });
    await get().setActiveVault(vault.id);
    return vault;
  },

  async removeVault(id) {
    await deleteVaultData(id);
    localStorage.removeItem(tabsKey(id));
    localStorage.removeItem(recentKey(id));
    const vaults = get().vaults.filter((v) => v.id !== id);
    set({ vaults });
    if (get().activeVaultId === id) await get().setActiveVault(vaults[0]?.id ?? null);
  },

  openFile(path, opts = {}) {
    const { tabs, activeTabId } = get();
    const existing = tabs.find((t) => t.path === path);
    let nextTabs: Tab[];
    let target: Tab;
    if (existing && !opts.newTab) {
      // Already open: just switch to it.
      target = { ...existing, hash: opts.hash, nonce: opts.hash ? Date.now() : existing.nonce };
      nextTabs = tabs.map((t) => (t.id === existing.id ? target : t));
    } else if (opts.newTab || !activeTabId) {
      target = { id: newId(), path, hash: opts.hash };
      const at = tabs.findIndex((t) => t.id === activeTabId);
      nextTabs = [...tabs.slice(0, at + 1), target, ...tabs.slice(at + 1)];
    } else {
      target = { id: activeTabId, path, hash: opts.hash, scrollY: 0, nonce: Date.now() };
      nextTabs = tabs.map((t) => (t.id === activeTabId ? target : t));
    }
    const recent = [path, ...get().recent.filter((p) => p !== path)].slice(0, 30);
    set({ tabs: nextTabs, recent });
    if (!opts.background) get().activateTab(target.id);
    if (window.innerWidth < 900) set({ sidebarOpen: false });
  },

  closeTab(id) {
    const { tabs, activeTabId, mru } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    const nextMru = mru.filter((m) => m !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) nextActive = nextMru[0] ?? nextTabs[Math.min(idx, nextTabs.length - 1)]?.id ?? null;
    set({ tabs: nextTabs, mru: nextMru, activeTabId: nextActive });
  },

  closeOtherTabs(id) {
    set({ tabs: get().tabs.filter((t) => t.id === id), mru: [id], activeTabId: id });
  },

  activateTab(id) {
    set({ activeTabId: id, mru: [id, ...get().mru.filter((m) => m !== id)] });
  },

  moveTab(id, toIndex) {
    const tabs = [...get().tabs];
    const from = tabs.findIndex((t) => t.id === id);
    if (from < 0) return;
    const [tab] = tabs.splice(from, 1);
    tabs.splice(Math.max(0, Math.min(toIndex, tabs.length)), 0, tab);
    set({ tabs });
  },

  updateTab(id, patch) {
    set({ tabs: get().tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setQuickOpen: (open) => set({ quickOpen: open }),
  setVaultPickerOpen: (open) => set({ vaultPickerOpen: open }),

  async runSync() {
    const vault = get().vaults.find((v) => v.id === get().activeVaultId);
    if (!vault || get().sync.running) return;
    syncAbort = new AbortController();
    set({ sync: { running: true } });
    try {
      const result = await syncVault(
        vault,
        providers[vault.provider],
        (progress) => set({ sync: { running: true, progress } }),
        syncAbort.signal,
      );
      const paths = await loadPaths(vault.id);
      const updated = (await db.vaults.get(vault.id))!;
      set({
        sync: { running: false, result },
        paths,
        vaults: get().vaults.map((v) => (v.id === vault.id ? updated : v)),
        // Reload open tabs so they show the fresh content.
        tabs: get().tabs.map((t) => ({ ...t, nonce: Date.now() })),
      });
      const changed = result.downloaded + result.removed;
      get().showToast(
        result.failed.length
          ? `Synced with ${result.failed.length} error(s). ${result.failed[0].path}: ${result.failed[0].error}`
          : changed
            ? `Synced: ${result.downloaded} updated, ${result.removed} removed`
            : 'Vault is up to date',
      );
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        set({ sync: { running: false } });
        signIn({ action: 'sync', vaultId: vault.id });
        return;
      }
      const aborted = syncAbort?.signal.aborted;
      set({ sync: { running: false, error: aborted ? undefined : (e as Error).message } });
      get().showToast(aborted ? 'Sync cancelled' : `Sync failed: ${(e as Error).message}`);
      // Whatever finished downloading is kept, so refresh the tree.
      set({ paths: await loadPaths(vault.id) });
    } finally {
      syncAbort = null;
    }
  },

  cancelSync() {
    syncAbort?.abort();
  },

  showToast(msg) {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: undefined }), 4000);
  },
}));

// Persist tabs and recent files per vault.
useStore.subscribe((s, prev) => {
  if (!s.activeVaultId) return;
  if (s.tabs !== prev.tabs || s.activeTabId !== prev.activeTabId) {
    const tabs = s.tabs.map(({ id, path, scrollY }) => ({ id, path, scrollY }));
    localStorage.setItem(tabsKey(s.activeVaultId), JSON.stringify({ tabs, activeTabId: s.activeTabId }));
  }
  if (s.recent !== prev.recent) localStorage.setItem(recentKey(s.activeVaultId), JSON.stringify(s.recent));
});
