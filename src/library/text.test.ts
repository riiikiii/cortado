import { describe, expect, it } from 'vitest';
import { extractText, htmlToText, markdownToText, readingMinutes, searchDocs } from './text';

describe('text extraction', () => {
  it('pulls the title and visible text out of HTML', () => {
    const r = htmlToText(
      '<html><head><title>Colour &amp; Light</title><style>p{}</style></head><body><h1>Big</h1><script>var x=1</script><p>Mix&nbsp;red</p></body></html>',
    );
    expect(r.title).toBe('Colour & Light');
    expect(r.text).toBe('Big Mix red');
  });

  it('turns Markdown into readable text', () => {
    const r = markdownToText('---\ntags: [a]\n---\n# Hello *there*\n\nSee [[Other Note|the other]] and [a link](x.md).\n\n- [x] done item\n');
    expect(r.title).toBe('Hello there');
    expect(r.text).toBe('Hello there See the other and a link. done item');
  });

  it('counts words and falls back to the file name for a title', () => {
    const d = extractText('Notes/Plain.md', 'one two three');
    expect(d).toMatchObject({ title: 'Plain', words: 3 });
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });
});

describe('searchDocs', () => {
  const docs = [
    { path: 'a.md', title: 'Sorting', words: 0, text: 'Bubble sort swaps neighbours. Quick sort picks a pivot.' },
    { path: 'b.md', title: 'Colour', words: 0, text: 'Red and blue make purple.' },
    { path: 'c.md', title: 'Pivot tables', words: 0, text: 'Spreadsheets.' },
  ];

  it('needs every term and ranks title matches first', () => {
    expect(searchDocs(docs, 'pivot').map((h) => h.path)).toEqual(['c.md', 'a.md']);
    expect(searchDocs(docs, 'quick pivot').map((h) => h.path)).toEqual(['a.md']);
    expect(searchDocs(docs, 'x')).toEqual([]);
  });

  it('highlights the matched words in the snippet', () => {
    const [hit] = searchDocs(docs, 'purple');
    expect(hit.snippet.filter((s) => s.match).map((s) => s.text)).toEqual(['purple']);
    expect(hit.snippet.map((s) => s.text).join('')).toBe('Red and blue make purple.');
  });
});
