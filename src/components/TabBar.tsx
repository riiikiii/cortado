import { useEffect, useRef, useState } from 'react';
import { useStore, type Tab } from '../state/store';
import { kindOf, stem } from '../util/paths';
import { fileIcon, Icon } from './Icon';

export function TabBar() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const scroller = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ tab: Tab; x: number; y: number } | null>(null);

  // Keep the active tab in view.
  useEffect(() => {
    scroller.current?.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId, tabs.length]);

  return (
    <>
      <div className="tabbar" ref={scroller} role="tablist">
        {tabs.map((t) => (
          <TabButton key={t.id} tab={t} active={t.id === activeTabId} onMenu={(x, y) => setMenu({ tab: t, x, y })} />
        ))}
      </div>
      {menu && <TabMenu {...menu} onClose={() => setMenu(null)} />}
    </>
  );
}

function TabButton({ tab, active, onMenu }: { tab: Tab; active: boolean; onMenu: (x: number, y: number) => void }) {
  const { activateTab, closeTab } = useStore.getState();
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);
  const kind = kindOf(tab.path);

  return (
    <div
      className={`tab ${active ? 'active' : ''}`}
      role="tab"
      aria-selected={active}
      title={tab.path}
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
      <Icon name={fileIcon(tab.path, kind)} size={16} className={`ico kind-${kind}`} />
      <span className="tab-title">{stem(tab.path)}</span>
      <button
        className="tab-close"
        aria-label={`Close ${stem(tab.path)}`}
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
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
        style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y + 8, window.innerHeight - 200) }}
        onClick={(e) => e.stopPropagation()}
      >
        {item('Reload', () => s.updateTab(tab.id, { nonce: Date.now() }))}
        {item('Duplicate tab', () => s.openFile(tab.path, { newTab: true }))}
        {item('Close tab', () => s.closeTab(tab.id))}
        {item('Close other tabs', () => s.closeOtherTabs(tab.id))}
      </div>
    </div>
  );
}
