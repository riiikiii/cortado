import { describe, expect, it } from 'vitest';
import { kindOf, parseVaultUrl, resolveRelative, vaultUrl } from './paths';

describe('paths', () => {
  it('resolves relative links against the current file', () => {
    expect(resolveRelative('Guides/a.html', 'assets/x.css')).toBe('Guides/assets/x.css');
    expect(resolveRelative('Guides/a.html', '../Welcome.md')).toBe('Welcome.md');
    expect(resolveRelative('a/b/c.md', './d.md')).toBe('a/b/d.md');
    expect(resolveRelative('a/b/c.md', '/root.md')).toBe('root.md');
  });

  it('round-trips vault URLs with spaces and unicode', () => {
    const url = vaultUrl('v1', 'Guides/Colour Theory – café.html', '/cortado/');
    expect(url).toBe('/cortado/vault/v1/Guides/Colour%20Theory%20%E2%80%93%20caf%C3%A9.html');
    expect(parseVaultUrl(url, '/cortado/')).toEqual({ vaultId: 'v1', path: 'Guides/Colour Theory – café.html' });
    expect(parseVaultUrl('/cortado/index.html', '/cortado/')).toBeNull();
  });

  it('classifies files', () => {
    expect(kindOf('x/Guide.HTML')).toBe('html');
    expect(kindOf('note.md')).toBe('md');
    expect(kindOf('pic.webp')).toBe('image');
    expect(kindOf('archive.zip')).toBe('other');
  });
});
