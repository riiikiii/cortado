import { useEffect, useMemo, useRef, useState } from 'react';
import { neighbours, readingOrder } from '../library/tree';
import { useStore } from '../state/store';
import { Reader } from '../viewer/Reader';
import { FileTree } from './FileTree';
import { Home } from './Home';
import { Avatar, Icon } from './Icon';
import { QuickSwitcher } from './QuickSwitcher';
import { SettingsSheet } from './SettingsSheet';
import { SyncButton, SyncStatus } from './SyncButton';
import { CupTile } from './Logo';
import { TabBar } from './TabBar';
import { ToolbarSlot } from './toolbarSlot';
import { VaultPicker } from './VaultPicker';

const WIDE = 900; // iPad mini landscape is 1133pt wide, portrait 744pt
const KEEP_ALIVE = 4; // iframes kept loaded, to stay within the iPad mini's memory
const WIDTH_KEY = 'cortado.sidebarWidth';

function useWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= WIDE);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= WIDE);
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  return wide;
}

const typing = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

export function AppShell() {
  const wide = useWide();
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const mru = useStore((s) => s.mru);
  const toast = useStore((s) => s.toast);
  const { setSidebarOpen, setQuickOpen } = useStore.getState();
  const [width, setWidth] = useState(() => Number(localStorage.getItem(WIDTH_KEY)) || 300);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  // Rotating to portrait hides the slide-over; rotating to landscape docks it again.
  const firstWide = useRef(true);
  useEffect(() => {
    if (firstWide.current) {
      firstWide.current = false;
      return;
    }
    setSidebarOpen(wide);
  }, [wide, setSidebarOpen]);

  // Keyboard shortcuts for an iPad with a keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const s = useStore.getState();
      if (mod && e.key.toLowerCase() === 'k') (e.preventDefault(), s.setQuickOpen(true));
      else if (mod && e.key === '\\') (e.preventDefault(), s.setSidebarOpen(!s.sidebarOpen));
      else if (mod && e.key.toLowerCase() === 'w' && s.activeTabId) (e.preventDefault(), s.closeTab(s.activeTabId));
      else if (e.ctrlKey && e.key === 'Tab' && s.tabs.length > 1) {
        e.preventDefault();
        const i = s.tabs.findIndex((t) => t.id === s.activeTabId);
        const n = (i + (e.shiftKey ? -1 : 1) + s.tabs.length) % s.tabs.length;
        s.activateTab(s.tabs[n].id);
      } else if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !typing(e)) {
        const path = s.tabs.find((t) => t.id === s.activeTabId)?.path;
        if (!path) return;
        const { prev, next } = neighbours(readingOrder(s.paths), path);
        const target = e.key === 'ArrowRight' ? next : prev;
        if (target) (e.preventDefault(), s.openFile(target));
      } else if (e.key === 'Escape' && s.sidebarOpen && window.innerWidth < WIDE && !s.quickOpen && !s.picker && !s.settingsOpen) {
        s.setSidebarOpen(false);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  // Swipe in from the left edge to open the sidebar in portrait.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const edgeHandlers = {
    onTouchStart: (e: React.TouchEvent) => (swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }),
    onTouchMove: (e: React.TouchEvent) => {
      const s = swipe.current;
      if (!s) return;
      const dx = e.touches[0].clientX - s.x;
      if (dx > 50 && Math.abs(e.touches[0].clientY - s.y) < 40) {
        setSidebarOpen(true);
        swipe.current = null;
      }
    },
    onTouchEnd: () => (swipe.current = null),
  };

  // Swipe left on the open overlay sidebar to close it.
  const close = useRef<number | null>(null);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const clamp = (x: number) => Math.max(240, Math.min(480, startW + x - startX));
    document.documentElement.classList.add('resizing');
    const move = (ev: PointerEvent) => setWidth(clamp(ev.clientX));
    const up = (ev: PointerEvent) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      document.documentElement.classList.remove('resizing');
      localStorage.setItem(WIDTH_KEY, String(clamp(ev.clientX)));
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  const live = new Set(mru.slice(0, KEEP_ALIVE));
  if (activeTabId) live.add(activeTabId);
  const overlay = !wide;
  const sbWidth = overlay ? Math.min(340, window.innerWidth - 56) : width;

  return (
    <div className={`app ${overlay ? 'narrow' : 'wide'} ${sidebarOpen ? 'sb-open' : 'sb-closed'}`} style={{ '--sb-w': `${sbWidth}px` } as React.CSSProperties}>
      <div className="edge-strip" aria-hidden="true" />
      {overlay && <div className={`scrim ${sidebarOpen ? 'on' : ''}`} onClick={() => setSidebarOpen(false)} />}
      <aside
        className="sidebar"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        onTouchStart={(e) => (close.current = e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (overlay && close.current !== null && close.current - e.touches[0].clientX > 70) {
            setSidebarOpen(false);
            close.current = null;
          }
        }}
      >
        <Sidebar />
        {!overlay && <div className="resizer" onPointerDown={startResize} />}
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar" title="Sidebar (⌘\)">
            <Icon name="sidebar" />
          </button>
          <TabBar />
          <div className="topbar-actions" ref={setSlot} />
          <button className="icon-btn" onClick={() => setQuickOpen(true)} aria-label="Search" title="Search (⌘K)">
            <Icon name="search" />
          </button>
        </header>
        <ToolbarSlot.Provider value={slot}>
          <div className="viewer-stack">
            {vault &&
              tabs
                .filter((t) => live.has(t.id))
                .map((t) => (
                  <div key={t.id} className={`viewer ${t.id === activeTabId ? 'active' : ''}`}>
                    <Reader tab={t} vaultId={vault.id} active={t.id === activeTabId} />
                  </div>
                ))}
            {!activeTabId && (
              <div className="viewer active home-view">
                <Home />
              </div>
            )}
            {overlay && !sidebarOpen && <div className="edge-swipe" {...edgeHandlers} />}
          </div>
        </ToolbarSlot.Provider>
      </main>

      <QuickSwitcher />
      <VaultPicker />
      <SettingsSheet />
      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const account = useStore((s) => s.accounts.find((a) => a.id === vault?.accountId));
  const atHome = useStore((s) => s.activeTabId === null);
  const paths = useStore((s) => s.paths);
  const progress = useStore((s) => s.progress);
  const { openPicker, goHome, setQuickOpen, setSettingsOpen } = useStore.getState();
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const order = useMemo(() => readingOrder(paths), [paths]);
  const done = order.filter((p) => progress[p]?.doneAt).length;

  return (
    <>
      <div className="sb-head">
        <button className="vault-switch" onClick={() => openPicker({ view: 'list' })} title="Switch or add a vault">
          {account ? (
            <Avatar name={account.name} photo={account.photo} size={30} />
          ) : (
            <CupTile size={34} />
          )}
          <span className="vault-text">
            <span className="vault-title">{vault?.name ?? 'Cortado'}</span>
            <span className="vault-sub">
              {vault
                ? (account?.email ?? (vault.provider === 'dev' ? 'Sample vault' : vault.provider === 'site' ? 'Published with this site' : 'Google Drive'))
                : 'No vault yet'}
            </span>
          </span>
          <Icon name="chevron" size={14} className="rot90 muted" />
        </button>
        <SyncButton />
      </div>

      <nav className="sb-nav">
        <button className={`nav-row ${atHome ? 'active' : ''}`} onClick={() => goHome()}>
          <Icon name="home" size={19} />
          <span>Library</span>
          {done > 0 && (
            <span className="nav-count" title={`${done} of ${order.length} lessons complete`}>
              {done}/{order.length}
            </span>
          )}
        </button>
        <button className="nav-row" onClick={() => setQuickOpen(true)}>
          <Icon name="search" size={19} />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
      </nav>

      {paths.length > 0 && (
        <div className="sb-filter">
          <Icon name="outline" size={15} className="muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files"
            aria-label="Filter files"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {filter && (
            <button className="icon-btn small" onClick={() => setFilter('')} aria-label="Clear filter">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      )}
      <div className="sb-tree">
        {vault ? (
          <FileTree filter={filter} showAll={showAll} />
        ) : (
          <div className="tree-empty">Your vault’s folders and files will appear here once you connect one.</div>
        )}
      </div>
      <div className="sb-foot">
        <SyncStatus />
        <div className="sb-foot-row">
          <label className="toggle small muted">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all files
          </label>
          <button className="icon-btn small" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
