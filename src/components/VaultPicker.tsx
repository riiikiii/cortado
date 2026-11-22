import { useEffect, useState } from 'react';
import { getToken, googleConfigured, signIn, signOut } from '../auth/google';
import { driveProvider, type DriveItem } from '../providers/gdrive';
import { AuthRequiredError } from '../auth/google';
import { useStore } from '../state/store';
import { Icon } from './Icon';

const devAvailable = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname);

let browseOnOpen = false;
/** Open the picker straight into the Drive folder browser (used after the sign-in redirect). */
export function openDriveBrowser() {
  browseOnOpen = true;
  useStore.getState().setVaultPickerOpen(true);
}

export function VaultPicker() {
  const open = useStore((s) => s.vaultPickerOpen);
  const vaults = useStore((s) => s.vaults);
  const activeVaultId = useStore((s) => s.activeVaultId);
  const { setVaultPickerOpen, setActiveVault, removeVault } = useStore.getState();
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    setBrowsing(open && browseOnOpen);
    browseOnOpen = false;
  }, [open]);

  if (!open) return null;
  const close = () => setVaultPickerOpen(false);

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Vaults">
        {browsing ? (
          <DriveFolderBrowser onDone={close} onBack={() => setBrowsing(false)} />
        ) : (
          <>
            <header className="sheet-head">
              <h2>Vaults</h2>
              <button className="icon-btn" onClick={close} aria-label="Close">
                <Icon name="close" />
              </button>
            </header>
            <ul className="vault-list">
              {vaults.map((v) => (
                <li key={v.id} className={v.id === activeVaultId ? 'active' : ''}>
                  <button
                    className="vault-row"
                    onClick={() => {
                      setActiveVault(v.id);
                      close();
                    }}
                  >
                    <Icon name={v.provider === 'gdrive' ? 'google' : 'vault'} />
                    <span className="vault-name">{v.name}</span>
                    <span className="muted small">
                      {v.lastSyncedAt ? `Synced ${new Date(v.lastSyncedAt).toLocaleString()}` : 'Never synced'}
                    </span>
                    {v.id === activeVaultId && <Icon name="check" className="accent" />}
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label={`Remove ${v.name}`}
                    onClick={() => {
                      if (confirm(`Remove “${v.name}” and its downloaded files from this device? Files in Google Drive are not touched.`))
                        removeVault(v.id);
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              ))}
              {!vaults.length && <li className="muted pad">No vaults yet.</li>}
            </ul>
            <div className="sheet-actions">
              <AddDriveButton onBrowse={() => setBrowsing(true)} />
              {devAvailable && <AddDevVaultButton onDone={close} />}
            </div>
            {getToken() && (
              <button className="link-btn" onClick={() => (signOut(), useStore.getState().showToast('Signed out of Google'))}>
                Sign out of Google
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AddDriveButton({ onBrowse }: { onBrowse: () => void }) {
  if (!googleConfigured()) {
    return <p className="muted small">Google Drive isn’t configured. Set VITE_GOOGLE_CLIENT_ID (see SETUP.md).</p>;
  }
  return (
    <button
      className="btn primary"
      onClick={() => (getToken() ? onBrowse() : signIn({ action: 'pick-folder' }))}
    >
      <Icon name="plus" /> Add a Google Drive folder
    </button>
  );
}

export function AddDevVaultButton({ onDone }: { onDone?: () => void }) {
  return (
    <button
      className="btn"
      onClick={async () => {
        await useStore.getState().addVault({ name: 'Sample vault', provider: 'dev', rootFolderId: 'dev' });
        onDone?.();
        useStore.getState().runSync();
      }}
    >
      <Icon name="vault" /> Add sample vault (dev)
    </button>
  );
}

function DriveFolderBrowser({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [trail, setTrail] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [folders, setFolders] = useState<DriveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const here = trail[trail.length - 1];

  useEffect(() => {
    const ctrl = new AbortController();
    setFolders(null);
    setError(null);
    driveProvider.listFolders(here.id, ctrl.signal).then(setFolders, (e) => {
      if (e instanceof AuthRequiredError) signIn({ action: 'pick-folder' });
      else if (!ctrl.signal.aborted) setError((e as Error).message);
    });
    return () => ctrl.abort();
  }, [here.id]);

  const useThis = async () => {
    await useStore.getState().addVault({ name: here.name, provider: 'gdrive', rootFolderId: here.id });
    onDone();
    useStore.getState().runSync();
  };

  return (
    <>
      <header className="sheet-head">
        <button className="icon-btn" onClick={() => (trail.length > 1 ? setTrail(trail.slice(0, -1)) : onBack())} aria-label="Back">
          <Icon name="back" />
        </button>
        <h2 className="crumbs">{here.name}</h2>
      </header>
      <ul className="folder-list">
        {folders === null && !error && <li className="muted pad">Loading…</li>}
        {error && <li className="error pad">{error}</li>}
        {folders?.map((f) => (
          <li key={f.id}>
            <button className="vault-row" onClick={() => setTrail([...trail, { id: f.shortcutDetails?.targetId ?? f.id, name: f.name }])}>
              <Icon name="folder" />
              <span className="vault-name">{f.name}</span>
              <Icon name="chevron" size={16} className="muted" />
            </button>
          </li>
        ))}
        {folders?.length === 0 && <li className="muted pad">No folders in here.</li>}
      </ul>
      <div className="sheet-actions">
        <button className="btn primary" disabled={here.id === 'root'} onClick={useThis}>
          Use “{here.name}” as a vault
        </button>
      </div>
    </>
  );
}
