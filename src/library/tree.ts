import { baseName, dirName, isHidden, kindOf } from '../util/paths';

export interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

/** Kinds shown in the library and the file tree by default. */
export const LESSON_KINDS = new Set(['md', 'html', 'pdf']);

export const isLesson = (path: string) => !isHidden(path) && LESSON_KINDS.has(kindOf(path));

const ENTRY = /^(0+[\s._-]*.*|welcome|read ?me|start here|start|index|introduction|intro|overview|about)$/i;

/** A top-level Welcome, README, Index or "00 …" note: the natural place to start. */
const isEntry = (p: string) => !p.includes('/') && ENTRY.test(p.slice(0, p.lastIndexOf('.')));

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Folders first, then files, each in natural order ("2 Intro" before "10 Next"). */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', children: [] };
  const folders = new Map<string, TreeNode>([['', root]]);
  const folderFor = (dir: string): TreeNode => {
    let node = folders.get(dir);
    if (node) return node;
    const parent = folderFor(dirName(dir));
    node = { name: baseName(dir), path: dir, children: [] };
    parent.children!.push(node);
    folders.set(dir, node);
    return node;
  };
  for (const p of paths) folderFor(dirName(p)).children!.push({ name: baseName(p), path: p });
  const sort = (n: TreeNode) => {
    n.children?.sort((a, b) => (!!b.children === !!a.children ? collator.compare(a.name, b.name) : a.children ? -1 : 1));
    n.children?.forEach(sort);
  };
  sort(root);
  return root.children!;
}

/** Every file in the order the sidebar shows them, which is also the reading order. */
export function flatten(nodes: TreeNode[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.children) flatten(n.children, out);
    else out.push(n.path);
  }
  return out;
}

/** Lessons in reading order: a top-level welcome note first, then the sidebar order. */
export function readingOrder(paths: string[]): string[] {
  const order = flatten(buildTree(paths.filter(isLesson)));
  const entry = order.findIndex(isEntry);
  if (entry > 0) order.unshift(...order.splice(entry, 1));
  return order;
}

export function neighbours(order: string[], path: string): { prev?: string; next?: string } {
  const i = order.indexOf(path);
  if (i < 0) return {};
  return { prev: order[i - 1], next: order[i + 1] };
}

/** Strip a leading "01 ", "1. ", "02-" style number so lesson titles read naturally. */
export function lessonTitle(stem: string): { number?: string; title: string } {
  const m = /^(\d{1,3})(?:[.)_\-\s]+)(.+)$/.exec(stem);
  if (!m) return { title: stem };
  // "00 Start here" is an introduction rather than lesson zero.
  return Number(m[1]) ? { number: String(Number(m[1])), title: m[2] } : { title: m[2] };
}
