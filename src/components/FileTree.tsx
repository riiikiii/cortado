import { memo, useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { fuzzyFilter } from '../util/fuzzy';
import { baseName, dirName, isHidden, kindOf, stem } from '../util/paths';
import { fileIcon, Icon } from './Icon';

interface Node {
  name: string;
  path: string;
  children?: Node[];
}

const SHOWN_KINDS = new Set(['md', 'html', 'pdf']);
const EXPANDED_KEY = 'cortado.expanded';

function buildTree(paths: string[]): Node[] {
  const root: Node = { name: '', path: '', children: [] };
  const folders = new Map<string, Node>([['', root]]);
  const folderFor = (dir: string): Node => {
    let node = folders.get(dir);
    if (node) return node;
    const parent = folderFor(dirName(dir));
    node = { name: baseName(dir), path: dir, children: [] };
    parent.children!.push(node);
    folders.set(dir, node);
    return node;
  };
  for (const p of paths) folderFor(dirName(p)).children!.push({ name: baseName(p), path: p });
  const sort = (n: Node) => {
    n.children?.sort((a, b) => (!!b.children === !!a.children ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.children ? -1 : 1));
    n.children?.forEach(sort);
  };
  sort(root);
  return root.children!;
}

function loadExpanded(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function FileTree({ filter, showAll }: { filter: string; showAll: boolean }) {
  const paths = useStore((s) => s.paths);
  const activePath = useStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.path);
  const [expanded, setExpanded] = useState(loadExpanded);

  const visible = useMemo(
    () => paths.filter((p) => !isHidden(p) && (showAll || SHOWN_KINDS.has(kindOf(p)))),
    [paths, showAll],
  );
  const tree = useMemo(() => buildTree(visible), [visible]);

  const toggle = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]));
  };

  if (!paths.length) return <div className="tree-empty">No files yet. Tap Sync to download this vault.</div>;

  if (filter.trim()) {
    const hits = fuzzyFilter(filter, visible, (p) => p, 200);
    return (
      <ul className="tree" role="tree">
        {hits.map((p) => (
          <FileRow key={p} path={p} depth={0} active={p === activePath} showDir />
        ))}
        {!hits.length && <li className="tree-empty">No matches</li>}
      </ul>
    );
  }

  return (
    <ul className="tree" role="tree">
      {tree.map((n) => (
        <TreeNode key={n.path} node={n} depth={0} expanded={expanded} toggle={toggle} activePath={activePath} />
      ))}
    </ul>
  );
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  expanded,
  toggle,
  activePath,
}: {
  node: Node;
  depth: number;
  expanded: Set<string>;
  toggle: (p: string) => void;
  activePath?: string;
}) {
  if (!node.children) return <FileRow path={node.path} depth={depth} active={node.path === activePath} />;
  const open = expanded.has(node.path);
  return (
    <li role="treeitem" aria-expanded={open}>
      <button className="tree-row folder" style={{ paddingLeft: 8 + depth * 16 }} onClick={() => toggle(node.path)}>
        <Icon name="chevron" size={14} className={`chev ${open ? 'open' : ''}`} />
        <Icon name="folder" size={18} className="ico" />
        <span className="label">{node.name}</span>
      </button>
      {open && (
        <ul role="group">
          {node.children.map((c) => (
            <TreeNode key={c.path} node={c} depth={depth + 1} expanded={expanded} toggle={toggle} activePath={activePath} />
          ))}
        </ul>
      )}
    </li>
  );
});

function FileRow({ path, depth, active, showDir }: { path: string; depth: number; active: boolean; showDir?: boolean }) {
  const openFile = useStore((s) => s.openFile);
  const kind = kindOf(path);
  return (
    <li role="treeitem">
      <button
        className={`tree-row file ${active ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 + 14 }}
        onClick={(e) => openFile(path, { newTab: e.metaKey || e.ctrlKey })}
        onContextMenu={(e) => {
          e.preventDefault();
          openFile(path, { newTab: true });
        }}
        title={path}
      >
        <Icon name={fileIcon(path, kind)} size={18} className={`ico kind-${kind}`} />
        <span className="label">
          {kind === 'md' || kind === 'html' ? stem(path) : baseName(path)}
          {showDir && dirName(path) && <span className="dir">{dirName(path)}</span>}
        </span>
      </button>
    </li>
  );
}
