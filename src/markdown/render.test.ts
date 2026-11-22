import { describe, expect, it } from 'vitest';
import { createRenderer, createWikilinkResolver } from './render';

const paths = ['Welcome.md', 'Notes/Ideas.md', 'Guides/Interactive Sorting.html', 'Guides/assets/pic.png', 'Archive/Old/Ideas.md'];
const resolve = createWikilinkResolver(paths);

describe('wikilinks', () => {
  it('resolves by name, preferring markdown and shorter paths', () => {
    expect(resolve('Welcome')).toBe('Welcome.md');
    expect(resolve('interactive sorting')).toBe('Guides/Interactive Sorting.html');
    expect(resolve('Ideas')).toBe('Notes/Ideas.md');
    expect(resolve('Old/Ideas')).toBe('Archive/Old/Ideas.md');
    expect(resolve('pic.png')).toBe('Guides/assets/pic.png');
    expect(resolve('Nope')).toBeNull();
  });
});

describe('render', () => {
  const render = createRenderer({ vaultId: 'v', path: 'Notes/Ideas.md', resolveWikilink: resolve, base: '/' });

  it('renders wikilinks, aliases, headings and embeds', () => {
    const html = render('[[Welcome]] [[Interactive Sorting|demo]] [[Ideas#Later]] [[Missing]] ![[pic.png]]');
    expect(html).toContain('href="/vault/v/Welcome.md" data-vault-path="Welcome.md"');
    expect(html).toContain('>demo</a>');
    expect(html).toContain('href="/vault/v/Notes/Ideas.md#later"');
    expect(html).toContain('class="wikilink unresolved"');
    expect(html).toContain('<img src="/vault/v/Guides/assets/pic.png"');
  });

  it('rewrites relative links and images, leaves external links alone', () => {
    const html = render('[w](../Welcome.md) ![i](../Guides/assets/pic.png) [x](https://example.com)');
    expect(html).toContain('href="/vault/v/Welcome.md" data-vault-path="Welcome.md"');
    expect(html).toContain('src="/vault/v/Guides/assets/pic.png"');
    expect(html).toContain('href="https://example.com" target="_blank"');
  });

  it('strips front matter, adds heading ids, marks maths but not prices', () => {
    const html = render('---\ntags: [a]\n---\n# Hello World\n\nCosts $5 and $x^2$.\n');
    expect(html).not.toContain('tags:');
    expect(html).toContain('<h1 id="hello-world">');
    expect(html).toContain('<span class="math" data-math="inline">x^2</span>');
    expect(html).toContain('Costs $5');
  });
});
