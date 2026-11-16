// Prism Drift — a tiny static server for local play-testing: `node serve.ts`
// serves game/ on http://localhost:8080. Development convenience only; it
// sends the MIME types a browser game needs, refuses paths outside game/,
// and never does anything clever.

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The game directory, resolved once at startup. */
const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));

/** The port: --port N, else $PORT, else 8080. */
function pickPort() {
  const args = process.argv.slice(2);
  const flagAt = args.indexOf('--port');
  const raw = flagAt === -1 ? process.env.PORT : args[flagAt + 1];
  const port = Number(raw ?? 8080);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : 8080;
}

const mimeFor = (file) => {
  const table = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
  };
  return table[extname(file).toLowerCase()] ?? 'application/octet-stream';
};

/** Resolve a request path inside game/, or null when it escapes. */
function resolveInside(requestPath) {
  const cleaned = normalize(requestPath === '/' || requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath);
  const file = resolve(join(gameRoot, cleaned));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) return null;
  return file;
}

const server = createServer(async (request, response) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const file = resolveInside(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': mimeFor(file),
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
});

const port = pickPort();
server.listen(port, '127.0.0.1', () => {
  console.log(`Prism Drift is on http://localhost:${port}`);
});
