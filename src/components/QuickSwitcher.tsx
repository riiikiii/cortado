import { useEffect, useMemo, useRef, useState } from 'react';
import { searchDocs } from '../library/text';
import { useStore } from '../state/store';
import { fuzzyFilter } from '../util/fuzzy';
import { dirName, isDocument, isHidden, kindOf, stem } from '../util/paths';
import { fileIcon, Icon } from './Icon';

interface Row {
  path: string;
  snippet?: { text: string; match: boolean }[];
}

export function QuickSwitcher() {
  const open = useStore((s) => s.quickOpen);
  const paths = useStore((s) => s.paths);
  const recent = useStore((s) => s.recent);
  const docs = useStore((s) => s.docs);
  const docTitles = useStore((s) => s.titles);
  const { setQuickOpen, openFile } = useStore.getState();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const files = useMemo(() => paths.filter((p) => isDocument(p) && !isHidden(p) && kindOf(p) !== 'image'), [paths]);
  const { titles, text } = useMemo(() => {
    if (!query.trim()) {
      const have = new Set(paths);
      return { titles: recent.filter((p) => have.has(p)).slice(0, 12).map((path) => ({ path })), text: [] as Row[] };
    }
    const byTitle: Row[] = fuzzyFilter(query, files, (p) => `${docTitles[p] ?? ''} ${p}`, 8).map((path) => ({ path }));
    const shown = new Set(byTitle.map((t) => t.path));
    const text: Row[] = docs ? searchDocs(docs.values(), query, 25).filter((h) => !shown.has(h.path)).map((h) => ({ path: h.path, snippet: h.snippet })) : [];
    return { titles: byTitle, text };
  }, [query, files, recent, paths, docs, docTitles]);
  const rows = [...titles, ...text];

  useEffect(() => {
    if (open) {
      setQuery('');
      setSel(0);
      input.current?.focus();
    }
  }, [open]);
  useEffect(() => setSel(0), [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;
  const choose = (p: string, newTab = false) => {
    setQuickOpen(false);
    openFile(p, { newTab });
  };

  const item = (r: Row, i: number) => {
    const kind = kindOf(r.path);
    return (
      <button
        key={r.path}
        data-i={i}
        className={`switcher-item ${i === sel ? 'sel' : ''} ${r.snippet ? 'with-snippet' : ''}`}
        onClick={() => choose(r.path)}
        onMouseMove={() => setSel(i)}
      >
        <Icon name={fileIcon(kind)} size={18} className={`ico kind-${kind}`} />
        <span className="switcher-text">
          <span className="switcher-line">
            <span className="name">{docTitles[r.path] ?? stem(r.path)}</span>
            <span className="dir">{dirName(r.path)}</span>
          </span>
          {r.snippet && (
            <span className="snippet">
              {r.snippet.map((s, j) => (s.match ? <mark key={j}>{s.text}</mark> : <span key={j}>{s.text}</span>))}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="modal-backdrop top" onClick={() => setQuickOpen(false)}>
      <div className="switcher" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <div className="switcher-input">
          <Icon name="search" size={19} />
          <input
            ref={input}
            autoFocus
            value={query}
            placeholder="Search lessons and notes…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, rows.length - 1)));
              else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)));
              else if (e.key === 'Enter' && rows[sel]) choose(rows[sel].path, e.metaKey || e.ctrlKey);
              else if (e.key === 'Escape') setQuickOpen(false);
            }}
          />
          <kbd className="esc" onClick={() => setQuickOpen(false)}>
            esc
          </kbd>
        </div>
        <div className="switcher-list" ref={list}>
          {titles.length > 0 && <div className="switcher-heading">{query.trim() ? 'Titles' : 'Recent'}</div>}
          {titles.map((r, i) => item(r, i))}
          {text.length > 0 && <div className="switcher-heading">In the text</div>}
          {text.map((r, i) => item(r, titles.length + i))}
          {query.trim() && !docs && <div className="switcher-empty small">Indexing your notes for full-text search…</div>}
          {!rows.length && (query.trim() ? docs && <div className="switcher-empty">No matches for “{query}”</div> : <div className="switcher-empty">Type to search every lesson and note</div>)}
        </div>
      </div>
    </div>
  );
}
