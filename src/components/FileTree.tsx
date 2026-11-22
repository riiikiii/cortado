import { memo, useMemo, useState } from 'react';
import { buildTree, flatten, LESSON_KINDS, type TreeNode } from '../library/tree';
import { lessonState, useStore, useTitle, type Progress } from '../state/store';
import { fuzzyFilter } from '../util/fuzzy';
import { baseName, dirName, isHidden, kindOf } from '../util/paths';
import { fileIcon, Icon, StatusDot } from './Icon';

const EXPANDED_KEY = 'cortado.expanded';

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function FileTree({ filter, showAll }: { filter: string; showAll: boolean }) {
  const paths = useStore((s) => s.paths);
  const progress = useStore((s) => s.progress);
  const activePath = useStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.path ?? undefined);
  const [expanded, setExpanded] = useState(loadExpanded);

  const visible = useMemo(() => paths.filter((p) => !isHidden(p) && (showAll || LESSON_KINDS.has(kindOf(p)))), [paths, showAll]);
  const tree = useMemo(() => buildTree(visible), [visible]);

  const toggle = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]));
  };

  if (!paths.length) return <div className="tree-empty">No files yet. Tap sync to download this vault.</div>;

  if (filter.trim()) {
    const hits = fuzzyFilter(filter, visible, (p) => p, 200);
    return (
      <ul className="tree" role="tree">
        {hits.map((p) => (
          <FileRow key={p} path={p} depth={0} active={p === activePath} progress={progress[p]} showDir />
        ))}
        {!hits.length && <li className="tree-empty">No matches</li>}
      </ul>
    );
  }

  return (
    <ul className="tree" role="tree">
      {tree.map((n) => (
        <Node key={n.path} node={n} depth={0} expanded={expanded} toggle={toggle} activePath={activePath} progress={progress} />
      ))}
    </ul>
  );
}

const Node = memo(function Node({
  node,
  depth,
  expanded,
  toggle,
  activePath,
  progress,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (p: string) => void;
  activePath?: string;
  progress: Record<string, Progress>;
}) {
  if (!node.children) return <FileRow path={node.path} depth={depth} active={node.path === activePath} progress={progress[node.path]} />;
  const open = expanded.has(node.path);
  const lessons = flatten(node.children).filter((p) => LESSON_KINDS.has(kindOf(p)));
  const done = lessons.filter((p) => progress[p]?.doneAt).length;
  return (
    <li role="treeitem" aria-expanded={open}>
      <button className="tree-row folder" style={{ paddingLeft: 6 + depth * 14 }} onClick={() => toggle(node.path)}>
        <Icon name="chevron" size={13} className={`chev ${open ? 'open' : ''}`} strokeWidth={2.2} />
        <Icon name="folder" size={17} className="ico" />
        <span className="label">{node.name}</span>
        {lessons.length > 0 && (
          <span className={`count ${done === lessons.length ? 'complete' : ''}`}>
            {done > 0 ? `${done}/${lessons.length}` : lessons.length}
          </span>
        )}
      </button>
      {open && (
        <ul role="group" className="tree-group" style={{ '--guide': `${13 + depth * 14}px` } as React.CSSProperties}>
          {node.children.map((c) => (
            <Node key={c.path} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} activePath={activePath} progress={progress} />
          ))}
        </ul>
      )}
    </li>
  );
});

function FileRow({ path, depth, active, showDir, progress }: { path: string; depth: number; active: boolean; showDir?: boolean; progress?: Progress }) {
  const openFile = useStore((s) => s.openFile);
  const kind = kindOf(path);
  const lesson = LESSON_KINDS.has(kind);
  const state = lessonState(progress);
  const title = useTitle(path);
  return (
    <li role="treeitem">
      <button
        className={`tree-row file ${active ? 'active' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 + 17 }}
        onClick={(e) => openFile(path, { newTab: e.metaKey || e.ctrlKey })}
        onContextMenu={(e) => {
          e.preventDefault();
          openFile(path, { newTab: true });
        }}
        title={path}
      >
        <Icon name={fileIcon(kind)} size={17} className={`ico kind-${kind}`} />
        <span className="label">
          {kind === 'md' || kind === 'html' ? title : baseName(path)}
          {showDir && dirName(path) && <span className="dir">{dirName(path)}</span>}
        </span>
        {lesson && state !== 'new' && <StatusDot state={state} ratio={progress?.ratio} size={15} />}
      </button>
    </li>
  );
}
