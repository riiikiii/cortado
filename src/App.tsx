import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { finishRedirect, migrateLegacyToken } from './auth/google';
import { AppShell } from './components/AppShell';
import { useStore } from './state/store';

/** Resolve once a service worker controls this page, so vault URLs are served from IndexedDB. */
async function waitForServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  registerSW({ immediate: true });
  await navigator.serviceWorker.ready;
  if (navigator.serviceWorker.controller) return true;
  await new Promise<void>((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
    setTimeout(resolve, 3000);
  });
  return !!navigator.serviceWorker.controller;
}

export function App() {
  const ready = useStore((s) => s.ready);
  const [swError, setSwError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [swOk, redirect] = await Promise.all([
        waitForServiceWorker(),
        finishRedirect(),
        migrateLegacyToken(),
        useStore.getState().init(),
      ]).then(([sw, r]) => [sw, r] as const);
      if (!swOk) setSwError('This browser has no service worker support, so guides can’t be shown offline.');
      const s = useStore.getState();
      if (redirect?.error) s.showToast(redirect.error);
      await s.afterSignIn(redirect?.account, redirect?.resume);
    })();
  }, []);

  if (!ready) return <div className="boot" />;
  return (
    <>
      {swError && <div className="banner">{swError}</div>}
      <AppShell />
    </>
  );
}
