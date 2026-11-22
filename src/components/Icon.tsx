import { useState } from 'react';

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
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  layers: 'M12 3 3 7.5l9 4.5 9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5',
  drive: 'M4 15.5 8.5 7.7h7L20 15.5 17.7 19.5H6.3zM8.5 7.7 13 15.5H4M15.5 7.7 11 15.5M17.7 19.5 13 15.5',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
  copy: 'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  key: 'M14.5 3.5a6 6 0 1 1-5.6 8.2L3 17.6V21h3.4v-2.3h2.3v-2.3H11l1.3-1.3a6 6 0 0 1 2.2-11.6zM16.5 7.5h.01',
  sparkle: 'M12 3.5l1.9 5 5.1 1.9-5.1 1.9-1.9 5-1.9-5L5 10.4l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a14.5 14.5 0 0 1 20 0M12 19.5h.01',
  google:
    'M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3A9 9 0 0 0 21 12.2zM12 21a8.9 8.9 0 0 0 6.1-2.2l-3-2.3a5.5 5.5 0 0 1-8.2-2.9H3.8v2.4A9 9 0 0 0 12 21zM6.9 13.6a5.4 5.4 0 0 1 0-3.4V7.8H3.8a9 9 0 0 0 0 8.2zM12 6.6c1.4 0 2.6.5 3.6 1.4l2.6-2.6A9 9 0 0 0 3.8 7.8l3.1 2.4A5.4 5.4 0 0 1 12 6.6z',
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
  layers: 'M12 3 3 7.5l9 4.5 9-4.5z',
  key: 'M14.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12z',
  drive: 'M4 15.5 8.5 7.7h7L20 15.5 17.7 19.5H6.3z',
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

/** Google's multi-colour "G", for sign-in buttons. */
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** A Google account's photo, or its initial on a tinted circle. */
export function Avatar({ name, photo, size = 32 }: { name: string; photo?: string; size?: number }) {
  // Photos come from Google, so fall back to the initial when offline.
  const [failed, setFailed] = useState(false);
  if (photo && !failed) return <img className="avatar" src={photo} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  return (
    <span className="avatar avatar-initial" style={{ width: size, height: size, fontSize: size * 0.45, background: `hsl(${hue(name)} 45% 55%)` }}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function hue(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
