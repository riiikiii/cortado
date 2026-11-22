// Plain-text extraction and full-text search over the vault's notes and guides.
// Kept free of DOM APIs so it runs in tests and could move to a worker later.

import { stripFrontMatter } from '../markdown/strip';
import { kindOf, stem } from '../util/paths';

export interface DocText {
  path: string;
  title: string;
  words: number;
  /** Plain text with whitespace collapsed. */
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '-', ndash: '-', hellip: '...' };

function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').replace(/ ([.,;:!?])(?=\s|$)/g, '$1').trim();

export function htmlToText(html: string): { title?: string; text: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const body = html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<(script|style|noscript|template|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return {
    title: title ? collapse(decodeEntities(title.replace(/<[^>]+>/g, ''))) || undefined : undefined,
    text: collapse(decodeEntities(body)),
  };
}

export function markdownToText(md: string): { title?: string; text: string } {
  const src = stripFrontMatter(md);
  const title = /^#\s+(.+?)\s*#*\s*$/m.exec(src)?.[1];
  const text = src
    .replace(/^```.*$/gm, ' ')
    .replace(/!\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, ' ')
    .replace(/\[\[([^\]|#]*)(#[^\]|]*)?\|([^\]]+)\]\]/g, '$3')
    .replace(/\[\[([^\]|#]*)#?([^\]|]*)\]\]/g, (_m, a: string, b: string) => (b ? `${a} ${b}` : a))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[ \t]*(#{1,6}|>|[-*+]|\d+\.)[ \t]+(\[[ xX]\][ \t]+)?/gm, '')
    .replace(/[*_~`|]+/g, ' ')
    .replace(/^[-=]{3,}\s*$/gm, ' ');
  return { title: title?.replace(/[*_`]/g, '').trim(), text: collapse(decodeEntities(text)) };
}

export function extractText(path: string, raw: string): DocText {
  const kind = kindOf(path);
  const { title, text } = kind === 'html' ? htmlToText(raw) : kind === 'md' ? markdownToText(raw) : { title: undefined, text: collapse(raw) };
  return { path, title: title || stem(path), text, words: text ? text.split(' ').length : 0 };
}

/** Minutes to read at a relaxed study pace. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export interface SearchHit {
  path: string;
  title: string;
  /** Text around the first match, split so matched parts can be highlighted. */
  snippet: { text: string; match: boolean }[];
  score: number;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function searchDocs(docs: Iterable<DocText>, query: string, limit = 20): SearchHit[] {
  const terms = [...new Set(query.toLowerCase().split(/\s+/).filter((t) => t.length > 1))];
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const lower = d.text.toLowerCase();
    const title = d.title.toLowerCase();
    let score = 0;
    let ok = true;
    for (const t of terms) {
      let n = 0;
      for (let i = lower.indexOf(t); i >= 0 && n < 20; i = lower.indexOf(t, i + t.length)) n++;
      const inTitle = title.includes(t);
      if (!n && !inTitle) {
        ok = false;
        break;
      }
      score += Math.min(n, 20) + (inTitle ? 25 : 0);
    }
    if (!ok) continue;
    hits.push({ path: d.path, title: d.title, snippet: makeSnippet(d.text, lower, terms), score });
  }
  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return hits.slice(0, limit);
}

function makeSnippet(text: string, lower: string, terms: string[]): SearchHit['snippet'] {
  let first = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (first < 0 || i < first)) first = i;
  }
  if (first < 0) return [{ text: text.slice(0, 140) + (text.length > 140 ? '...' : ''), match: false }];
  let start = Math.max(0, first - 50);
  if (start > 0) start = text.indexOf(' ', start) + 1 || start;
  let end = Math.min(text.length, first + 110);
  if (end < text.length) end = text.lastIndexOf(' ', end) > first ? text.lastIndexOf(' ', end) : end;
  const slice = text.slice(start, end);
  const re = new RegExp(`(${terms.map(escapeRe).join('|')})`, 'gi');
  // Splitting on a capturing group alternates plain text and matches.
  const parts = slice
    .split(re)
    .map((p, i) => ({ text: p, match: i % 2 === 1 }))
    .filter((p) => p.text);
  if (start > 0) parts.unshift({ text: '...', match: false });
  if (end < text.length) parts.push({ text: '...', match: false });
  return parts;
}
