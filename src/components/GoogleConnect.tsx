import { useState } from 'react';
import { CLIENT_ID_PATTERN, clientId, clientIdIsBuiltIn, hasSession, redirectUri, setClientId, signIn, type GoogleAccount } from '../auth/google';
import { useStore } from '../state/store';
import { Avatar, GoogleLogo, Icon } from './Icon';
import { useOnline } from './SyncButton';

export function GoogleButton({ label = 'Continue with Google', chooseAccount, subtle }: { label?: string; chooseAccount?: boolean; subtle?: boolean }) {
  const online = useOnline();
  return (
    <button
      className={`google-btn ${subtle ? 'subtle' : ''}`}
      disabled={!online}
      title={online ? undefined : 'Connect to the internet to sign in'}
      onClick={() => useStore.getState().connectGoogle({ chooseAccount })}
    >
      <GoogleLogo size={20} />
      <span>{online ? label : 'Offline'}</span>
    </button>
  );
}

/** Lists connected Google accounts with their session state, plus "add another". */
export function AccountList({ onBrowse }: { onBrowse?: (a: GoogleAccount) => void }) {
  const accounts = useStore((s) => s.accounts);
  const vaults = useStore((s) => s.vaults);
  const { disconnectAccount } = useStore.getState();
  if (!accounts.length) return null;
  return (
    <ul className="account-list">
      {accounts.map((a) => {
        const live = hasSession(a.id);
        const count = vaults.filter((v) => v.accountId === a.id).length;
        return (
          <li key={a.id} className="account-row">
            <Avatar name={a.name} photo={a.photo} size={36} />
            <span className="account-text">
              <span className="account-name">{a.name}</span>
              <span className="account-email">
                {a.email}
                {count > 0 && ` · ${count} ${count === 1 ? 'vault' : 'vaults'}`}
              </span>
            </span>
            <span className={`session-dot ${live ? 'live' : ''}`} title={live ? 'Signed in' : 'Signed out. You’ll be asked to sign in when you sync.'} />
            {onBrowse && (
              <button
                className="btn small"
                onClick={() => (live ? onBrowse(a) : signIn({ resume: { action: 'pick-folder' }, loginHint: a.email }))}
              >
                {live ? 'Browse' : 'Sign in'}
              </button>
            )}
            <button
              className="icon-btn danger"
              aria-label={`Disconnect ${a.email}`}
              title="Disconnect"
              onClick={() => {
                const msg = count
                  ? `Disconnect ${a.email}? Its ${count === 1 ? 'vault stays' : 'vaults stay'} readable on this device, and syncing will ask you to sign in again.`
                  : `Disconnect ${a.email} from Cortado on this device?`;
                if (confirm(msg)) void disconnectAccount(a.id);
              }}
            >
              <Icon name="logout" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-field">
      <span className="copy-label">{label}</span>
      <span className="copy-row">
        <code>{value}</code>
        <button
          className="icon-btn small"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard?.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} size={16} />
        </button>
      </span>
    </div>
  );
}

const ext = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {text}
    <Icon name="external" size={13} />
  </a>
);

/**
 * One-time setup when the app was built without a client ID: a short guide to creating one,
 * with this deployment's exact origin and redirect URI to copy, and a field to paste the ID.
 */
export function ClientSetup({ onDone, onBack }: { onDone: () => void; onBack?: () => void }) {
  const [value, setValue] = useState(clientId() ?? '');
  const valid = CLIENT_ID_PATTERN.test(value.trim());
  const origin = location.origin;

  return (
    <div className="setup">
      <header className="sheet-head">
        {onBack && (
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <Icon name="back" />
          </button>
        )}
        <h2>Set up Google sign-in</h2>
      </header>
      <div className="sheet-scroll">
        <p className="setup-lede">
          Cortado signs in through your own Google Cloud project, so your files only ever travel between Google and this device. It takes about five
          minutes, once.
        </p>
        <ol className="setup-steps">
          <li>
            {ext('https://console.cloud.google.com/projectcreate', 'Create a Google Cloud project')} called “Cortado”.
          </li>
          <li>Turn on the {ext('https://console.cloud.google.com/apis/library/drive.googleapis.com', 'Google Drive API')}.</li>
          <li>
            In {ext('https://console.cloud.google.com/auth/overview', 'Google Auth Platform')}, add the app name and your email, choose{' '}
            <b>External</b>, and add every Google account that will sign in under <b>Test users</b>.
          </li>
          <li>
            Under <b>Data Access</b>, add the scope <code>…/auth/drive.readonly</code>.
          </li>
          <li>
            Under <b>Clients</b>, create a <b>Web application</b> client with:
            <CopyField label="Authorised JavaScript origin" value={origin} />
            <CopyField label="Authorised redirect URI" value={redirectUri()} />
          </li>
          <li>Paste the client ID here:</li>
        </ol>
        <label className="field">
          <Icon name="key" size={18} className="muted" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="1234567890-abc123.apps.googleusercontent.com"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
          />
        </label>
        {value && !valid && <p className="small error">That doesn’t look like a client ID. It ends in .apps.googleusercontent.com.</p>}
        <p className="small muted">The client ID is not a secret. It’s saved on this device only.</p>
      </div>
      <div className="sheet-actions">
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => {
            setClientId(value.trim());
            onDone();
          }}
        >
          Save and sign in
        </button>
      </div>
    </div>
  );
}

/** Settings row for a client ID that was entered on this device. */
export function ClientIdRow() {
  const [, force] = useState(0);
  if (clientIdIsBuiltIn()) return null;
  const id = clientId();
  return (
    <div className="setting-row">
      <span className="setting-text">
        <span>Google client ID</span>
        <span className="small muted ellipsis">{id ?? 'Not set'}</span>
      </span>
      <button className="btn small" onClick={() => useStore.getState().openPicker({ view: 'setup' })}>
        {id ? 'Change' : 'Set up'}
      </button>
      {id && (
        <button
          className="btn small ghost"
          onClick={() => {
            if (confirm('Remove the client ID from this device? You’ll need it again to sync Google Drive vaults.')) {
              setClientId(null);
              force((n) => n + 1);
            }
          }}
        >
          Remove
        </button>
      )}
    </div>
  );
}
