import { useEffect, useRef } from 'react';
import { useStore, type Tab } from '../state/store';
import { parseVaultUrl, vaultUrl } from '../util/paths';
import { attachLinkHandling } from './links';

// allow-same-origin keeps the iframe under the service worker, so the guide's relative
// assets and links load from the synced vault. Guides are your own files, so this is fine.
const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads';

export function HtmlView({ tab, vaultId }: { tab: Tab; vaultId: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const src = vaultUrl(vaultId, tab.path) + (tab.hash ?? '');

  const tabRef = useRef(tab);
  tabRef.current = tab;

  // A native listener, because React's onLoad can miss iframe loads (e.g. a fast load from the
  // service worker, or one that finished before React attached its handler).
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const handler = () => onLoad();
    frame.addEventListener('load', handler);
    const doc = frame.contentDocument;
    if (doc?.readyState === 'complete' && frame.contentWindow?.location.href !== 'about:blank') onLoad();
    return () => {
      frame.removeEventListener('load', handler);
      cleanup.current?.();
      cleanup.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, tab.nonce]);

  const onLoad = () => {
    const tab = tabRef.current;
    const frame = ref.current;
    cleanup.current?.();
    cleanup.current = null;
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!win || !doc) return;

    // The guide may have navigated itself (location.href = ...); keep the tab in step.
    const here = parseVaultUrl(win.location.pathname);
    if (here && here.vaultId === vaultId && here.path !== tab.path) {
      useStore.getState().updateTab(tab.id, { path: here.path, hash: undefined, scrollY: 0 });
    }

    const offLinks = attachLinkHandling(doc, here?.path ?? tab.path, vaultId);
    if (!tab.hash && tab.scrollY) win.scrollTo(0, tab.scrollY);

    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => useStore.getState().updateTab(tab.id, { scrollY: Math.round(win.scrollY) }), 400);
    };
    win.addEventListener('scroll', onScroll, { passive: true });
    // ⌘K inside a guide still opens the quick switcher.
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useStore.getState().setQuickOpen(true);
      }
    };
    doc.addEventListener('keydown', onKey);
    cleanup.current = () => {
      offLinks();
      clearTimeout(t);
      win.removeEventListener('scroll', onScroll);
      doc.removeEventListener('keydown', onKey);
    };
  };

  return (
    <iframe
      ref={ref}
      key={tab.nonce ?? 0}
      className="doc-frame"
      src={src}
      sandbox={SANDBOX}
      allow="fullscreen; clipboard-write; autoplay"
      title={tab.path}
    />
  );
}
