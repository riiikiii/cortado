import DOMPurify from 'dompurify';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRenderer, createWikilinkResolver } from '../markdown/render';
import { usePrefs } from '../state/prefs';
import { useStore, type Tab } from '../state/store';
import { getBlob } from '../storage/db';
import { attachLinkHandling, scrollToHash } from './links';
import { collectHeadings, currentSection, toOutline, type ViewerEvents } from './types';

export function MarkdownView({ tab, vaultId, events, footer }: { tab: Tab; vaultId: string; events: ViewerEvents; footer?: ReactNode }) {
  const paths = useStore((s) => s.paths);
  const theme = usePrefs((s) => s.resolved);
  const resolver = useMemo(() => createWikilinkResolver(paths), [paths]);
  // `v` changes on every render so the article remounts even when the HTML is identical.
  const [doc, setDoc] = useState<{ html: string; v: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const headings = useRef<HTMLElement[]>([]);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await getBlob(vaultId, tab.path);
      if (cancelled) return;
      if (!blob) {
        setDoc({ html: '<p class="muted">This note isn’t stored on this device. Try syncing the vault.</p>', v: Date.now() });
        return;
      }
      const render = createRenderer({ vaultId, path: tab.path, resolveWikilink: resolver });
      const out = DOMPurify.sanitize(render(await blob.text()), {
        ADD_ATTR: ['target', 'data-vault-path', 'data-hash', 'data-math'],
        ADD_TAGS: ['iframe'],
      });
      if (!cancelled) setDoc({ html: out, v: Date.now() });
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultId, tab.path, tab.nonce, resolver]);

  useEffect(() => {
    const el = article.current;
    const sc = scroller.current;
    if (!el || !sc || doc === null) return;
    const off = attachLinkHandling(el, tab.path, vaultId);
    callouts(el);
    copyButtons(el);
    headings.current = collectHeadings(el);
    eventsRef.current.onOutline?.(toOutline(headings.current));
    eventsRef.current.registerJump?.((i) => {
      const h = headings.current[i];
      if (h) sc.scrollTo({ top: h.offsetTop - 64, behavior: 'smooth' });
    });
    if (tab.hash) scrollToHash(el, tab.hash);
    else sc.scrollTop = tab.scrollY ?? 0;
    report();
    void enhance(el, theme).then(report);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Diagrams follow the reader's theme.
  const firstTheme = useRef(theme);
  useEffect(() => {
    if (theme === firstTheme.current) return;
    firstTheme.current = theme;
    if (article.current?.querySelector('.mermaid')) useStore.getState().updateTab(tab.id, { nonce: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  function report() {
    const sc = scroller.current;
    if (!sc) return;
    const max = sc.scrollHeight - sc.clientHeight;
    eventsRef.current.onScroll?.({
      y: sc.scrollTop,
      ratio: max > 4 ? sc.scrollTop / max : 1,
      section: currentSection(headings.current, sc.getBoundingClientRect().top, sc.clientHeight),
    });
  }

  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(report);
      clearTimeout(t);
      t = setTimeout(() => useStore.getState().updateTab(tab.id, { scrollY: Math.round(sc.scrollTop) }), 400);
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frame);
      sc.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  return (
    <div className="md-scroll" ref={scroller}>
      <article key={doc?.v} className={`md ${doc ? 'md-in' : ''}`} ref={article} dangerouslySetInnerHTML={{ __html: doc?.html ?? '' }} />
      {doc && footer}
    </div>
  );
}

const CALLOUT_FAMILIES: Record<string, string> = {
  note: 'info', info: 'info', abstract: 'info', summary: 'info', tldr: 'info', todo: 'info',
  tip: 'tip', hint: 'tip', important: 'tip', success: 'ok', check: 'ok', done: 'ok',
  question: 'question', help: 'question', faq: 'question',
  warning: 'warn', caution: 'warn', attention: 'warn',
  failure: 'danger', fail: 'danger', missing: 'danger', danger: 'danger', error: 'danger', bug: 'danger',
  example: 'example', quote: 'quote', cite: 'quote',
};

/** Obsidian-style callouts: "> [!tip] Title" becomes a coloured box; "[!tip]-" folds it. */
function callouts(root: HTMLElement) {
  for (const bq of root.querySelectorAll('blockquote')) {
    const first = bq.firstElementChild;
    if (!first || first.tagName !== 'P') continue;
    const m = /^\[!(\w+)\]([+-]?)[ \t]*([^\n]*)\n?/.exec(first.textContent ?? '');
    if (!m) continue;
    const [, rawType, fold, title] = m;
    const type = rawType.toLowerCase();
    // Remove the marker text (and the rest of the first line, which is the title).
    const walker = document.createTreeWalker(first, NodeFilter.SHOW_TEXT);
    let toStrip = m[0].length;
    while (toStrip > 0 && walker.nextNode()) {
      const node = walker.currentNode as Text;
      const cut = Math.min(toStrip, node.data.length);
      node.data = node.data.slice(cut);
      toStrip -= cut;
    }
    if (first.firstChild?.nodeName === 'BR') first.firstChild.remove();
    if (!first.textContent?.trim() && !first.querySelector('img')) first.remove();

    const box = document.createElement(fold ? 'details' : 'div');
    box.className = `callout callout-${CALLOUT_FAMILIES[type] ?? 'info'}`;
    if (fold === '+') (box as HTMLDetailsElement).open = true;
    const head = document.createElement(fold ? 'summary' : 'div');
    head.className = 'callout-title';
    head.textContent = title.trim() || type.charAt(0).toUpperCase() + type.slice(1);
    const body = document.createElement('div');
    body.className = 'callout-body';
    body.append(...bq.childNodes);
    box.append(head);
    if (body.textContent?.trim() || body.querySelector('img, pre, table')) box.append(body);
    bq.replaceWith(box);
  }
}

function copyButtons(root: HTMLElement) {
  for (const pre of root.querySelectorAll<HTMLElement>('pre.hljs')) {
    const btn = document.createElement('button');
    btn.className = 'copy-code';
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Can’t copy';
      }
      setTimeout(() => (btn.textContent = 'Copy'), 1500);
    });
    pre.append(btn);
  }
}

/** Load Mermaid and KaTeX only for notes that use them. */
async function enhance(el: HTMLElement, theme: string) {
  const diagrams = el.querySelectorAll<HTMLElement>('pre.mermaid');
  if (diagrams.length) {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : theme === 'sepia' ? 'neutral' : 'default', securityLevel: 'loose' });
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
