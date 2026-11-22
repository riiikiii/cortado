import DOMPurify from 'dompurify';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRenderer, createWikilinkResolver } from '../markdown/render';
import { useStore, type Tab } from '../state/store';
import { getBlob } from '../storage/db';
import { attachLinkHandling, scrollToHash } from './links';

export function MarkdownView({ tab, vaultId }: { tab: Tab; vaultId: string }) {
  const paths = useStore((s) => s.paths);
  const resolver = useMemo(() => createWikilinkResolver(paths), [paths]);
  const [html, setHtml] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await getBlob(vaultId, tab.path);
      if (cancelled) return;
      if (!blob) {
        setHtml('<p class="muted">This note isn’t stored on this device. Try syncing the vault.</p>');
        return;
      }
      const render = createRenderer({ vaultId, path: tab.path, resolveWikilink: resolver });
      const out = DOMPurify.sanitize(render(await blob.text()), {
        ADD_ATTR: ['target', 'data-vault-path', 'data-hash', 'data-math'],
        ADD_TAGS: ['iframe'],
      });
      if (!cancelled) setHtml(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultId, tab.path, tab.nonce, resolver]);

  useEffect(() => {
    const el = article.current;
    const sc = scroller.current;
    if (!el || !sc || html === null) return;
    const off = attachLinkHandling(el, tab.path, vaultId);
    if (tab.hash) scrollToHash(el, tab.hash);
    else sc.scrollTop = tab.scrollY ?? 0;
    enhance(el);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => useStore.getState().updateTab(tab.id, { scrollY: Math.round(sc.scrollTop) }), 400);
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      sc.removeEventListener('scroll', onScroll);
    };
  }, [tab.id]);

  return (
    <div className="md-scroll" ref={scroller}>
      <article className="md" ref={article} dangerouslySetInnerHTML={{ __html: html ?? '' }} />
    </div>
  );
}

/** Load Mermaid and KaTeX only for notes that use them. */
async function enhance(el: HTMLElement) {
  const diagrams = el.querySelectorAll<HTMLElement>('pre.mermaid');
  if (diagrams.length) {
    const { default: mermaid } = await import('mermaid');
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'loose' });
    await mermaid.run({ nodes: [...diagrams] }).catch(() => {});
  }
  const maths = el.querySelectorAll<HTMLElement>('.math[data-math]');
  if (maths.length) {
    const [{ default: katex }] = await Promise.all([import('katex'), import('katex/dist/katex.min.css')]);
    for (const m of maths) {
      try {
        katex.render(m.textContent ?? '', m, { displayMode: m.dataset.math === 'block', throwOnError: false });
      } catch {
        /* leave the source visible */
      }
    }
  }
}
