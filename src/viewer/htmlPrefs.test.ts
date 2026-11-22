import { describe, expect, it } from 'vitest';
import { applyPrefsToDocument, buildHtmlPrefsCss } from './htmlPrefs';

describe('buildHtmlPrefsCss', () => {
  it('scales text size and code size proportionally', () => {
    const css = buildHtmlPrefsCss({ resolved: 'light', textSize: 24, font: 'sans', width: 'wide' });
    expect(css).toContain('body { font-size: 24px !important; }');
    expect(css).toContain('pre, pre code, .code pre, .code pre code { font-size: 17.9px !important; }');
    expect(css).toContain('max-width: 100% !important;');
  });

  it('switches to serif font stack and narrow width', () => {
    const css = buildHtmlPrefsCss({ resolved: 'sepia', textSize: 16, font: 'serif', width: 'narrow' });
    expect(css).toContain('--bg: #f4ece0;');
    expect(css).toContain('ui-serif');
    expect(css).toContain('max-width: 680px !important;');
  });

  it('applies dark coffee theme tokens', () => {
    const css = buildHtmlPrefsCss({ resolved: 'dark', textSize: 18, font: 'sans', width: 'medium' });
    expect(css).toContain('color-scheme: dark;');
    expect(css).toContain('--bg: #14100e;');
    expect(css).toContain('max-width: 960px !important;');
  });

  it('creates and updates a single <style id="cortado-prefs"> element', () => {
    const state: { styleEl: { id: string; textContent: string } | null } = { styleEl: null };
    const doc = {
      documentElement: { dataset: {} as Record<string, string> },
      head: {
        append(el: { id: string; textContent: string }) {
          state.styleEl = el;
        },
      },
      getElementById(id: string) {
        return state.styleEl && state.styleEl.id === id ? state.styleEl : null;
      },
      createElement() {
        return { id: '', textContent: '' };
      },
    } as unknown as Document;

    applyPrefsToDocument(doc, { resolved: 'light', textSize: 18, font: 'sans', width: 'wide' });
    expect(doc.documentElement.dataset.theme).toBe('light');
    expect(state.styleEl?.id).toBe('cortado-prefs');
    expect(state.styleEl?.textContent).toContain('body { font-size: 18px !important; }');

    const first = state.styleEl;
    applyPrefsToDocument(doc, { resolved: 'dark', textSize: 22, font: 'serif', width: 'narrow' });
    expect(state.styleEl).toBe(first);
    expect(doc.documentElement.dataset.theme).toBe('dark');
    expect(state.styleEl?.textContent).toContain('body { font-size: 22px !important; }');
  });
});
