import MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import hljs from 'highlight.js/lib/common';
import { isDocument, kindOf, resolveRelative, vaultUrl } from '../util/paths';
import { stripFrontMatter } from './strip';

export { stripFrontMatter };

export interface RenderContext {
  vaultId: string;
  /** Path of the note being rendered. */
  path: string;
  /** Resolve a wikilink target ("Note", "folder/Note", "image.png") to a vault path. */
  resolveWikilink: (target: string) => string | null;
  base?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');

/** Inline rule for [[target#heading|alias]] and ![[embed]]. */
function wikilinkRule(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  let pos = state.pos;
  const embed = src.charCodeAt(pos) === 0x21; /* ! */
  if (embed) pos++;
  if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
  const end = src.indexOf(']]', pos + 2);
  if (end < 0) return false;
  const inner = src.slice(pos + 2, end);
  if (!inner || inner.includes('\n') || inner.includes('[')) return false;
  if (!silent) {
    const token = state.push('wikilink', '', 0);
    const [targetPart, alias] = inner.split('|');
    const [target, heading] = targetPart.split('#');
    token.meta = { target: target.trim(), heading: heading?.trim(), alias: alias?.trim(), embed };
  }
  state.pos = end + 2;
  return true;
}

/** Inline $math$ (not $ followed by a space or digit, to avoid prices like $5). */
function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const src = state.src;
  const start = state.pos;
  if (src.charCodeAt(start) !== 0x24 /* $ */) return false;
  const next = src.charAt(start + 1);
  if (!next || next === '$' || /\s|\d/.test(next)) return false;
  let end = start + 1;
  while ((end = src.indexOf('$', end)) >= 0) {
    if (src.charCodeAt(end - 1) !== 0x5c /* \ */ && !/\s/.test(src.charAt(end - 1))) break;
    end++;
  }
  if (end < 0) return false;
  if (!silent) {
    const token = state.push('math_inline', '', 0);
    token.content = src.slice(start + 1, end);
  }
  state.pos = end + 1;
  return true;
}

/** Block $$ ... $$ math. */
function mathBlockRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const lineStart = state.bMarks[startLine] + state.tShift[startLine];
  const lineEnd = state.eMarks[startLine];
  const first = state.src.slice(lineStart, lineEnd);
  if (!first.startsWith('$$')) return false;
  if (silent) return true;
  let content = first.slice(2);
  let line = startLine;
  let closed = content.trimEnd().endsWith('$$');
  if (closed) content = content.trimEnd().slice(0, -2);
  while (!closed && ++line < endLine) {
    const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
    if (text.trimEnd().endsWith('$$')) {
      content += '\n' + text.trimEnd().slice(0, -2);
      closed = true;
    } else content += '\n' + text;
  }
  const token = state.push('math_block', 'div', 0);
  token.content = content.trim();
  token.map = [startLine, line + 1];
  state.line = line + 1;
  return true;
}

