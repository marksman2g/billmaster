const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicFiles = new Set(['index.html', 'styles.css', 'app.js', 'billmaster-config.js', 'service-worker.js', 'manifest.json', 'billmaster-icon.svg', 'billmaster-icon-192.png', 'billmaster-icon-512.png', 'PRIVACY.md', 'PRIVACY.txt']);
const publicFolders = new Set(['assets', 'audio', 'logo-concepts']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

function createPreviewServer() {
  return http.createServer((request, response) => {
    const fail = (status, message) => { response.writeHead(status, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); response.end(message); };
    if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Method not allowed');
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { return fail(400, 'Invalid URL'); }
    if (pathname === '/') pathname = '/index.html';
    const relative = pathname.slice(1);
    const segments = relative.split('/');
    if (segments.some((part) => part.startsWith('.')) || /[\\\0:]/.test(relative)) return fail(403, 'Forbidden');
    const extension = path.extname(relative).toLowerCase();
    const isAsset = publicFolders.has(segments[0]) && ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.wav', '.mp3'].includes(extension);
    if (!publicFiles.has(relative) && !isAsset) return fail(404, 'Not found');
    const file = path.resolve(root, relative);
    fs.realpath(file, (error, resolved) => {
      if (error) return fail(404, 'Not found');
      if (!resolved.startsWith(`${root}${path.sep}`)) return fail(403, 'Forbidden');
      fs.readFile(resolved, (readError, data) => {
        if (readError) return fail(404, 'Not found');
        response.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': data.length });
        response.end(request.method === 'HEAD' ? undefined : data);
      });
    });
  });
}

if (require.main === module) {
  const index = process.argv.indexOf('--port');
  const port = Number(process.env.PORT || (index >= 0 ? process.argv[index + 1] : 4180));
  const host = process.env.HOST || '127.0.0.1';
  const server = createPreviewServer();
  server.on('error', (error) => { console.error(`BillMaster preview could not start: ${error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`BillMaster preview: http://${host}:${server.address().port}`));
}

module.exports = { createPreviewServer };
