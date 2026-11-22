import { useStore } from '../state/store';
import { isDocument, parseVaultUrl } from '../util/paths';

const LONG_PRESS_MS = 500;

/**
 * Make links inside a rendered document behave like an app:
 * - links to other vault documents open in a tab (⌘/Ctrl-click or long-press opens a new tab),
 * - links to other sites open in Safari,
 * - in-page #anchors scroll as normal.
 * `root` is the iframe document for HTML guides, or the article element for Markdown.
 */
export function attachLinkHandling(root: Document | HTMLElement, currentPath: string, vaultId: string): () => void {
  // nodeType, not instanceof: an iframe's Document comes from another realm.
  const isDoc = root.nodeType === Node.DOCUMENT_NODE;
  const doc = isDoc ? (root as Document) : (root as HTMLElement).ownerDocument;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let suppressClick = false;

  const classify = (a: HTMLAnchorElement) => {
    const raw = a.getAttribute('href');
    if (!raw || raw.startsWith('javascript:')) return null;
    let url: URL;
    try {
      url = new URL(a.href, doc.baseURI);
    } catch {
      return null;
    }
    if (url.origin !== location.origin) {
      if (/^https?:$/.test(url.protocol)) return { kind: 'external' as const, url };
      return null; // mailto:, tel: etc. – let the system handle them
    }
    const dataPath = a.dataset.vaultPath;
    const target = dataPath ? { vaultId, path: dataPath } : parseVaultUrl(url.pathname);
    if (!target || target.vaultId !== vaultId) return null;
    const hash = a.dataset.hash ?? url.hash;
    if (target.path === currentPath) return { kind: 'same' as const, hash };
    if (!isDocument(target.path)) return null; // assets (zip, etc.) load normally
    return { kind: 'vault' as const, path: target.path, hash };
  };

  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || e.defaultPrevented) return;
    if (suppressClick) {
      e.preventDefault();
      suppressClick = false;
      return;
    }
    const c = classify(a);
    if (!c) return;
    if (c.kind === 'external') {
      e.preventDefault();
      window.open(c.url.href, '_blank', 'noopener');
    } else if (c.kind === 'vault') {
      e.preventDefault();
      const newTab = e.metaKey || e.ctrlKey || a.target === '_blank';
      useStore.getState().openFile(c.path, { newTab, hash: c.hash || undefined });
    } else if (c.kind === 'same' && c.hash) {
      // Markdown lives inside the app document, so scroll within its container ourselves.
      if (!isDoc) {
        e.preventDefault();
        scrollToHash(root as HTMLElement, c.hash);
      }
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const c = classify(a);
    if (!c || c.kind !== 'vault') return;
    pressTimer = setTimeout(() => {
      suppressClick = true;
      useStore.getState().openFile(c.path, { newTab: true, background: true, hash: c.hash || undefined });
      useStore.getState().showToast('Opened in a new tab');
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(pressTimer);

  // Stop iOS's own link callout on vault links so our long-press wins.
  const style = doc.createElement('style');
  style.textContent = 'a[href]{-webkit-touch-callout:none}';
  (isDoc ? (doc.head ?? doc.documentElement) : (root as HTMLElement)).appendChild(style);

  const target: EventTarget = root;
  target.addEventListener('click', onClick as EventListener, true);
  target.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
  target.addEventListener('touchend', cancelPress);
  target.addEventListener('touchmove', cancelPress);
  target.addEventListener('touchcancel', cancelPress);

  return () => {
    target.removeEventListener('click', onClick as EventListener, true);
    target.removeEventListener('touchstart', onTouchStart as EventListener);
    target.removeEventListener('touchend', cancelPress);
    target.removeEventListener('touchmove', cancelPress);
    target.removeEventListener('touchcancel', cancelPress);
    style.remove();
  };
}

export function scrollToHash(container: HTMLElement, hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return;
  const el = container.querySelector(`[id="${CSS.escape(id)}"], [name="${CSS.escape(id)}"]`);
  el?.scrollIntoView({ block: 'start' });
}
