import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const bindHost = process.env.LIGHTBI_INTERNAL_BIND_HOST?.trim() || '127.0.0.1';
const port = Number(process.env.LIGHTBI_INTERNAL_WEB_PORT || 5273);
const webRoot = resolve(process.env.LIGHTBI_INTERNAL_WEB_ROOT || 'apps/desktop/dist');
const coreOrigin = new URL(process.env.LIGHTBI_INTERNAL_CORE_ORIGIN || 'http://127.0.0.1:5272');
const controlPlaneOrigin = new URL(process.env.LIGHTBI_INTERNAL_CONTROL_PLANE_ORIGIN || 'http://127.0.0.1:5274');
const generationId = process.env.LIGHTBI_GENERATION_ID?.trim() || 'unknown';

const mime = new Map([
  ['.html','text/html; charset=utf-8'], ['.js','text/javascript; charset=utf-8'], ['.css','text/css; charset=utf-8'],
  ['.json','application/json; charset=utf-8'], ['.svg','image/svg+xml'], ['.png','image/png'], ['.ico','image/x-icon'],
  ['.wasm','application/wasm'], ['.woff2','font/woff2'], ['.map','application/json; charset=utf-8'],
]);

function proxy(request, response, origin, stripPrefix = '') {
  const incoming = new URL(request.url || '/', 'http://lightbi.internal');
  let pathname = incoming.pathname;
  if (stripPrefix && pathname.startsWith(stripPrefix)) pathname = pathname.slice(stripPrefix.length) || '/';
  const target = new URL(`${pathname}${incoming.search}`, origin);
  const headers = { ...request.headers, host: target.host };
  delete headers['content-length'];
  const upstream = httpRequest(target, { method: request.method, headers }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, {
      ...upstreamResponse.headers,
      'x-lightbi-generation': generationId,
    });
    upstreamResponse.pipe(response);
  });
  upstream.on('error', () => {
    if (!response.headersSent) response.writeHead(502, { 'content-type':'application/json', 'cache-control':'no-store' });
    response.end(JSON.stringify({ error:'internal_upstream_unavailable', generationId }));
  });
  request.pipe(upstream);
}

function staticFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = resolve(join(webRoot, relative));
  if (!candidate.startsWith(`${webRoot}/`) && candidate !== webRoot) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(webRoot, 'index.html');
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://lightbi.internal');
  if (url.pathname === '/internal/health') {
    response.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-lightbi-generation':generationId });
    response.end(JSON.stringify({ status:'ok', generationId }));
    return;
  }
  if (url.pathname === '/distribution-api' || url.pathname.startsWith('/distribution-api/')) {
    proxy(request, response, controlPlaneOrigin, '/distribution-api');
    return;
  }
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    proxy(request, response, coreOrigin);
    return;
  }
  try {
    const file = staticFile(url.pathname);
    if (!file || !existsSync(file)) {
      response.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': mime.get(extname(file).toLowerCase()) || 'application/octet-stream',
      'cache-control': 'no-store',
      'x-lightbi-generation': generationId,
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400, { 'content-type':'text/plain; charset=utf-8' });
    response.end('Bad request');
  }
});

server.listen(port, bindHost, () => {
  console.log(JSON.stringify({ service:'lightbi-internal-gateway', bindHost, port, generationId, webRoot, coreOrigin:coreOrigin.origin, controlPlaneOrigin:controlPlaneOrigin.origin }));
});
