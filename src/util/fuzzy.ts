/**
 * Small fuzzy matcher: every query character must appear in order. Scores favour matches in
 * the file name, consecutive runs, and matches at word starts. Returns null when there's no match.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return 0;
  const t = text.toLowerCase();
  const nameStart = t.lastIndexOf('/') + 1;
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    score += 1;
    if (found === prev + 1) score += 3;
    if (found === 0 || /[\s/_\-.]/.test(t[found - 1])) score += 4;
    if (found >= nameStart) score += 2;
    prev = found;
    ti = found + 1;
  }
  // Prefer shorter paths when scores tie.
  return score - t.length * 0.01;
}

export function fuzzyFilter<T>(query: string, items: T[], key: (t: T) => string, limit = 50): T[] {
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const s = fuzzyScore(query, key(item));
    if (s !== null) scored.push({ item, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
