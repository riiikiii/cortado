import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Appearance } from './Appearance';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { formatBytes } from './SyncButton';

const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Search titles and text'],
  ['⌘\\', 'Show or hide the sidebar'],
  ['⌘T', 'New tab'],
  ['⌘W', 'Close tab'],
  ['⌃Tab', 'Next tab'],
  ['⌥→ / ⌥←', 'Next or previous lesson'],
];

export function SettingsSheet() {
  const open = useStore((s) => s.settingsOpen);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const { setSettingsOpen, resetProgress } = useStore.getState();
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    navigator.storage
      ?.estimate?.()
      .then((e) => setUsage(e.usage !== undefined ? formatBytes(e.usage) : null))
      .catch(() => {});
  }, [open]);

  if (!open) return null;
  const close = () => setSettingsOpen(false);

  return (
    <Sheet onClose={close} label="Settings" className="settings">
      <header className="sheet-head">
        <h2>Settings</h2>
        <button className="icon-btn" onClick={close} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <div className="sheet-scroll">
        <section className="sheet-section">
          <h3 className="section-title">Reading</h3>
          <Appearance />
        </section>

        {vault && (
          <section className="sheet-section">
            <h3 className="section-title">This vault</h3>
            <div className="setting-row">
              <span className="setting-text">
                <span>Reading progress</span>
                <span className="small muted">Completed lessons and how far you’ve read in each.</span>
              </span>
              <button
                className="btn small ghost danger-text"
                onClick={() => {
                  if (confirm(`Clear all reading progress for “${vault.name}”?`)) resetProgress();
                }}
              >
                Reset
              </button>
            </div>
            {usage && (
              <div className="setting-row">
                <span className="setting-text">
                  <span>Storage on this device</span>
                  <span className="small muted">All vaults, available offline.</span>
                </span>
                <span className="muted">{usage}</span>
              </div>
            )}
          </section>
        )}

        <section className="sheet-section">
          <h3 className="section-title">Keyboard</h3>
          <dl className="shortcuts">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k}>
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </Sheet>
  );
}
