const PATHS = {
  sidebar: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 3v18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  sync: 'M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M18.5 2v4h-4M5.5 22v-4h4',
  close: 'M6 6l12 12M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  md: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  html: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M10 12l-2 2 2 2M14 12l2 2-2 2',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  pdf: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M8.5 17v-4h1.3a1.2 1.2 0 0 1 0 2.4H8.5M13 13v4h.8a1.6 1.6 0 0 0 1.6-1.6v-.8a1.6 1.6 0 0 0-1.6-1.6z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
  vault: 'M4 4h16v16H4zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 9V7M12 17v-2M9 12H7M17 12h-2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  back: 'M15 6l-6 6 6 6',
  check: 'M5 12l5 5L20 7',
  reload: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  home: 'M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z',
  outline: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  'check-circle': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.2 12.3l2.6 2.6 5-5.4',
  circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  settings: 'M3 6h11M18 6h3M3 12h5M12 12h9M3 18h13M20 18h1M16 4v4M10 10v4M18 16v4',
  type: 'M3 19 8 5l5 14M4.8 14h6.4M20.5 19v-6.2M20.5 15.6a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
  book: 'M2.5 4.5h6a3.5 3.5 0 0 1 3.5 3.5v12.5a2.6 2.6 0 0 0-2.6-2.6H2.5zM21.5 4.5h-6A3.5 3.5 0 0 0 12 8v12.5a2.6 2.6 0 0 1 2.6-2.6h6.9z',
  play: 'M8 5.2v13.6a.7.7 0 0 0 1.1.6l10.3-6.8a.7.7 0 0 0 0-1.2L9.1 4.6a.7.7 0 0 0-1.1.6z',
  sparkle: 'M12 3.5l1.9 5 5.1 1.9-5.1 1.9-1.9 5-1.9-5L5 10.4l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a14.5 14.5 0 0 1 20 0M12 19.5h.01',
} as const;

export type IconName = keyof typeof PATHS;

const PAGE = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z';
// A soft tinted fill under some icons, which gives them a friendlier, more solid look.
const DUO: Partial<Record<IconName, string>> = {
  folder: PATHS.folder,
  md: PAGE,
  html: PAGE,
  pdf: PAGE,
  file: PAGE,
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  home: PATHS.home,
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z',
  sidebar: 'M5 3h4v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  'check-circle': PATHS.circle,
  clock: PATHS.circle,
  book: PATHS.book,
};

export function Icon({ name, size = 20, className, strokeWidth = 2 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  const duo = DUO[name];
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {duo && <path d={duo} fill="currentColor" stroke="none" opacity={0.16} />}
      <path d={PATHS[name] ?? PATHS.file} />
    </svg>
  );
}

export function fileIcon(kind: string): IconName {
  return kind === 'md' ? 'md' : kind === 'html' ? 'html' : kind === 'image' ? 'image' : kind === 'pdf' ? 'pdf' : 'file';
}

/** Lesson status: an empty ring, a partly filled ring, or a filled check. */
export function StatusDot({ state, ratio = 0, size = 18 }: { state: 'done' | 'started' | 'new'; ratio?: number; size?: number }) {
  if (state === 'done') {
    return (
      <svg className="status status-done" width={size} height={size} viewBox="0 0 24 24" aria-label="Completed" role="img">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M7.8 12.4l2.8 2.8 5.6-6" fill="none" stroke="var(--on-done)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === 'new') return <ProgressRing value={0} size={size} stroke={2.2} className="status status-new" />;
  // In progress: a little pie that fills as you read (a ring arc looked like a loading spinner).
  const a = Math.min(0.92, Math.max(0.15, ratio)) * 2 * Math.PI;
  const x = 12 + 6.5 * Math.sin(a);
  const y = 12 - 6.5 * Math.cos(a);
  return (
    <svg className="status status-started" width={size} height={size} viewBox="0 0 24 24" aria-label="In progress" role="img">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d={`M12 12V5.5A6.5 6.5 0 ${a > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`} fill="currentColor" />
    </svg>
  );
}

export function ProgressRing({ value, size = 44, stroke = 4, className, children }: { value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={`ring ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        {value > 0 && (
          <circle
            className="ring-value"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(1, value))}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {children && <span className="ring-label">{children}</span>}
    </span>
  );
}
