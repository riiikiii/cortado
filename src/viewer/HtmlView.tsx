import { useEffect, useRef } from 'react';
import { useStore, type DocTab } from '../state/store';
import { parseVaultUrl, vaultUrl } from '../util/paths';
import { attachLinkHandling } from './links';
import { collectHeadings, currentSection, toOutline, type ViewerEvents } from './types';

// allow-same-origin keeps the iframe under the service worker, so the guide's relative
// assets and links load from the synced vault. Guides are your own files, so this is fine.
const SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-downloads';

export function HtmlView({ tab, vaultId, events }: { tab: DocTab; vaultId: string; events: ViewerEvents }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const src = vaultUrl(vaultId, tab.path) + (tab.hash ?? '');

  const tabRef = useRef(tab);
  tabRef.current = tab;
  const eventsRef = useRef(events);
  eventsRef.current = events;

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
    frame?.classList.add('loaded');
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

    let headings = collectHeadings(doc);
    eventsRef.current.onOutline?.(toOutline(headings));
    eventsRef.current.registerJump?.((i) => headings[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    // Guides that build their content with script get a second look once they settle.
    const late = setTimeout(() => {
      const again = collectHeadings(doc);
      if (again.length !== headings.length) {
        headings = again;
        eventsRef.current.onOutline?.(toOutline(headings));
      }
      report();
    }, 800);

    const scroller = doc.scrollingElement ?? doc.documentElement;
    const report = () => {
      const max = scroller.scrollHeight - win.innerHeight;
      eventsRef.current.onScroll?.({
        y: win.scrollY,
        ratio: max > 4 ? win.scrollY / max : 1,
        section: currentSection(headings, 0, win.innerHeight),
      });
    };
    report();

    let t: ReturnType<typeof setTimeout> | undefined;
    let frameReq = 0;
    const onScroll = () => {
      cancelAnimationFrame(frameReq);
      frameReq = requestAnimationFrame(report);
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
      clearTimeout(late);
      cancelAnimationFrame(frameReq);
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
