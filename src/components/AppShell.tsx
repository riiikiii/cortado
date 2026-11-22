import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { dirName, kindOf, stem } from '../util/paths';
import { DocView } from '../viewer/DocView';
import { FileTree } from './FileTree';
import { fileIcon, Icon } from './Icon';
import { QuickSwitcher } from './QuickSwitcher';
import { SyncButton, SyncStatus } from './SyncButton';
import { TabBar } from './TabBar';
import { AddDevVaultButton, AddDriveButton, openDriveBrowser, VaultPicker } from './VaultPicker';

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

export function AppShell() {
  const wide = useWide();
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const mru = useStore((s) => s.mru);
  const toast = useStore((s) => s.toast);
  const { setSidebarOpen, setQuickOpen, setVaultPickerOpen } = useStore.getState();
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [width, setWidth] = useState(() => Number(localStorage.getItem(WIDTH_KEY)) || 300);

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
    const move = (ev: PointerEvent) => setWidth(Math.max(220, Math.min(520, startW + ev.clientX - startX)));
    const up = (ev: PointerEvent) => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      localStorage.setItem(WIDTH_KEY, String(Math.max(220, Math.min(520, startW + ev.clientX - startX))));
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  const live = new Set(mru.slice(0, KEEP_ALIVE));
  if (activeTabId) live.add(activeTabId);
  const showSidebar = sidebarOpen;
  const overlay = !wide;

  return (
    <div className={`app ${overlay ? 'narrow' : 'wide'} ${showSidebar ? 'sb-open' : 'sb-closed'}`}>
      {overlay && showSidebar && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
      <aside
        className="sidebar"
        style={{ width: overlay ? Math.min(340, window.innerWidth - 60) : width }}
        aria-hidden={!showSidebar}
        onTouchStart={(e) => (close.current = e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (overlay && close.current !== null && close.current - e.touches[0].clientX > 70) {
            setSidebarOpen(false);
            close.current = null;
          }
        }}
      >
        <div className="sb-head">
          <button className="vault-switch" onClick={() => setVaultPickerOpen(true)}>
            <Icon name={vault?.provider === 'gdrive' ? 'google' : 'vault'} size={18} />
            <span className="vault-title">{vault?.name ?? 'No vault'}</span>
            <Icon name="chevron" size={14} className="rot90 muted" />
          </button>
          <SyncButton />
        </div>
        <div className="sb-filter">
          <Icon name="search" size={16} className="muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files"
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
        <div className="sb-tree">
          <FileTree filter={filter} showAll={showAll} />
        </div>
        <div className="sb-foot">
          <SyncStatus />
          <label className="toggle small muted">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show all files
          </label>
        </div>
        {!overlay && <div className="resizer" onPointerDown={startResize} />}
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            <Icon name="sidebar" />
          </button>
          <TabBar />
          <button className="icon-btn" onClick={() => setQuickOpen(true)} aria-label="Search files">
            <Icon name="search" />
          </button>
        </header>
        <div className="viewer-stack">
          {vault &&
            tabs
              .filter((t) => live.has(t.id))
              .map((t) => (
                <div key={t.id} className={`viewer ${t.id === activeTabId ? 'active' : ''}`}>
                  <DocView tab={t} vaultId={vault.id} />
                </div>
              ))}
          {!activeTabId && <EmptyState />}
          {overlay && !showSidebar && <div className="edge-swipe" {...edgeHandlers} />}
        </div>
      </main>

      <QuickSwitcher />
      <VaultPicker />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function EmptyState() {
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const recent = useStore((s) => s.recent);
  const paths = useStore((s) => s.paths);
  const { openFile, runSync } = useStore.getState();
  const devAvailable = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname);

  if (!vault) {
    return (
      <div className="welcome">
        <div className="logo-mark" />
        <h1>Cortado</h1>
        <p className="muted">Browse your HTML guides and Markdown notes, offline. Connect a Google Drive folder to start.</p>
        <div className="welcome-actions">
          <AddDriveButton onBrowse={openDriveBrowser} />
          {devAvailable && <AddDevVaultButton />}
        </div>
      </div>
    );
  }
  if (!paths.length) {
    return (
      <div className="welcome">
        <h2>{vault.name}</h2>
        <p className="muted">Nothing downloaded yet.</p>
        <button className="btn primary" onClick={() => runSync()}>
          <Icon name="sync" /> Sync vault
        </button>
      </div>
    );
  }
  const have = new Set(paths);
  const items = recent.filter((p) => have.has(p)).slice(0, 10);
  return (
    <div className="welcome">
      <h2>{vault.name}</h2>
      {items.length ? (
        <ul className="recent-list">
          {items.map((p) => (
            <li key={p}>
              <button className="switcher-item" onClick={() => openFile(p)}>
                <Icon name={fileIcon(p, kindOf(p))} size={18} className={`ico kind-${kindOf(p)}`} />
                <span className="name">{stem(p)}</span>
                <span className="dir">{dirName(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Pick a file from the sidebar, or press ⌘K to search.</p>
      )}
    </div>
  );
}
