import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { libraryManifest } from './libraryPlugin.ts';

describe('library manifest', () => {
  it('lists every published file with its md5, leaving out hidden and junk files', () => {
    const root = mkdtempSync(join(tmpdir(), 'library-'));
    mkdirSync(join(root, 'Unit 1/assets'), { recursive: true });
    mkdirSync(join(root, '.obsidian'));
    writeFileSync(join(root, 'Start.md'), '# Start');
    writeFileSync(join(root, 'Unit 1/01 Intro.html'), '<h1>Intro</h1>');
    writeFileSync(join(root, 'Unit 1/assets/style.css'), 'h1{}');
    writeFileSync(join(root, '.obsidian/app.json'), '{}');
    writeFileSync(join(root, '.DS_Store'), 'x');

    const m = libraryManifest(root, 'Course');
    expect(m.name).toBe('Course');
    expect(m.files.map((f) => f.path)).toEqual(['Start.md', 'Unit 1/01 Intro.html', 'Unit 1/assets/style.css']);
    expect(m.files[0]).toEqual({ path: 'Start.md', size: 7, md5: createHash('md5').update('# Start').digest('hex') });
  });
});
