import { create } from 'zustand';

export type ThemePref = 'system' | 'light' | 'sepia' | 'dark';
export type Theme = Exclude<ThemePref, 'system'>;
export type ReadFont = 'sans' | 'serif';
export type ReadWidth = 'narrow' | 'medium' | 'wide';

export interface Prefs {
  theme: ThemePref;
  /** Body text size for notes, in px. */
  textSize: number;
  font: ReadFont;
  width: ReadWidth;
}

// Also read by the inline script in index.html, which sets the theme before first paint.
const KEY = 'cortado.prefs';
export const TEXT_SIZES = [15, 16, 17, 18, 20, 22, 24];
const DEFAULTS: Prefs = { theme: 'system', textSize: 18, font: 'sans', width: 'medium' };
const WIDTHS: Record<ReadWidth, string> = { narrow: '600px', medium: '720px', wide: '880px' };
const THEME_COLORS: Record<Theme, string> = { light: '#fbf8f4', sepia: '#f4ecdc', dark: '#1a1512' };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

const darkQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

export function resolveTheme(pref: ThemePref): Theme {
  return pref === 'system' ? (darkQuery?.matches ? 'dark' : 'light') : pref;
}

interface PrefsState extends Prefs {
  /** The theme in effect, after following the system setting. */
  resolved: Theme;
  set(patch: Partial<Prefs>): void;
}

export const usePrefs = create<PrefsState>((set, get) => {
  const initial = load();
  return {
    ...initial,
    resolved: resolveTheme(initial.theme),
    set(patch) {
      const next = { ...get(), ...patch };
      const prefs: Prefs = { theme: next.theme, textSize: next.textSize, font: next.font, width: next.width };
      localStorage.setItem(KEY, JSON.stringify(prefs));
      set({ ...prefs, resolved: resolveTheme(prefs.theme) });
    },
  };
});

function apply(p: PrefsState) {
  const root = document.documentElement;
  root.dataset.theme = p.resolved;
  root.style.setProperty('--read-size', `${p.textSize}px`);
  root.style.setProperty('--read-width', WIDTHS[p.width]);
  root.style.setProperty('--read-font', p.font === 'serif' ? 'var(--serif)' : 'var(--font)');
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    m.content = THEME_COLORS[p.resolved];
    m.removeAttribute('media');
  }
}

if (typeof document !== 'undefined') {
  apply(usePrefs.getState());
  usePrefs.subscribe(apply);
  darkQuery?.addEventListener('change', () => {
    const s = usePrefs.getState();
    if (s.theme === 'system') usePrefs.setState({ resolved: resolveTheme('system') });
  });
}
