import { useEffect, useMemo, useState } from 'react';
import { AuthRequiredError, signIn, type GoogleAccount } from '../auth/google';
import { driveFor, type DriveItem } from '../providers/gdrive';
import { useStore } from '../state/store';
import { AccountList, ClientSetup, GoogleButton } from './GoogleConnect';
import { Avatar, Icon } from './Icon';
import { Sheet } from './Sheet';
import { timeAgo } from './SyncButton';

const devAvailable = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname);

export function VaultPicker() {
  const picker = useStore((s) => s.picker);
  const { openPicker } = useStore.getState();
  if (!picker) return null;
  const close = () => openPicker(null);

  return (
    <Sheet onClose={close} label="Vaults">
      <div className="sheet-view" key={picker.view}>
        {picker.view === 'browse' ? (
          <DriveFolderBrowser accountId={picker.accountId} onDone={close} onBack={() => openPicker({ view: 'list' })} />
        ) : picker.view === 'setup' ? (
          <ClientSetup
            onBack={() => openPicker({ view: 'list' })}
            onDone={() => {
              if (picker.then === 'connect') useStore.getState().connectGoogle();
              else openPicker({ view: 'list' });
            }}
          />
        ) : (
          <VaultList onClose={close} />
        )}
      </div>
    </Sheet>
  );
}

