import type { Prefs, ReadWidth, Theme } from '../state/prefs';

const STYLE_ID = 'cortado-prefs';

const HTML_WIDTHS: Record<ReadWidth, string> = {
  narrow: '680px',
  medium: '960px',
  wide: '100%',
};

const SANS_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF_STACK = 'ui-serif, "New York", "Iowan Old Style", Charter, "Source Serif Pro", Georgia, "Times New Roman", serif';

function themeCss(theme: Theme): string {
  if (theme === 'dark') {
    return `
:root {
  color-scheme: dark;
  --bg: #14100e; --surface: #1d1714; --surface-2: #261e1a; --surface-3: #322722;
  --ink: #f7efe6; --text: #e3d6c8; --muted: #a69587; --line: #3a2e27;
  --coral: #ee8c68; --coral-bg: #2b1812; --coral-line: #5b3022;
  --code-bg: #0f0b09; --code-text: #f3eae0; --code-line: #2a201b;
  --link: #9ccac0;
  --shadow: 0 1px 2px rgba(0,0,0,.35), 0 6px 22px rgba(0,0,0,.3);
  --svg-node: #221b17; --svg-node-2: #2c231e; --svg-stroke: #87bbb2;
  --svg-text: #f7efe6; --svg-muted: #a69587; --svg-accent: #a3c1ad;
  --svg-db: #213735; --svg-warn: #ee8c68;
}
h2 .num, .cb-state { background: var(--surface-3); color: var(--t300, #a3c1ad); }
.climb .lv, .verdict b, .range output, .btn.ghost, .count, .mini .v, #toc .grp { color: var(--t300, #a3c1ad); }
.callout.tip { background: linear-gradient(180deg, #1f2e2c, var(--surface)); }
.callout.model .h, .callout.try .h { color: var(--t300, #a3c1ad); }
.verdict { background: var(--surface-2); border-color: var(--line); }
.code .bar, figure.code figcaption, .code figcaption, pre[data-lang]::before { background: #16100e; }
.q button.right { background: #203b38; color: #fbf6f0; }
`;
  }

  if (theme === 'sepia') {
    return `
:root {
  color-scheme: light;
  --bg: #f4ece0; --surface: #fbf6ec; --surface-2: #ebe0cf; --surface-3: #e0d2bc;
  --ink: #2a1e15; --text: #3a2b20; --muted: #76614d; --line: #d9c8b0;
  --coral: #b85633; --coral-bg: #f6e7dc; --coral-line: #e4bda6;
  --code-bg: #1c1512; --code-text: #f3eae0; --code-line: #332721;
  --link: #215350;
  --shadow: 0 1px 2px rgba(42,30,21,.07), 0 6px 20px rgba(42,30,21,.08);
  --svg-node: #fbf6ec; --svg-node-2: #ebe0cf; --svg-stroke: #275f5c;
  --svg-text: #2a1e15; --svg-muted: #76614d; --svg-accent: #4c8a84;
  --svg-db: #dceae4; --svg-warn: #b85633;
}
h2 .num { background: var(--t100, #e3f0ea); color: var(--t700, #2b6b68); }
.climb .lv, .range output, .btn.ghost, .count, .mini .v, #toc .grp { color: var(--t700, #2b6b68); }
.verdict { background: var(--t50, #f2f8f5); border-color: var(--t200, #cbe0d5); }
.verdict b { color: var(--t800, #225452); }
.callout.tip { background: linear-gradient(180deg, #edf4ef, var(--surface)); }
.code .bar, figure.code figcaption, .code figcaption, pre[data-lang]::before { background: #271e19; }
`;
  }

  return `
:root {
  color-scheme: light;
  --bg: #faf6f0; --surface: #ffffff; --surface-2: #f2ebe1; --surface-3: #e6dccf;
  --ink: #211813; --text: #382a22; --muted: #705f54; --line: #e3d7c8;
  --coral: #b85633; --coral-bg: #fdf2ec; --coral-line: #efc8b4;
  --code-bg: #1c1512; --code-text: #f3eae0; --code-line: #332721;
  --link: #2b6b68;
  --shadow: 0 1px 2px rgba(33,24,19,.06), 0 6px 20px rgba(33,24,19,.07);
  --svg-node: #ffffff; --svg-node-2: #f2ebe1; --svg-stroke: #2b6b68;
  --svg-text: #211813; --svg-muted: #705f54; --svg-accent: #5ea099;
  --svg-db: #e3f0ea; --svg-warn: #b85633;
}
h2 .num { background: var(--t100, #e3f0ea); color: var(--t700, #2b6b68); }
.climb .lv, .range output, .btn.ghost, .count, .mini .v, #toc .grp { color: var(--t700, #2b6b68); }
.verdict { background: var(--t50, #f2f8f5); border-color: var(--t200, #cbe0d5); }
.verdict b { color: var(--t800, #225452); }
.callout.tip { background: linear-gradient(180deg, var(--t50, #f2f8f5), var(--surface)); }
.code .bar, figure.code figcaption, .code figcaption, pre[data-lang]::before { background: #271e19; }
`;
}

export function buildHtmlPrefsCss(prefs: Pick<Prefs, 'textSize' | 'font' | 'width'> & { resolved: Theme }): string {
  const scale = prefs.textSize / 18;
  const px = (base: number) => `${Math.round(base * scale * 10) / 10}px`;
  const width = HTML_WIDTHS[prefs.width] ?? '100%';
  const fontCss =
    prefs.font === 'serif'
      ? `:root { --sans: ${SERIF_STACK} !important; }\nbody { font-family: ${SERIF_STACK} !important; }`
      : `:root { --sans: ${SANS_STACK} !important; }\nbody { font-family: ${SANS_STACK} !important; }`;

  return `${themeCss(prefs.resolved)}
${fontCss}
body { font-size: ${prefs.textSize}px !important; }
h2 { font-size: ${px(31)} !important; }
.level h2 { font-size: ${px(34)} !important; }
h3 { font-size: ${px(21)} !important; }
.lead, .hero p.lede, .hero .subtitle { font-size: ${px(20)} !important; }
table, td, .callout, .note, .tip, .warn, .verdict, .q .why, .legend div, .sources li, .mini p, .card p, .panel p, .timeline li, dl.gloss dd { font-size: ${px(15.5)} !important; }
figcaption, .small, footer, #toc a { font-size: ${px(14.5)} !important; }
pre, pre code, .code pre, .code pre code { font-size: ${px(13.4)} !important; }
.wrap, .layout, .shell, .head, .hero-in, .hero-inner, main, footer, .footer .shell, .foot .wrap, footer .wrap {
  max-width: ${width} !important;
  margin-inline: auto !important;
}
`;
}

/** Sync Cortado's reading preferences (theme, text size, font, width) into an HTML guide document. */
export function applyPrefsToDocument(doc: Document, prefs: Pick<Prefs, 'textSize' | 'font' | 'width'> & { resolved: Theme }) {
  doc.documentElement.dataset.theme = prefs.resolved;
  let style = doc.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ID;
    (doc.head ?? doc.documentElement).append(style);
  }
  style.textContent = buildHtmlPrefsCss(prefs);
}
