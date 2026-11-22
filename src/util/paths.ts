// Path helpers. Vault paths are POSIX-style, relative to the vault root, no leading slash.

export const APP_BASE = import.meta.env.BASE_URL; // e.g. "/" in dev, "/cortado/" in production

export function extOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function stem(path: string): string {
  const name = baseName(path);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export function dirName(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

/** Resolve `rel` (a relative link, possibly with ../) against the directory of `fromPath`. */
export function resolveRelative(fromPath: string, rel: string): string {
  const parts = rel.startsWith('/') ? [] : dirName(fromPath).split('/').filter(Boolean);
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function decodePath(path: string): string {
  return path.split('/').map((s) => decodeURIComponent(s)).join('/');
}

/** URL the service worker answers for a vault file. */
export function vaultUrl(vaultId: string, path: string, base = APP_BASE): string {
  return `${base}vault/${encodeURIComponent(vaultId)}/${encodePath(path)}`;
}

/** Inverse of vaultUrl: returns {vaultId, path} when `pathname` points into the vault route. */
export function parseVaultUrl(pathname: string, base = APP_BASE): { vaultId: string; path: string } | null {
  const prefix = `${base}vault/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  return { vaultId: decodeURIComponent(rest.slice(0, slash)), path: decodePath(rest.slice(slash + 1)) };
}

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  markdown: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  wasm: 'application/wasm',
  csv: 'text/csv; charset=utf-8',
  xml: 'application/xml',
};

export function mimeFor(path: string): string {
  return MIME[extOf(path)] ?? 'application/octet-stream';
}

export type DocKind = 'html' | 'md' | 'image' | 'pdf' | 'text' | 'other';

export function kindOf(path: string): DocKind {
  const e = extOf(path);
  if (e === 'html' || e === 'htm') return 'html';
  if (e === 'md' || e === 'markdown') return 'md';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'].includes(e)) return 'image';
  if (e === 'pdf') return 'pdf';
  if (['txt', 'json', 'css', 'js', 'csv', 'xml', 'yml', 'yaml'].includes(e)) return 'text';
  return 'other';
}

/** Files that make sense to open as a document in a tab. */
export function isDocument(path: string): boolean {
  return kindOf(path) !== 'other';
}

/** Hidden from the tree (still synced, so guides can reference them). */
export function isHidden(path: string): boolean {
  return path.split('/').some((seg) => seg.startsWith('.'));
}