export function createRenderer(ctx: RenderContext) {
  const base = ctx.base;
  const md: MarkdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code, lang) {
      if (lang === 'mermaid') return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch {
          /* fall through */
        }
      }
      return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
    },
  })
    .use(footnote)
    .use(taskLists, { enabled: false, label: true });

  md.inline.ruler.before('link', 'wikilink', wikilinkRule);
  md.inline.ruler.after('escape', 'math_inline', mathInlineRule);
  md.block.ruler.before('fence', 'math_block', mathBlockRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

  md.renderer.rules.math_inline = (tokens, idx) => `<span class="math" data-math="inline">${escapeHtml(tokens[idx].content)}</span>`;
  md.renderer.rules.math_block = (tokens, idx) => `<div class="math" data-math="block">${escapeHtml(tokens[idx].content)}</div>\n`;

  md.renderer.rules.wikilink = (tokens, idx) => {
    const { target, heading, alias, embed } = tokens[idx].meta as {
      target: string;
      heading?: string;
      alias?: string;
      embed: boolean;
    };
    const path = target ? ctx.resolveWikilink(target) : ctx.path;
    const label = escapeHtml(alias || (heading && !target ? heading : target + (heading ? ` › ${heading}` : '')));
    if (!path) return `<a class="wikilink unresolved" title="Not found in vault">${label}</a>`;
    const hash = heading ? `#${slugify(heading)}` : '';
    const url = vaultUrl(ctx.vaultId, path, base);
    if (embed && kindOf(path) === 'image') return `<img src="${url}" alt="${escapeHtml(alias || target)}">`;
    return `<a class="wikilink" href="${url}${hash}" data-vault-path="${escapeHtml(path)}" data-hash="${escapeHtml(hash)}">${label}</a>`;
  };

  // Rewrite relative links and images to vault URLs.
  const defaultLinkOpen = md.renderer.rules.link_open ?? ((t, i, o, _e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const tok = tokens[idx];
    const href = tok.attrGet('href') ?? '';
    if (href && !isExternal(href) && !href.startsWith('#')) {
      const [rawPath, hash = ''] = href.split('#');
      const path = resolveRelative(ctx.path, safeDecode(rawPath));
      tok.attrSet('href', vaultUrl(ctx.vaultId, path, base) + (hash ? `#${hash}` : ''));
      if (isDocument(path)) {
        tok.attrSet('data-vault-path', path);
        if (hash) tok.attrSet('data-hash', `#${hash}`);
      }
    } else if (isExternal(href)) {
      tok.attrSet('target', '_blank');
      tok.attrSet('rel', 'noopener');
    }
    return defaultLinkOpen(tokens, idx, opts, env, self);
  };

  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const tok = tokens[idx];
    const src = tok.attrGet('src') ?? '';
    if (src && !isExternal(src) && !src.startsWith('data:')) {
      tok.attrSet('src', vaultUrl(ctx.vaultId, resolveRelative(ctx.path, safeDecode(src)), base));
    }
    tok.attrSet('loading', 'lazy');
    return defaultImage(tokens, idx, opts, env, self);
  };

  // Heading ids so #anchors and [[Note#Heading]] work.
  md.core.ruler.push('heading_ids', (state) => {
    const seen = new Map<string, number>();
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'heading_open') continue;
      let slug = slugify(tokens[i + 1].content);
      const n = seen.get(slug) ?? 0;
      seen.set(slug, n + 1);
      if (n) slug += `-${n}`;
      tokens[i].attrSet('id', slug);
    }
  });

  return (src: string) => md.render(stripFrontMatter(src));
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Build a wikilink resolver over every path in the vault. Matches Obsidian's rules loosely:
 * exact path first, then by file name (with or without extension), preferring .md, then .html,
 * then the shortest path.
 */
export function createWikilinkResolver(paths: string[]) {
  const byPath = new Map(paths.map((p) => [p.toLowerCase(), p]));
  const byName = new Map<string, string[]>();
  for (const p of paths) {
    const name = p.slice(p.lastIndexOf('/') + 1).toLowerCase();
    const dot = name.lastIndexOf('.');
    for (const key of dot > 0 ? [name, name.slice(0, dot)] : [name]) {
      const list = byName.get(key) ?? [];
      list.push(p);
      byName.set(key, list);
    }
  }
  const rank = (p: string) => {
    const k = kindOf(p);
    return (k === 'md' ? 0 : k === 'html' ? 1 : 2) * 1000 + p.length;
  };
  return (target: string): string | null => {
    const t = target.trim().replace(/^\/+/, '').toLowerCase();
    for (const candidate of [t, `${t}.md`, `${t}.html`]) {
      const hit = byPath.get(candidate);
      if (hit) return hit;
    }
    const name = t.slice(t.lastIndexOf('/') + 1);
    const list = byName.get(name);
    if (!list?.length) return null;
    const suffix = t.includes('/') ? t : null;
    const filtered = suffix ? list.filter((p) => p.toLowerCase().includes(suffix)) : list;
    return [...(filtered.length ? filtered : list)].sort((a, b) => rank(a) - rank(b))[0];
  };
}
