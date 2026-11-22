export interface OutlineItem {
  text: string;
  level: number;
}

export interface ScrollInfo {
  /** 0 at the top, 1 at the bottom (1 when nothing scrolls). */
  ratio: number;
  /** Pixels from the top. */
  y: number;
  /** Index into the outline of the section being read, or -1. */
  section: number;
}

/** Hooks a viewer uses to tell the reader chrome what's happening. */
export interface ViewerEvents {
  onScroll?: (info: ScrollInfo) => void;
  onOutline?: (items: OutlineItem[]) => void;
  /** The viewer hands over a function that scrolls to outline item `i`. */
  registerJump?: (jump: (i: number) => void) => void;
}

/** Headings worth listing in an outline, skipping site chrome in HTML guides. */
export function collectHeadings(root: ParentNode): HTMLElement[] {
  const all = [...root.querySelectorAll<HTMLElement>('h1, h2, h3')];
  return all.filter((h) => !h.closest('nav, header, footer, aside, .md-end') && h.textContent?.trim()).slice(0, 80);
}

export function toOutline(headings: HTMLElement[]): OutlineItem[] {
  return headings.map((h) => ({ text: h.textContent!.trim().replace(/\s+/g, ' '), level: Number(h.tagName[1]) }));
}

/** The last heading above the reading line (a quarter of the way down the view). */
export function currentSection(headings: HTMLElement[], viewTop: number, viewHeight: number): number {
  const line = viewTop + viewHeight * 0.25;
  let current = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].getBoundingClientRect().top <= line) current = i;
    else break;
  }
  return current;
}
