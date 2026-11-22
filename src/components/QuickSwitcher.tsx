import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { fuzzyFilter } from '../util/fuzzy';
import { dirName, isDocument, isHidden, kindOf, stem } from '../util/paths';
import { fileIcon, Icon } from './Icon';

export function QuickSwitcher() {
  const open = useStore((s) => s.quickOpen);
  const paths = useStore((s) => s.paths);
  const recent = useStore((s) => s.recent);
  const { setQuickOpen, openFile } = useStore.getState();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const docs = useMemo(() => paths.filter((p) => isDocument(p) && !isHidden(p) && kindOf(p) !== 'image'), [paths]);
  const results = useMemo(() => {
    if (!query.trim()) {
      const have = new Set(paths);
      return recent.filter((p) => have.has(p)).slice(0, 15);
    }
    return fuzzyFilter(query, docs, (p) => p, 40);
  }, [query, docs, recent, paths]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);
  useEffect(() => setSel(0), [query]);
  useEffect(() => {
    list.current?.children[sel]?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;
  const choose = (p: string, newTab = false) => {
    setQuickOpen(false);
    openFile(p, { newTab });
  };

  return (
    <div className="modal-backdrop top" onClick={() => setQuickOpen(false)}>
      <div className="switcher" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Open file">
        <div className="switcher-input">
          <Icon name="search" size={18} />
          <input
            ref={input}
            value={query}
            placeholder="Find a guide or note…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, results.length - 1)));
              else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)));
              else if (e.key === 'Enter' && results[sel]) choose(results[sel], e.metaKey || e.ctrlKey);
              else if (e.key === 'Escape') setQuickOpen(false);
            }}
          />
        </div>
        {!query.trim() && results.length > 0 && <div className="switcher-heading">Recent</div>}
        <ul className="switcher-list" ref={list}>
          {results.map((p, i) => {
            const kind = kindOf(p);
            return (
              <li key={p}>
                <button className={`switcher-item ${i === sel ? 'sel' : ''}`} onClick={() => choose(p)} onMouseMove={() => setSel(i)}>
                  <Icon name={fileIcon(p, kind)} size={18} className={`ico kind-${kind}`} />
                  <span className="name">{stem(p)}</span>
                  <span className="dir">{dirName(p)}</span>
                </button>
              </li>
            );
          })}
          {!results.length && <li className="switcher-empty">{query ? 'No matches' : 'Start typing to search the vault'}</li>}
        </ul>
      </div>
    </div>
  );
}
