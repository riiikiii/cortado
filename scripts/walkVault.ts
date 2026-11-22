// Lists the files in a folder the way Cortado's sync expects: POSIX paths with size and md5.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface VaultFile {
  path: string;
  size: number;
  md5: string;
  modifiedTime: string;
}

const JUNK = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

/** Every file under `root`. With `skipHidden`, dot-files and dot-folders are left out. */
export function walkVault(root: string, { skipHidden = false } = {}): VaultFile[] {
  const out: VaultFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      if (JUNK.has(name) || name === '.git' || (skipHidden && name.startsWith('.'))) continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else
        out.push({
          path: relative(root, full).split(sep).join('/'),
          size: st.size,
          md5: createHash('md5').update(readFileSync(full)).digest('hex'),
          modifiedTime: st.mtime.toISOString(),
        });
    }
  };
  walk(root);
  return out;
}
