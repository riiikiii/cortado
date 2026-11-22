import { TEXT_SIZES, usePrefs, type ReadFont, type ReadWidth, type ThemePref } from '../state/prefs';

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'system', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
];

/** Theme, text size, font and line width. Used in the reader's Aa menu and in Settings. */
export function Appearance({ compact }: { compact?: boolean }) {
  const p = usePrefs();
  const sizeIdx = Math.max(0, TEXT_SIZES.indexOf(p.textSize));
  return (
    <div className={`appearance ${compact ? 'compact' : ''}`}>
      <div className="theme-swatches" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={p.theme === t.id}
            className={`swatch swatch-${t.id} ${p.theme === t.id ? 'on' : ''}`}
            onClick={() => p.set({ theme: t.id })}
          >
            <span className="swatch-chip">Aa</span>
            <span className="swatch-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="pref-row">
        <span className="pref-label">Text size</span>
        <div className="stepper">
          <button aria-label="Smaller text" disabled={sizeIdx === 0} onClick={() => p.set({ textSize: TEXT_SIZES[sizeIdx - 1] })}>
            <span style={{ fontSize: 13 }}>A</span>
          </button>
          <span className="stepper-dots" aria-hidden="true">
            {TEXT_SIZES.map((s, i) => (
              <i key={s} className={i <= sizeIdx ? 'on' : ''} />
            ))}
          </span>
          <button aria-label="Larger text" disabled={sizeIdx === TEXT_SIZES.length - 1} onClick={() => p.set({ textSize: TEXT_SIZES[sizeIdx + 1] })}>
            <span style={{ fontSize: 19 }}>A</span>
          </button>
        </div>
      </div>

      <div className="pref-row">
        <span className="pref-label">Font</span>
        <Segmented<ReadFont>
          value={p.font}
          onChange={(font) => p.set({ font })}
          options={[
            { id: 'sans', label: <span style={{ fontFamily: 'var(--font)' }}>Sans</span> },
            { id: 'serif', label: <span style={{ fontFamily: 'var(--serif)' }}>Serif</span> },
          ]}
        />
      </div>

      <div className="pref-row stacked">
        <span className="pref-label">Line width</span>
        <Segmented<ReadWidth>
          value={p.width}
          onChange={(width) => p.set({ width })}
          options={[
            { id: 'narrow', label: <WidthLabel lines={[10, 8, 10]} text="Narrow" /> },
            { id: 'medium', label: <WidthLabel lines={[14, 11, 14]} text="Normal" /> },
            { id: 'wide', label: <WidthLabel lines={[18, 15, 18]} text="Wide" /> },
          ]}
        />
      </div>
    </div>
  );
}

/** A label with little text lines that get longer with the setting, so the choice is visible. */
function WidthLabel({ lines, text }: { lines: number[]; text: string }) {
  return (
    <span className="width-label">
      <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">
        {lines.map((w, i) => (
          <rect key={i} x={(20 - w) / 2} y={1 + i * 5} width={w} height="2" rx="1" fill="currentColor" />
        ))}
      </svg>
      {text}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: React.ReactNode }[];
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
