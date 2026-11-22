/** Remove a YAML front matter block from the top of a Markdown file. */
export function stripFrontMatter(src: string): string {
  return src.replace(/^﻿?---\r?\n[\s\S]*?\r?\n(---|\.\.\.)\s*(\r?\n|$)/, '');
}
