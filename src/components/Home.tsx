import { useStore } from '../state/store';
import { Icon } from './Icon';
import { CupIllustration, CupLogo } from './Logo';
import { SyncStatus, useOnline } from './SyncButton';
import { devAvailable } from './VaultPicker';

export function Home() {
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
  const paths = useStore((s) => s.paths);
  if (!vault) return <Welcome />;
  if (!paths.length) return <EmptyVault name={vault.name} />;
  return (
    <div className="landing">
      <Splash />
    </div>
  );
}

/** The big smiling cup and the name. */
function Splash() {
  return (
    <div className="splash">
      <CupIllustration />
      <h1 className="splash-title">Cortado</h1>
    </div>
  );
}

/** What an empty tab shows until a file is chosen. */
export function NewTabPage() {
  const paths = useStore((s) => s.paths);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const { setSidebarOpen, setQuickOpen } = useStore.getState();
  if (!paths.length) return <Home />;
  return (
    <div className="landing">
      <div className="splash new-tab">
        <CupIllustration size={250} looking />
        <h1 className="splash-title">Select a file</h1>
        <p className="new-tab-hint">Choose a lesson from the sidebar, or search for one.</p>
        <div className="new-tab-actions">
          {!sidebarOpen && (
            <button className="btn" onClick={() => setSidebarOpen(true)}>
              <Icon name="sidebar" size={18} /> Browse files
            </button>
          )}
          <button className="btn" onClick={() => setQuickOpen(true)}>
            <Icon name="search" size={18} /> Search
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyVault({ name }: { name: string }) {
  const running = useStore((s) => s.sync.running);
  return (
    <div className="welcome">
      <div className="welcome-card">
        <CupLogo size={96} animated={running} />
        <h2>{name}</h2>
        {running ? (
          <>
            <p className="muted">Downloading your lessons so they work offline…</p>
            <div className="welcome-progress">
              <SyncStatus />
            </div>
          </>
        ) : (
          <>
            <p className="muted">Nothing is downloaded yet. Sync once and everything stays on this device.</p>
            <button className="btn primary big" onClick={() => useStore.getState().runSync()}>
              <Icon name="sync" size={18} /> Sync now
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** No vault yet: usually only for a moment on the very first launch, while the notes are found. */
function Welcome() {
  const siteLibrary = useStore((s) => s.siteLibrary);
  const online = useOnline();
  return (
    <div className="landing">
      <Splash />
      <div className="welcome-actions">
        {siteLibrary ? (
          <button className="btn primary big" onClick={() => useStore.getState().addSiteLibrary()}>
            <Icon name="book" size={18} /> Open {siteLibrary.name}
          </button>
        ) : (
          <p className="muted">{online ? 'Looking for your notes…' : 'Connect to the internet once to download your notes.'}</p>
        )}
        {devAvailable && (
          <button
            className="btn ghost"
            onClick={async () => {
              await useStore.getState().addVault({ name: 'Sample vault', provider: 'dev', rootFolderId: 'dev' });
              useStore.getState().runSync();
            }}
          >
            <Icon name="sparkle" size={18} /> Try the sample vault
          </button>
        )}
      </div>
    </div>
  );
}
