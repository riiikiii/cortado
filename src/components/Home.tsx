import { hasSession } from '../auth/google';
import { useStore } from '../state/store';
import { GoogleButton } from './GoogleConnect';
import { Avatar, Icon } from './Icon';
import { CupIllustration, CupLogo } from './Logo';
import { SyncStatus } from './SyncButton';

const devAvailable = import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(location.hostname);

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

function EmptyVault({ name }: { name: string }) {
  const running = useStore((s) => s.sync.running);
  const vault = useStore((s) => s.vaults.find((v) => v.id === s.activeVaultId));
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
            {vault?.accountId && !hasSession(vault.accountId) && <p className="small muted">You may be asked to sign in to Google again.</p>}
          </>
        )}
      </div>
    </div>
  );
}

function Welcome() {
  const accounts = useStore((s) => s.accounts);
  const siteLibrary = useStore((s) => s.siteLibrary);
  const { openPicker } = useStore.getState();
  const signedIn = accounts.filter((a) => hasSession(a.id));

  return (
    <div className="landing">
      <Splash />
        <div className="welcome-actions">
          {signedIn.length > 0 ? (
            <>
              <button className="btn primary big" onClick={() => openPicker({ view: 'browse', accountId: signedIn[0].id })}>
                <Avatar name={signedIn[0].name} photo={signedIn[0].photo} size={24} /> Choose a folder from {signedIn[0].name.split(' ')[0]}’s Drive
              </button>
              <GoogleButton label="Use another Google account" chooseAccount subtle />
            </>
          ) : (
            <GoogleButton label="Continue with Google" />
          )}
          {siteLibrary && (
            <button className="btn ghost" onClick={() => useStore.getState().addSiteLibrary()}>
              <Icon name="book" size={18} /> Open {siteLibrary.name}
            </button>
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
