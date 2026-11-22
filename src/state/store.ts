import { create } from 'zustand';
import { extractText, type DocText } from '../library/text';
import { isLesson, lessonTitle } from '../library/tree';
import { devProvider } from '../providers/dev';
import { SITE_VAULT_ID, siteProvider, type SiteLibraryInfo } from '../providers/site';
import type { VaultProvider } from '../providers/types';
import { db, deleteVaultData, type ProviderKind, type Vault } from '../storage/db';
import { syncVault, type SyncProgress, type SyncResult } from '../sync/sync';
import { kindOf, stem } from '../util/paths';

export interface Tab {
  id: string;
  /** null for a new tab that hasn't had a file chosen yet. */
  path: string | null;
  hash?: string;
  scrollY?: number;
  /** Bumped to force the viewer to reload. */
  nonce?: number;
}

/** A tab showing a file. */
export type DocTab = Tab & { path: string };

export interface Progress {
  /** Furthest point read, 0 to 1. */
  ratio: number;
  doneAt?: number;
  openedAt?: number;
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
  /** null shows the library home. */
  activeTabId: string | null;
  /** Tab ids, most recently used first. Used to decide which iframes stay alive. */
  mru: string[];
  recent: string[];
  /** Reading progress per path in the active vault. */
  progress: Record<string, Progress>;
  /** Text of every note and guide, for search and reading times. Null until built. */
  docs: Map<string, DocText> | null;
  /** Each document's own title (first heading or <title>), cached per vault so it shows at once. */
  titles: Record<string, string>;
  sidebarOpen: boolean;
  quickOpen: boolean;
  settingsOpen: boolean;
  pickerOpen: boolean;
  sync: SyncState;
  toast?: { message: string; id: number };
  /** The library this site publishes from the repo, once checked. Null when there is none. */
  siteLibrary: SiteLibraryInfo | null;
  /**
   * Whether the service worker serves vault files to this page yet. Guides, PDFs and images load
   * through it, so they wait while it's 'pending' (only on a first launch, while it installs).
   */
  sw: 'pending' | 'ok' | 'unsupported' | 'failed';

  init(): Promise<void>;
  setActiveVault(id: string | null): Promise<void>;
  addVault(v: { name: string; provider: ProviderKind; rootFolderId: string }): Promise<Vault>;
  removeVault(id: string): Promise<void>;
  /** Add the site's published library as a vault (automatically on first launch). */
  addSiteLibrary(opts?: { activate?: boolean }): Promise<void>;
  /** Open a file in the current tab (or in a new one with `newTab`, e.g. ⌘-click). */
  openFile(path: string, opts?: { newTab?: boolean; hash?: string; background?: boolean }): void;
  /** Add an empty tab at the end and switch to it. */
  newTab(): void;
  closeTab(id: string): void;
  closeAllTabs(): void;
  closeOtherTabs(id: string): void;
  activateTab(id: string): void;
  moveTab(id: string, toIndex: number): void;
  updateTab(id: string, patch: Partial<Tab>): void;
  recordProgress(path: string, ratio: number): void;
  setDone(path: string, done: boolean): void;
  resetProgress(): void;
  setSidebarOpen(open: boolean): void;
  setQuickOpen(open: boolean): void;
  setSettingsOpen(open: boolean): void;
  setPickerOpen(open: boolean): void;
  /** `quiet` is for background checks: no toast unless something changed, and no error shown. */
  runSync(opts?: { quiet?: boolean }): Promise<void>;
  cancelSync(): void;
  showToast(msg: string): void;
}

const ACTIVE_KEY = 'cortado.activeVault';
const tabsKey = (vaultId: string) => `cortado.tabs.${vaultId}`;
const recentKey = (vaultId: string) => `cortado.recent.${vaultId}`;
const progressKey = (vaultId: string) => `cortado.progress.${vaultId}`;
const titlesKey = (vaultId: string) => `cortado.titles.${vaultId}`;
// Left over from the Google Drive sign-in, which has been removed.
const LEGACY_KEYS = ['cortado.google.accounts', 'cortado.google.tokens', 'cortado.google.clientId', 'cortado.gtoken', 'cortado.oauthState', 'cortado.oauthResume'];
// Set when someone removes the site library, so it isn't added back on the next launch.
const SITE_REMOVED_KEY = 'cortado.siteLibraryRemoved';
const newId = () => Math.random().toString(36).slice(2, 10);
export const isNarrow = () => window.innerWidth < 900;

let syncAbort: AbortController | null = null;
/** A sync asked for while another was running; it runs for the active vault afterwards. */
let queuedSync: { quiet?: boolean } | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let indexRun = 0;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function providerFor(vault: Vault): VaultProvider {
  if (vault.provider === 'site') return siteProvider;
  return devProvider;
}

