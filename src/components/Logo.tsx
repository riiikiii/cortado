/**
 * Cortado's mascot: a cheerful little coffee cup with steam. `face` adds eyes, cheeks and a
 * smile; small sizes leave it off so the cup stays readable. `steam` animates gently.
 */
export function CupLogo({ size = 40, face = true, steam = true, animated = false, className }: { size?: number; face?: boolean; steam?: boolean; animated?: boolean; className?: string }) {
  return (
    <svg className={`cup-logo ${animated ? 'animated' : ''} ${className ?? ''}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {steam && (
        <g className="cup-steam" fill="none" stroke="#d39a6c" strokeWidth="5.5" strokeLinecap="round">
          <path d="M47 33c-6-6 6-10 0-17" />
          <path d="M61 31c-7-7 7-11 0-19" />
          <path d="M75 33c-6-6 6-10 0-17" />
        </g>
      )}
      <ellipse cx="60" cy="99" rx="44" ry="9.5" fill="#ecd2b1" stroke="#3b2417" strokeWidth="4.5" />
      <path d="M90 55c17-3 21 21 1 27" fill="none" stroke="#3b2417" strokeWidth="13" strokeLinecap="round" />
      <path d="M90 55c17-3 21 21 1 27" fill="none" stroke="#fff7ec" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M24 44h72v20c0 20-15 33-36 33S24 84 24 64z" fill="#fff7ec" stroke="#3b2417" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M30 70c2 12 12 21 30 22" fill="none" stroke="#f0dcc4" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="60" cy="44" rx="36" ry="8.5" fill="#7d4527" stroke="#3b2417" strokeWidth="4.5" />
      <path d="M41 43.5c6-3 22-4 30-1" fill="none" stroke="#d39a6c" strokeWidth="3.5" strokeLinecap="round" />
      {face && (
        <g>
          <ellipse cx="48" cy="63" rx="4" ry="5.2" fill="#3b2417" />
          <ellipse cx="72" cy="63" rx="4" ry="5.2" fill="#3b2417" />
          <circle cx="49.4" cy="61.2" r="1.5" fill="#fff" />
          <circle cx="73.4" cy="61.2" r="1.5" fill="#fff" />
          <ellipse cx="39" cy="72" rx="5.5" ry="3.3" fill="#f39a8f" opacity="0.75" />
          <ellipse cx="81" cy="72" rx="5.5" ry="3.3" fill="#f39a8f" opacity="0.75" />
          <path d="M53.5 72.5q6.5 6.5 13 0" fill="none" stroke="#3b2417" strokeWidth="3.6" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/** The cup on a warm latte tile, as used for the app icon and the sidebar. */
export function CupTile({ size = 30, face }: { size?: number; face?: boolean }) {
  return (
    <span className="cup-tile" style={{ width: size, height: size, borderRadius: size * 0.28 }}>
      <CupLogo size={size * 0.86} face={face ?? size >= 28} steam={size >= 24} />
    </span>
  );
}
