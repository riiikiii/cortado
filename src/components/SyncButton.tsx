import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Icon } from './Icon';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function SyncButton() {
  const sync = useStore((s) => s.sync);
  const hasVault = useStore((s) => !!s.activeVaultId);
  const online = useOnline();
  const { runSync, cancelSync } = useStore.getState();

  return (
    <button
      className={`icon-btn sync-btn ${sync.running ? 'running' : ''}`}
      disabled={!hasVault || (!online && !sync.running)}
      onClick={() => (sync.running ? cancelSync() : runSync())}
      aria-label={!online ? 'Offline' : sync.running ? 'Cancel sync' : 'Sync with Google Drive'}
      title={!online ? 'Offline: your downloaded lessons still work' : sync.running ? 'Cancel sync' : 'Download the latest files'}
    >
      <Icon name={online ? 'sync' : 'wifi'} size={19} className={sync.running ? 'spin' : ''} />
    </button>
  );
}

export function SyncStatus() {
  const sync = useStore((s) => s.sync);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const online = useOnline();
  if (sync.running && sync.progress) {
    const p = sync.progress;
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return (
      <div className="sync-status">
        <div className="progress">
          <div className={`bar ${p.phase === 'listing' ? 'indeterminate' : ''}`} style={{ width: p.phase === 'listing' ? undefined : `${pct}%` }} />
        </div>
        <div className="small muted">
          {p.phase === 'listing' ? 'Looking for changes…' : `${p.done} of ${p.total} files · ${formatBytes(p.bytes)}`}
        </div>
      </div>
    );
  }
  if (!vault) return null;
  return (
    <div className="sync-status small muted">
      <span className={`net-dot ${online ? 'on' : ''}`} />
      {online ? '' : 'Offline · '}
      {vault.lastSyncedAt ? `Synced ${timeAgo(vault.lastSyncedAt)}` : 'Not synced yet'}
      {sync.error && <div className="error">{sync.error}</div>}
    </div>
  );
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function timeAgo(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)} d ago`;
  return new Date(t).toLocaleDateString();
}
