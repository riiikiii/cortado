// Vite plugin that exposes ./sample-vault (or DEV_VAULT_DIR) to the app's "dev" provider.
// Only used by `vite dev` and `vite preview`, never shipped in the build.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Connect, Plugin } from 'vite';

function walk(dir: string, root: string, out: object[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, root, out);
    else {
      out.push({
        id: relative(root, full).split(sep).join('/'),
        path: relative(root, full).split(sep).join('/'),
        size: st.size,
        modifiedTime: st.mtime.toISOString(),
        md5: createHash('md5').update(readFileSync(full)).digest('hex'),
      });
    }
  }
  return out;
}

export function devVault(): Plugin {
  const root = resolve(process.env.DEV_VAULT_DIR ?? 'sample-vault');
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname === '/__dev-vault/list') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(walk(root, root, [])));
      return;
    }
    if (url.pathname === '/__dev-vault/file') {
      const p = resolve(root, url.searchParams.get('path') ?? '');
      if (!p.startsWith(root)) {
        res.statusCode = 403;
        res.end();
        return;
      }
      try {
        res.end(readFileSync(p));
      } catch {
        res.statusCode = 404;
        res.end();
      }
      return;
    }
    next();
  };
  return {
    name: 'cortado-dev-vault',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