async function loadPaths(vaultId: string): Promise<string[]> {
  const keys = (await db.files.where('vaultId').equals(vaultId).primaryKeys()) as [string, string][];
  return keys.map((k) => k[1]).sort((a, b) => a.localeCompare(b));
}

export const useStore = create<State>((set, get) => {
  /** Read every note and guide in the background so search and reading times work. */
  async function buildDocs(vaultId: string) {
    const run = ++indexRun;
    set({ docs: null });
    const paths = get().paths.filter((p) => isLesson(p) && kindOf(p) !== 'pdf');
    const docs = new Map<string, DocText>();
    for (let i = 0; i < paths.length; i += 25) {
      const chunk = paths.slice(i, i + 25);
      const rows = await db.blobs.bulkGet(chunk.map((p) => [vaultId, p] as [string, string]));
      for (const row of rows) {
        // Very large files (often guides with embedded media) are left out of search.
        if (!row || row.blob.size > 3_000_000) continue;
        try {
          docs.set(row.path, extractText(row.path, await row.blob.text()));
        } catch {
          /* unreadable file: leave it out of search */
        }
      }
      if (run !== indexRun) return;
      await new Promise((r) => setTimeout(r, 0));
    }
    if (run !== indexRun || get().activeVaultId !== vaultId) return;
    const titles: Record<string, string> = {};
    for (const d of docs.values()) if (d.title !== stem(d.path)) titles[d.path] = d.title;
    set({ docs, titles });
    localStorage.setItem(titlesKey(vaultId), JSON.stringify(titles));
  }

  return {
    ready: false,
    vaults: [],
    activeVaultId: null,
    paths: [],
    tabs: [],
    activeTabId: null,
    mru: [],
    recent: [],
    progress: {},
    docs: null,
    titles: {},
    sidebarOpen: typeof window !== 'undefined' ? !isNarrow() : true,
    quickOpen: false,
    settingsOpen: false,
    pickerOpen: false,
    sync: { running: false },
    siteLibrary: null,
    sw: typeof navigator !== 'undefined' && navigator.serviceWorker?.controller ? 'ok' : 'pending',

    async init() {
      let vaults = await db.vaults.toArray();
      // Google Drive vaults are no longer supported: clear them and any old sign-in data away.
      for (const v of vaults.filter((v) => (v.provider as string) === 'gdrive')) {
        await deleteVaultData(v.id);
        for (const key of [tabsKey(v.id), recentKey(v.id), progressKey(v.id), titlesKey(v.id)]) localStorage.removeItem(key);
      }
      vaults = vaults.filter((v) => (v.provider as string) !== 'gdrive');
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      vaults.sort((a, b) => a.createdAt - b.createdAt);
      set({ vaults });
      const saved = localStorage.getItem(ACTIVE_KEY);
      const active = vaults.find((v) => v.id === saved) ?? vaults[0];
      await get().setActiveVault(active?.id ?? null);
      set({ ready: true });
      // Look for a library published with the site, without holding up startup.
      void siteProvider.info().then(async (info) => {
        set({ siteLibrary: info });
        if (!info) return;
        // Pick up a new name for the library (it's stored with the vault when first added).
        const site = get().vaults.find((v) => v.provider === 'site');
        if (site && site.name !== info.name) {
          await db.vaults.update(site.id, { name: info.name });
          set({ vaults: get().vaults.map((v) => (v.id === site.id ? { ...v, name: info.name } : v)) });
        }
        if (site || localStorage.getItem(SITE_REMOVED_KEY)) return;
        const first = !get().activeVaultId;
        await get().addSiteLibrary({ activate: first });
        if (!first) get().showToast(`New: “${info.name}” is ready. Tap the vault name to open it.`);
      });
    },

    async setActiveVault(id) {
      indexRun++;
      if (!id) {
        localStorage.removeItem(ACTIVE_KEY);
        set({ activeVaultId: null, paths: [], tabs: [], activeTabId: null, mru: [], recent: [], progress: {}, docs: null, titles: {} });
        return;
      }
      localStorage.setItem(ACTIVE_KEY, id);
      const paths = await loadPaths(id);
      const saved = readJSON<{ tabs: Tab[]; activeTabId?: string | null }>(tabsKey(id), { tabs: [], activeTabId: null });
      const tabs = saved.tabs.filter((t) => t.id && (typeof t.path === 'string' || t.path === null));
      const activeTabId = tabs.some((t) => t.id === saved.activeTabId) ? saved.activeTabId! : (tabs[0]?.id ?? null);
      set({
        activeVaultId: id,
        paths,
        tabs,
        activeTabId,
        mru: activeTabId ? [activeTabId] : [],
        recent: readJSON<string[]>(recentKey(id), []),
        titles: readJSON<Record<string, string>>(titlesKey(id), {}),
        progress: readJSON<Record<string, Progress>>(progressKey(id), {}),
      });
      void buildDocs(id);
      // The site library is cheap to check, so keep it current whenever it's opened.
      if (get().vaults.find((v) => v.id === id)?.provider === 'site' && navigator.onLine) void get().runSync({ quiet: true });
    },

    async addVault({ name, provider, rootFolderId }) {
      const vault: Vault = { id: newId(), name, provider, rootFolderId, createdAt: Date.now() };
      await db.vaults.put(vault);
      set({ vaults: [...get().vaults, vault] });
      await get().setActiveVault(vault.id);
      return vault;
    },

    async addSiteLibrary({ activate = true } = {}) {
      const info = get().siteLibrary ?? (await siteProvider.info());
      if (!info) return;
      localStorage.removeItem(SITE_REMOVED_KEY);
      const existing = get().vaults.find((v) => v.provider === 'site');
      if (!existing) {
        const vault: Vault = { id: SITE_VAULT_ID, name: info.name, provider: 'site', rootFolderId: 'library', createdAt: Date.now() };
        await db.vaults.put(vault);
        set({ vaults: [...get().vaults, vault] });
      }
      if (activate) await get().setActiveVault(SITE_VAULT_ID);
    },

    async removeVault(id) {
      if (get().vaults.find((v) => v.id === id)?.provider === 'site') localStorage.setItem(SITE_REMOVED_KEY, '1');
      await deleteVaultData(id);
      for (const key of [tabsKey(id), recentKey(id), progressKey(id), titlesKey(id)]) localStorage.removeItem(key);
      const vaults = get().vaults.filter((v) => v.id !== id);
      set({ vaults });
      if (get().activeVaultId === id) await get().setActiveVault(vaults[0]?.id ?? null);
    },

    openFile(path, opts = {}) {
      const { tabs, activeTabId } = get();
      const active = tabs.find((t) => t.id === activeTabId);
      let nextTabs: Tab[];
      let target: Tab;
      if (opts.newTab || !active) {
        // A new tab goes next to the current one, like in a browser.
        target = { id: newId(), path, hash: opts.hash };
        const at = tabs.findIndex((t) => t.id === activeTabId);
        nextTabs = at < 0 ? [...tabs, target] : [...tabs.slice(0, at + 1), target, ...tabs.slice(at + 1)];
      } else {
        // Otherwise the file always replaces what the current tab shows.
        target = { id: active.id, path, hash: opts.hash, scrollY: 0, nonce: Date.now() };
        nextTabs = tabs.map((t) => (t.id === active.id ? target : t));
      }
      const recent = [path, ...get().recent.filter((p) => p !== path)].slice(0, 30);
      const prev = get().progress[path];
      set({ tabs: nextTabs, recent, progress: { ...get().progress, [path]: { ...prev, ratio: prev?.ratio ?? 0, openedAt: Date.now() } } });
      if (!opts.background) get().activateTab(target.id);
      if (isNarrow()) set({ sidebarOpen: false });
    },

    newTab() {
      const tab: Tab = { id: newId(), path: null };
      set({ tabs: [...get().tabs, tab] });
      get().activateTab(tab.id);
    },

    closeAllTabs() {
      set({ tabs: [], activeTabId: null, mru: [] });
    },

    closeTab(id) {
      const { tabs, activeTabId, mru } = get();
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const nextTabs = tabs.filter((t) => t.id !== id);
      const nextMru = mru.filter((m) => m !== id);
      let nextActive = activeTabId;
      if (activeTabId === id) nextActive = nextMru.find((m) => nextTabs.some((t) => t.id === m)) ?? nextTabs[Math.min(idx, nextTabs.length - 1)]?.id ?? null;
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

    recordProgress(path, ratio) {
      const prev = get().progress[path];
      const r = Math.max(0, Math.min(1, ratio));
      // Store in 5% steps (and the very end) so scrolling doesn't re-render the library constantly.
      if (prev && r < prev.ratio + 0.05 && !(r >= 0.98 && prev.ratio < 0.98)) return;
      set({ progress: { ...get().progress, [path]: { ...prev, ratio: Math.max(r, prev?.ratio ?? 0) } } });
    },

    setDone(path, done) {
      const prev = get().progress[path] ?? { ratio: 0 };
      const next: Progress = done ? { ...prev, doneAt: Date.now() } : { ...prev, doneAt: undefined };
      set({ progress: { ...get().progress, [path]: next } });
    },

    resetProgress() {
      set({ progress: {} });
    },

    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setQuickOpen: (open) => set({ quickOpen: open }),
    setSettingsOpen: (open) => set({ settingsOpen: open }),
    setPickerOpen: (open) => set({ pickerOpen: open }),

    async runSync({ quiet = false } = {}) {
      const vault = get().vaults.find((v) => v.id === get().activeVaultId);
      if (!vault) return;
      if (get().sync.running) {
        queuedSync = { quiet: quiet && (queuedSync?.quiet ?? true) };
        return;
      }
      syncAbort = new AbortController();
      set({ sync: { running: true } });
      try {
        const result = await syncVault(vault, providerFor(vault), (progress) => set({ sync: { running: true, progress } }), syncAbort.signal);
        const updated = (await db.vaults.get(vault.id))!;
        const changed = result.downloaded + result.removed;
        set({ sync: { running: false, result }, vaults: get().vaults.map((v) => (v.id === vault.id ? updated : v)) });
        // Someone may have switched vaults while this one synced.
        if (get().activeVaultId === vault.id) {
          set({
            paths: await loadPaths(vault.id),
            // Reload open tabs so they show the fresh content.
            tabs: changed ? get().tabs.map((t) => ({ ...t, nonce: Date.now() })) : get().tabs,
          });
          if (changed || !get().docs) void buildDocs(vault.id);
        }
        if (quiet && !changed && !result.failed.length) return;
        get().showToast(
          result.failed.length
            ? `Synced with ${result.failed.length} error(s). ${result.failed[0].path}: ${result.failed[0].error}`
            : !changed
              ? 'Everything is up to date'
              : !vault.lastSyncedAt
                ? `Downloaded ${result.downloaded} ${result.downloaded === 1 ? 'file' : 'files'}. Ready to read offline.`
                : `Updated: ${[
                    result.downloaded && `${result.downloaded} new or changed ${result.downloaded === 1 ? 'file' : 'files'}`,
                    result.removed && `${result.removed} removed`,
                  ]
                    .filter(Boolean)
                    .join(', ')}`,
        );
      } catch (e) {
        const aborted = syncAbort?.signal.aborted;
        set({ sync: { running: false, error: aborted || quiet ? undefined : (e as Error).message } });
        if (!quiet || aborted) get().showToast(aborted ? 'Sync cancelled' : `Sync failed: ${(e as Error).message}`);
        // Whatever finished downloading is kept, so refresh the tree.
        if (get().activeVaultId === vault.id) set({ paths: await loadPaths(vault.id) });
      } finally {
        syncAbort = null;
        if (queuedSync) {
          const next = queuedSync;
          queuedSync = null;
          void get().runSync(next);
        }
      }
    },

    cancelSync() {
      syncAbort?.abort();
    },

    showToast(message) {
      clearTimeout(toastTimer);
      set({ toast: { message, id: Date.now() } });
      toastTimer = setTimeout(() => set({ toast: undefined }), 4200);
    },
  };
});

// Persist tabs, recent files and progress per vault.
useStore.subscribe((s, prev) => {
  if (!s.activeVaultId || s.activeVaultId !== prev.activeVaultId) return;
  if (s.tabs !== prev.tabs || s.activeTabId !== prev.activeTabId) {
    const tabs = s.tabs.map(({ id, path, scrollY }) => ({ id, path, scrollY }));
    localStorage.setItem(tabsKey(s.activeVaultId), JSON.stringify({ tabs, activeTabId: s.activeTabId }));
  }
  if (s.recent !== prev.recent) localStorage.setItem(recentKey(s.activeVaultId), JSON.stringify(s.recent));
  if (s.progress !== prev.progress) localStorage.setItem(progressKey(s.activeVaultId), JSON.stringify(s.progress));
});

// Home-screen apps on the iPad are usually resumed rather than relaunched, so also look for
// library updates when Cortado comes back to the foreground (at most every few minutes).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const s = useStore.getState();
    const vault = s.vaults.find((v) => v.id === s.activeVaultId);
    if (document.visibilityState !== 'visible' || vault?.provider !== 'site' || !navigator.onLine || s.sync.running) return;
    if (Date.now() - (vault.lastSyncedAt ?? 0) > 5 * 60_000) void s.runSync({ quiet: true });
  });
}

/** A lesson's display title: its own heading or <title>, else the file name without its number. */
export function useTitle(path: string): string {
  const title = useStore((s) => s.titles[path]);
  return title ?? lessonTitle(stem(path)).title;
}

/** The same, outside React. */
export function titleOf(path: string): string {
  return useStore.getState().titles[path] ?? lessonTitle(stem(path)).title;
}

/** Status of a lesson for badges and lists. */
export function lessonState(p: Progress | undefined): 'done' | 'started' | 'new' {
  if (p?.doneAt) return 'done';
  if (p && (p.ratio > 0.05 || p.openedAt)) return 'started';
  return 'new';
}
