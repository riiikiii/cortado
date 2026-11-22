import { useStore } from '../state/store';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { timeAgo } from './SyncButton';

export const devAvailable = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname);

/** Switch between the site's notes and (on localhost) the sample vault, or add the notes back. */
export function VaultPicker() {
  const open = useStore((s) => s.pickerOpen);
  const vaults = useStore((s) => s.vaults);
  const activeVaultId = useStore((s) => s.activeVaultId);
  const siteLibrary = useStore((s) => s.siteLibrary);
  const { setActiveVault, removeVault, setPickerOpen } = useStore.getState();
  if (!open) return null;
  const close = () => setPickerOpen(false);

  return (
    <Sheet onClose={close} label="Vaults">
      <header className="sheet-head">
        <h2>Vaults</h2>
        <button className="icon-btn" onClick={close} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <div className="sheet-scroll">
        {vaults.length > 0 && (
          <ul className="vault-list">
            {vaults.map((v) => (
              <li key={v.id} className={v.id === activeVaultId ? 'active' : ''}>
                <button
                  className="vault-row"
                  onClick={() => {
                    void setActiveVault(v.id);
                    close();
                  }}
                >
                  <span className={`vault-icon ${v.provider === 'site' ? 'site' : ''}`}>
                    <Icon name={v.provider === 'site' ? 'book' : 'vault'} size={18} />
                  </span>
                  <span className="vault-text">
                    <span className="vault-name">{v.name}</span>
                    <span className="vault-meta">
                      {v.provider === 'dev' ? 'Local sample' : 'Published with this site'}
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
                    if (confirm(`Remove “${v.name}” and its downloaded files from this device? You can add it back from this menu.`)) void removeVault(v.id);
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {siteLibrary && !vaults.some((v) => v.provider === 'site') && (
          <div className="sheet-section">
            <h3 className="section-title">On this site</h3>
            <button
              className="vault-row site-offer"
              onClick={async () => {
                await useStore.getState().addSiteLibrary();
                close();
              }}
            >
              <span className="vault-icon site">
                <Icon name="book" size={18} />
              </span>
              <span className="vault-text">
                <span className="vault-name">{siteLibrary.name}</span>
                <span className="vault-meta">
                  {siteLibrary.count} {siteLibrary.count === 1 ? 'file' : 'files'}
                </span>
              </span>
              <Icon name="plus" size={18} className="accent" />
            </button>
          </div>
        )}

        {devAvailable && !vaults.some((v) => v.provider === 'dev') && (
          <div className="sheet-section">
            <button
              className="btn ghost"
              onClick={async () => {
                await useStore.getState().addVault({ name: 'Sample vault', provider: 'dev', rootFolderId: 'dev' });
                close();
                useStore.getState().runSync();
              }}
            >
              <Icon name="sparkle" size={18} /> Add the sample vault (dev)
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
