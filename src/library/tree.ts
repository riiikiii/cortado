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

export interface Collection {
  /** Folder path, or '' for the documents at the top of the vault. */
  path: string;
  name: string;
  lessons: string[];
}

/**
 * Top-level folders become collections ("courses"). Documents sitting at the top of the vault
 * are grouped into one collection with an empty path. Collections with no lessons are dropped.
 */
export function collections(paths: string[]): Collection[] {
  const tree = buildTree(paths.filter(isLesson));
  const out: Collection[] = [];
  const loose: string[] = [];
  for (const n of tree) {
    if (n.children) out.push({ path: n.path, name: n.name, lessons: flatten(n.children) });
    else loose.push(n.path);
  }
  if (loose.length) out.push({ path: '', name: 'Other notes', lessons: loose });
  return out.filter((c) => c.lessons.length);
}

/** The lessons inside `folder` (recursively), grouped by the sub-folder they live in. */
export function sections(paths: string[], folder: string): { path: string; name: string; lessons: string[] }[] {
  const prefix = folder ? `${folder}/` : '';
  const inside = paths.filter((p) => isLesson(p) && p.startsWith(prefix) && (folder || !p.includes('/')));
  const groups = new Map<string, string[]>();
  for (const p of readingOrder(inside)) {
    const dir = dirName(p);
    const list = groups.get(dir) ?? [];
    list.push(p);
    groups.set(dir, list);
  }
  return [...groups].map(([dir, lessons]) => ({
    path: dir,
    name: dir === folder ? '' : dir.slice(prefix.length),
    lessons,
  }));
}

/** A top-level Welcome, README, Index or "00 …" note: the natural place to start. */
const isEntry = (p: string) => !p.includes('/') && ENTRY.test(p.slice(0, p.lastIndexOf('.')));

/** Where a newcomer should begin: the welcome note if there is one, else the first lesson. */
export function startHere(order: string[]): string | undefined {
  return order.find(isEntry) ?? order[0];
}

/** Strip a leading "01 ", "1. ", "02-" style number so lesson titles read naturally. */
export function lessonTitle(stem: string): { number?: string; title: string } {
  const m = /^(\d{1,3})(?:[.)_\-\s]+)(.+)$/.exec(stem);
  return m ? { number: String(Number(m[1])), title: m[2] } : { title: stem };
}
