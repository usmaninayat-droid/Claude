// serve-dist.mjs — serve the assembled static build (app/dist) the way the
// production host does, so the deploy can be verified locally before pushing.
//
//   bash fams-v5-demo-environment/scripts/vercel-build.sh
//   node fams-v5-demo-environment/scripts/serve-dist.mjs [port]   # default 6400
//
// It mirrors the routing in the repo-root `vercel.json` exactly:
//   * FILESYSTEM FIRST — a real file always wins (this is what keeps
//     /screens/<name>/…, /assets/…, /branding/… and /mockServiceWorker.js
//     from being swallowed by the SPA fallback),
//   * a directory resolves to its index.html,
//   * everything else falls back to /index.html (the SPA rewrite the main
//     app's history routing needs),
//   * /mockServiceWorker.js gets `Service-Worker-Allowed: /` and no-store, so
//     MSW — the demo's entire data layer — registers at the origin root.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = process.env.DIST_DIR ?? path.resolve(dirname, '../app/dist')
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 6400)

// BASE_PATH mirrors the build's `--base`. At '/' this server behaves exactly
// like Vercel. Set it (e.g. `/MME-FRMS-MVP/`) to reproduce a GitHub Pages
// PROJECT-pages deploy locally: everything is served under the prefix, a
// request outside it 404s, and a miss under it falls back to <base>404.html —
// which is what Pages itself does, and is how the SPA deep-link path gets
// exercised before pushing.
const BASE = (process.env.BASE_PATH ?? '/').replace(/\/*$/, '/')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

// Paths the SPA fallback must NOT swallow — a miss under these is a real 404,
// same negative lookahead as vercel.json's rewrite source.
const NO_FALLBACK = /^\/(screens\/|assets\/|branding\/|_vercel\/)/

function send(res, file, headers = {}, status = 200) {
  res.writeHead(status, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    ...headers,
  })
  fs.createReadStream(file).pipe(res)
}

http
  .createServer((req, res) => {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (BASE !== '/' && !requested.startsWith(BASE)) {
      // Outside the deploy prefix. Pages serves the *user site* here, not us —
      // a 404 is the honest answer, and it makes a missed base-path rewrite
      // fail loudly in tests instead of silently resolving.
      if (requested === BASE.replace(/\/$/, '')) {
        res.writeHead(302, { Location: BASE })
        return res.end()
      }
      res.writeHead(404)
      return res.end(`outside base ${BASE}: ${requested}`)
    }
    const pathname = BASE === '/' ? requested : `/${requested.slice(BASE.length)}`
    let file = path.join(ROOT, pathname)
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('forbidden')
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return send(
        res,
        file,
        pathname === '/mockServiceWorker.js'
          ? { 'Service-Worker-Allowed': '/', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          : {},
      )
    }
    if (NO_FALLBACK.test(pathname)) {
      res.writeHead(404)
      return res.end(`not found: ${pathname}`)
    }
    // GitHub Pages' SPA fallback is 404.html (served WITH a 404 status);
    // Vercel rewrites to index.html with a 200. Mirror whichever this base is.
    return BASE === '/'
      ? send(res, path.join(ROOT, 'index.html'))
      : send(res, path.join(ROOT, '404.html'), {}, 404)
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}${BASE}`))
