import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore, useTitle, type Tab } from '../state/store';
import { kindOf } from '../util/paths';
import { fileIcon, Icon } from './Icon';

/** Width of the fade at each end of the strip (see .tabstrip in styles.css). */
const FADE = 40;

/**
 * Open tabs. Tabs share the space and shrink down to a minimum width; past that the strip scrolls,
 * with fades at the edges, and a count button lists every tab. "+" opens an empty tab.
 */
export function TabBar() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const hasVault = useStore((s) => !!s.activeVaultId);
  const scroller = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ tab: Tab; x: number; y: number } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Which ends of the strip have tabs scrolled out of view.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  // Keep the active tab in view, clear of the edge fades. Layout positions are used rather than
  // scrollIntoView, which measures a new tab mid-animation and stops short.
  const reveal = useCallback((smooth: boolean) => {
    const el = scroller.current;
    const tab = el?.querySelector<HTMLElement>('.tab.active');
    if (!el || !tab) return;
    const behavior = smooth ? 'smooth' : 'auto';
    const left = tab.offsetLeft - FADE;
    const right = tab.offsetLeft + tab.offsetWidth + FADE;
    if (left < el.scrollLeft) el.scrollTo({ left, behavior });
    else if (right > el.scrollLeft + el.clientWidth) el.scrollTo({ left: right - el.clientWidth, behavior });
  }, []);
  useEffect(() => reveal(true), [activeTabId, tabs.length, reveal]);

  // The strip narrows when a document's buttons appear beside it; keep the active tab showing.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      reveal(false);
      measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, reveal]);
  useLayoutEffect(measure, [tabs, measure]);

  const overflowing = edges.left || edges.right;

  return (
    <>
      <div className={`tabstrip ${edges.left ? 'fade-left' : ''} ${edges.right ? 'fade-right' : ''}`}>
        <div
          className="tabbar"
          ref={scroller}
          role="tablist"
          onScroll={measure}
          onWheel={(e) => {
            // A mouse wheel or vertical swipe scrolls the strip sideways.
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
          }}
        >
          {tabs.map((t) => (
            <TabButton key={t.id} tab={t} active={t.id === activeTabId} onMenu={(x, y) => setMenu({ tab: t, x, y })} />
          ))}
        </div>
      </div>
      <button className="icon-btn new-tab-btn" aria-label="New tab" title="New tab (⌘T)" disabled={!hasVault} onClick={() => useStore.getState().newTab()}>
        <Icon name="plus" />
      </button>
      {overflowing && (
        <div className="tab-count-wrap">
          <button className={`tab-count ${listOpen ? 'on' : ''}`} aria-label={`All ${tabs.length} tabs`} title="All tabs" onClick={() => setListOpen(!listOpen)}>
            {tabs.length}
          </button>
          {listOpen && <TabList onClose={() => setListOpen(false)} />}
        </div>
      )}
      {menu && <TabMenu {...menu} onClose={() => setMenu(null)} />}
    </>
  );
}

function TabButton({ tab, active, onMenu }: { tab: Tab; active: boolean; onMenu: (x: number, y: number) => void }) {
  const { activateTab, closeTab } = useStore.getState();
  const done = useStore((s) => (tab.path ? !!s.progress[tab.path]?.doneAt : false));
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);
  const title = useTabTitle(tab);

  return (
    <div
      className={`tab ${active ? 'active' : ''} ${tab.path ? '' : 'is-new'}`}
      role="tab"
      aria-selected={active}
      title={tab.path ?? 'New tab'}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        activateTab(tab.id);
      }}
      onAuxClick={(e) => e.button === 1 && closeTab(tab.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        press.current = setTimeout(() => {
          longPressed.current = true;
          onMenu(touch.clientX, touch.clientY);
        }, 500);
      }}
      onTouchEnd={() => clearTimeout(press.current)}
      onTouchMove={() => clearTimeout(press.current)}
    >
      <TabIcon tab={tab} done={done} />
      <span className="tab-title">{title}</span>
      <button
        className="tab-close"
        aria-label={`Close ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
      >
        <Icon name="close" size={13} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function useTabTitle(tab: Tab): string {
  const title = useTitle(tab.path ?? '');
  return tab.path ? title : 'New tab';
}

function TabIcon({ tab, done }: { tab: Tab; done: boolean }) {
  if (!tab.path) return <Icon name="sparkle" size={16} className="ico" />;
  const kind = kindOf(tab.path);
  return <Icon name={done ? 'check-circle' : fileIcon(kind)} size={16} className={`ico ${done ? 'done' : `kind-${kind}`}`} />;
}

/** Every open tab, for when there are more than fit in the bar. */
function TabList({ onClose }: { onClose: () => void }) {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const { activateTab, closeTab, closeAllTabs } = useStore.getState();
  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="popover tab-list" role="dialog" aria-label="Open tabs">
        <div className="popover-title">{tabs.length} open tabs</div>
        <ul>
          {tabs.map((t) => (
            <TabListRow
              key={t.id}
              tab={t}
              active={t.id === activeTabId}
              onPick={() => {
                activateTab(t.id);
                onClose();
              }}
              onClose={() => closeTab(t.id)}
            />
          ))}
        </ul>
        <button
          className="menu-item danger-text"
          onClick={() => {
            closeAllTabs();
            onClose();
          }}
        >
          Close all tabs
        </button>
      </div>
    </>
  );
}

function TabListRow({ tab, active, onPick, onClose }: { tab: Tab; active: boolean; onPick: () => void; onClose: () => void }) {
  const done = useStore((s) => (tab.path ? !!s.progress[tab.path]?.doneAt : false));
  const title = useTabTitle(tab);
  return (
    <li className={`tab-list-row ${active ? 'active' : ''}`}>
      <button className="tab-list-pick" onClick={onPick}>
        <TabIcon tab={tab} done={done} />
        <span className="ellipsis">{title}</span>
      </button>
      <button className="icon-btn small" aria-label={`Close ${title}`} onClick={onClose}>
        <Icon name="close" size={14} />
      </button>
    </li>
  );
}

function TabMenu({ tab, x, y, onClose }: { tab: Tab; x: number; y: number; onClose: () => void }) {
  const s = useStore.getState();
  const item = (label: string, fn: () => void) => (
    <button
      className="menu-item"
      onClick={() => {
        fn();
        onClose();
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="menu-backdrop" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())}>
      <div
        className="menu"
        style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y + 8, window.innerHeight - 240) }}
        onClick={(e) => e.stopPropagation()}
      >
        {tab.path && item('Reload', () => s.updateTab(tab.id, { nonce: Date.now() }))}
        {tab.path && item('Duplicate tab', () => s.openFile(tab.path!, { newTab: true }))}
        {item('New tab', () => s.newTab())}
        {item('Close tab', () => s.closeTab(tab.id))}
        {item('Close other tabs', () => s.closeOtherTabs(tab.id))}
      </div>
    </div>
  );
}
