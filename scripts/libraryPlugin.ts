// Publishes the repo's ./library folder (or LIBRARY_DIR) with the site, so Cortado can sync it
// like a vault with no sign-in. The build copies the files to <site>/library/ and writes
// <site>/library.json listing each file with its md5; the dev server serves the folder live.
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import { walkVault } from './walkVault.ts';

export interface LibraryManifest {
  name: string;
  files: { path: string; size: number; md5: string }[];
}

export function libraryManifest(root: string, name: string): LibraryManifest {
  return { name, files: walkVault(root, { skipHidden: true }).map(({ path, size, md5 }) => ({ path, size, md5 })) };
}

export function siteLibrary(): Plugin {
  const root = resolve(process.env.LIBRARY_DIR ?? 'library');
  const name = process.env.LIBRARY_NAME?.trim() || 'Cortado Library';
  let base = '/';

  const serve: Connect.NextHandleFunction = (req, res, next) => {
    if (!existsSync(root)) return next();
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (path === `${base}library.json`) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(libraryManifest(root, name)));
      return;
    }
    if (path.startsWith(`${base}library/`)) {
      const file = resolve(root, path.slice(`${base}library/`.length));
      if (!file.startsWith(root + '/')) return next();
      try {
        res.end(readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end();
      }
      return;
    }
    next();
  };

  return {
    name: 'cortado-site-library',
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(serve);
    },
    writeBundle(options) {
      if (!existsSync(root) || !options.dir) return;
      const manifest = libraryManifest(root, name);
      cpSync(root, join(options.dir, 'library'), { recursive: true, filter: (src) => !/(^|[\\/])\.[^\\/]*$/.test(src.slice(root.length)) });
      writeFileSync(join(options.dir, 'library.json'), JSON.stringify(manifest));
      this.info(`library: ${manifest.files.length} files published as "${name}"`);
    },
  };
}