function VaultList({ onClose }: { onClose: () => void }) {
  const vaults = useStore((s) => s.vaults);
  const accounts = useStore((s) => s.accounts);
  const activeVaultId = useStore((s) => s.activeVaultId);
  const { setActiveVault, removeVault, openPicker } = useStore.getState();
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return (
    <>
      <header className="sheet-head">
        <h2>Vaults</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <div className="sheet-scroll">
        {vaults.length > 0 && (
          <ul className="vault-list">
            {vaults.map((v) => {
              const account = v.accountId ? byId.get(v.accountId) : undefined;
              return (
                <li key={v.id} className={v.id === activeVaultId ? 'active' : ''}>
                  <button
                    className="vault-row"
                    onClick={() => {
                      void setActiveVault(v.id);
                      onClose();
                    }}
                  >
                    {account ? <Avatar name={account.name} photo={account.photo} size={34} /> : <span className="vault-icon"><Icon name={v.provider === 'gdrive' ? 'drive' : 'vault'} size={18} /></span>}
                    <span className="vault-text">
                      <span className="vault-name">{v.name}</span>
                      <span className="vault-meta">
                        {v.provider === 'dev' ? 'Local sample' : (v.accountId ?? 'Google Drive')}
                        {' · '}
                        {v.lastSyncedAt ? `synced ${timeAgo(v.lastSyncedAt)}` : 'never synced'}
                      </span>
                    </span>
                    {v.id === activeVaultId && <Icon name="check" className="accent" />}
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label={`Remove ${v.name}`}
                    onClick={() => {
                      if (confirm(`Remove “${v.name}” and its downloaded files from this device? Nothing in Google Drive is touched.`)) void removeVault(v.id);
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="sheet-section">
          <h3 className="section-title">Add a Google Drive folder</h3>
          {accounts.length > 0 && <AccountList onBrowse={(a: GoogleAccount) => openPicker({ view: 'browse', accountId: a.id })} />}
          <div className="stack">
            <GoogleButton label={accounts.length ? 'Connect another Google account' : 'Continue with Google'} chooseAccount={accounts.length > 0} />
            {devAvailable && (
              <button
                className="btn ghost"
                onClick={async () => {
                  await useStore.getState().addVault({ name: 'Sample vault', provider: 'dev', rootFolderId: 'dev' });
                  onClose();
                  useStore.getState().runSync();
                }}
              >
                <Icon name="sparkle" size={18} /> Add the sample vault (dev)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type Source = 'mine' | 'shared' | 'drives';
const ROOTS: Record<Source, { id: string; name: string }> = {
  mine: { id: 'root', name: 'My Drive' },
  shared: { id: '__shared__', name: 'Shared with me' },
  drives: { id: '__drives__', name: 'Shared drives' },
};

function DriveFolderBrowser({ accountId, onDone, onBack }: { accountId: string; onDone: () => void; onBack: () => void }) {
  const accounts = useStore((s) => s.accounts);
  const account = accounts.find((a) => a.id === accountId);
  const drive = useMemo(() => driveFor(accountId), [accountId]);
  const [source, setSource] = useState<Source>('mine');
  const [trail, setTrail] = useState([ROOTS.mine]);
  const [folders, setFolders] = useState<DriveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const here = trail[trail.length - 1];
  const atRoot = trail.length === 1;

  useEffect(() => {
    const ctrl = new AbortController();
    setFolders(null);
    setError(null);
    const load =
      here.id === '__shared__' ? drive.listSharedFolders(ctrl.signal) : here.id === '__drives__' ? drive.listDrives(ctrl.signal) : drive.listFolders(here.id, ctrl.signal);
    load.then(setFolders, (e) => {
      if (e instanceof AuthRequiredError) signIn({ resume: { action: 'pick-folder' }, loginHint: account?.email });
      else if (!ctrl.signal.aborted) setError((e as Error).message);
    });
    return () => ctrl.abort();
  }, [here.id, drive, account?.email]);

  const switchSource = (s: Source) => {
    setSource(s);
    setTrail([ROOTS[s]]);
  };

  const useThis = async () => {
    await useStore.getState().addVault({ name: here.name, provider: 'gdrive', rootFolderId: here.id, accountId });
    onDone();
    useStore.getState().runSync();
  };

  return (
    <>
      <header className="sheet-head">
        <button className="icon-btn" onClick={() => (atRoot ? onBack() : setTrail(trail.slice(0, -1)))} aria-label="Back">
          <Icon name="back" />
        </button>
        <h2>{atRoot ? 'Choose a folder' : here.name}</h2>
        {account && (
          <span className="account-chip" title={account.email}>
            <Avatar name={account.name} photo={account.photo} size={22} />
            <span className="ellipsis">{account.email}</span>
          </span>
        )}
      </header>
      <div className="source-tabs" role="tablist">
        {(Object.keys(ROOTS) as Source[]).map((s) => (
          <button key={s} role="tab" aria-selected={source === s} className={source === s ? 'on' : ''} onClick={() => switchSource(s)}>
            <Icon name={s === 'mine' ? 'drive' : s === 'shared' ? 'users' : 'layers'} size={16} />
            {ROOTS[s].name}
          </button>
        ))}
      </div>
      {!atRoot && (
        <nav className="folder-trail" aria-label="Folder path">
          {trail.map((t, i) => (
            <span key={t.id + i}>
              {i > 0 && <Icon name="chevron" size={12} className="muted" />}
              <button disabled={i === trail.length - 1} onClick={() => setTrail(trail.slice(0, i + 1))}>
                {t.name}
              </button>
            </span>
          ))}
        </nav>
      )}
      <ul className="folder-list sheet-scroll">
        {folders === null && !error && (
          <>
            <li className="skeleton" />
            <li className="skeleton" />
            <li className="skeleton" />
          </>
        )}
        {error && <li className="error pad">{error}</li>}
        {folders?.map((f) => (
          <li key={f.id}>
            <button className="vault-row" onClick={() => setTrail([...trail, { id: f.shortcutDetails?.targetId ?? f.id, name: f.name }])}>
              <span className="folder-icon">
                <Icon name={here.id === '__drives__' ? 'layers' : 'folder'} size={20} />
              </span>
              <span className="vault-text">
                <span className="vault-name">{f.name}</span>
                {here.id === '__shared__' && f.owners?.[0]?.displayName && <span className="vault-meta">Shared by {f.owners[0].displayName}</span>}
              </span>
              <Icon name="chevron" size={16} className="muted" />
            </button>
          </li>
        ))}
        {folders?.length === 0 && (
          <li className="muted pad center">
            {here.id === '__shared__' ? 'Nothing has been shared with this account yet.' : here.id === '__drives__' ? 'This account isn’t in any shared drives.' : 'No folders in here.'}
          </li>
        )}
      </ul>
      <div className="sheet-actions">
        <button className="btn primary" disabled={atRoot} onClick={useThis}>
          {atRoot ? 'Open a folder to choose it' : `Use “${here.name}” as a vault`}
        </button>
      </div>
    </>
  );
}
