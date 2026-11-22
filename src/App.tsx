import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { AppShell } from './components/AppShell';
import { Icon } from './components/Icon';
import { useStore } from './state/store';

type SwStatus = 'ok' | 'unsupported' | 'failed';
const RELOADED_KEY = 'cortado.swReloaded';

/**
 * Make sure the service worker controls this page, so vault URLs (HTML guides, images) are
 * served from the device. A hard reload skips the service worker, so ask it to take over,
 * and as a last resort reload once normally.
 */
async function startServiceWorker(): Promise<SwStatus> {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  registerSW({ immediate: true });
  const controlled = () => !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker.ready;
  if (!controlled()) {
    const changed = new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
      setTimeout(resolve, 4000);
    });
    reg.active?.postMessage({ type: 'CLAIM' });
    await changed;
  }
  if (controlled()) {
    sessionStorage.removeItem(RELOADED_KEY);
    return 'ok';
  }
  if (!sessionStorage.getItem(RELOADED_KEY)) {
    sessionStorage.setItem(RELOADED_KEY, '1');
    location.reload();
    return new Promise(() => {});
  }
  return 'failed';
}

const SW_MESSAGES: Record<Exclude<SwStatus, 'ok'>, string> = {
  unsupported:
    'This browser won’t let Cortado work offline, so HTML guides can’t open. Private browsing and in-app browsers often block it: open this page in Safari or Chrome instead.',
  failed: 'Cortado’s offline helper didn’t start, so HTML guides may not open. Reloading usually fixes it.',
};

export function App() {
  const ready = useStore((s) => s.ready);
  const [swStatus, setSwStatus] = useState<SwStatus>('ok');
  const report = (status: SwStatus) => {
    useStore.setState({ sw: status });
    setSwStatus(status);
  };

  useEffect(() => {
    startServiceWorker().then(report, () => report('failed'));
    // Syncing doesn't need the service worker, so don't wait for it.
    void useStore.getState().init();
  }, []);

  if (!ready) return <div className="boot" />;
  return (
    <>
      <AppShell />
      {swStatus !== 'ok' && (
        <div className="notice" role="alert">
          <Icon name="wifi" size={20} className="notice-icon" />
          <span className="notice-text">{SW_MESSAGES[swStatus]}</span>
          {swStatus === 'failed' && (
            <button className="btn small" onClick={() => location.reload()}>
              Reload
            </button>
          )}
          <button className="icon-btn small" aria-label="Dismiss" onClick={() => setSwStatus('ok')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
