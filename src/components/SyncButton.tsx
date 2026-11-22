import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Icon } from './Icon';

function useOnline() {
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
      className={`btn sync-btn ${sync.running ? 'running' : ''}`}
      disabled={!hasVault || (!online && !sync.running)}
      onClick={() => (sync.running ? cancelSync() : runSync())}
      title={!online ? 'Offline' : sync.running ? 'Cancel sync' : 'Download the latest vault files'}
    >
      <Icon name="sync" size={18} className={sync.running ? 'spin' : ''} />
      {sync.running ? 'Cancel' : online ? 'Sync' : 'Offline'}
    </button>
  );
}

export function SyncStatus() {
  const sync = useStore((s) => s.sync);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const fileCount = useStore((s) => s.paths.length);
  if (sync.running && sync.progress) {
    const p = sync.progress;
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return (
      <div className="sync-status">
        <div className="progress">
          <div className={`bar ${p.phase === 'listing' ? 'indeterminate' : ''}`} style={{ width: p.phase === 'listing' ? undefined : `${pct}%` }} />
        </div>
        <div className="small muted">
          {p.phase === 'listing' ? 'Listing files…' : `${p.done} / ${p.total} files · ${formatBytes(p.bytes)}`}
        </div>
      </div>
    );
  }
  if (!vault) return null;
  return (
    <div className="sync-status small muted">
      {fileCount} files · {vault.lastSyncedAt ? `synced ${timeAgo(vault.lastSyncedAt)}` : 'not synced yet'}
      {sync.error && <div className="error">{sync.error}</div>}
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

function timeAgo(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}
