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

/** The big landing-page cup: the mascot with latte art, a rosy smile, rising steam and sparkles. */
export function CupIllustration({ size = 300 }: { size?: number }) {
  return (
    <svg className="cup-illustration" width={size} height={size} viewBox="0 0 320 320" role="img" aria-label="A smiling cup of coffee">
      <defs>
        <radialGradient id="cup-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--cup-glow)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--cup-glow)', stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id="cup-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf3" />
          <stop offset="100%" stopColor="#f3dcc0" />
        </linearGradient>
        <radialGradient id="cup-coffee" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#a8643a" />
          <stop offset="100%" stopColor="#6e3b20" />
        </radialGradient>
      </defs>

      <circle cx="160" cy="175" r="150" fill="url(#cup-glow)" />

      <g className="cup-sparkles" fill="#f2b65f">
        <path d="M52 92l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" />
        <path d="M268 64l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        <path d="M286 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        <path d="M36 190l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      </g>

      <g className="cup-steam" fill="none" stroke="#d6a074" strokeWidth="11" strokeLinecap="round">
        <path d="M120 88c-15-15 15-25 0-42" />
        <path d="M160 80c-17-17 17-27 0-48" />
        <path d="M200 88c-15-15 15-25 0-42" />
      </g>

      <g className="cup-body">
        <ellipse cx="160" cy="294" rx="96" ry="10" fill="#3b2417" opacity="0.12" />
        <ellipse cx="160" cy="268" rx="114" ry="23" fill="#ecd2b1" stroke="#3b2417" strokeWidth="6" />
        <ellipse cx="160" cy="263" rx="70" ry="11" fill="#e0bb8f" />
        <path d="M238 150c46-9 58 60 2 72" fill="none" stroke="#3b2417" strokeWidth="27" strokeLinecap="round" />
        <path d="M238 150c46-9 58 60 2 72" fill="none" stroke="#fffaf3" strokeWidth="12" strokeLinecap="round" />
        <path d="M62 120h196v52c0 56-41 92-98 92s-98-36-98-92z" fill="url(#cup-body)" stroke="#3b2417" strokeWidth="6" strokeLinejoin="round" />
        <path d="M80 176c4 32 26 56 60 64" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.75" />
        <ellipse cx="160" cy="120" rx="98" ry="23" fill="url(#cup-coffee)" stroke="#3b2417" strokeWidth="6" />
        <ellipse cx="160" cy="121" rx="78" ry="15" fill="none" stroke="#c98a5c" strokeWidth="4" opacity="0.7" />
        <path d="M160 130c-15-6-23-11-23-17a8 6 0 0 1 16-1l7 4 7-4a8 6 0 0 1 16 1c0 6-8 11-23 17z" fill="#f7e2c6" />

        <ellipse cx="127" cy="190" rx="10" ry="13" fill="#3b2417" />
        <ellipse cx="193" cy="190" rx="10" ry="13" fill="#3b2417" />
        <circle cx="131" cy="185" r="4" fill="#fff" />
        <circle cx="197" cy="185" r="4" fill="#fff" />
        <circle cx="124" cy="196" r="1.8" fill="#fff" />
        <circle cx="190" cy="196" r="1.8" fill="#fff" />
        <ellipse cx="104" cy="214" rx="15" ry="9" fill="#f39a8f" opacity="0.7" />
        <ellipse cx="216" cy="214" rx="15" ry="9" fill="#f39a8f" opacity="0.7" />
        <path d="M143 207q17 24 34 0z" fill="#3b2417" stroke="#3b2417" strokeWidth="4" strokeLinejoin="round" />
        <path d="M152 217q8-6 16 0q-8 6-16 0z" fill="#f2786b" />
      </g>
    </svg>
  );
}
