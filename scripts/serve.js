const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT) || 8000;
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.glsl': 'text/plain; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.mtl': 'text/plain; charset=utf-8',
    '.obj': 'text/plain; charset=utf-8',
    '.png': 'image/png'
};

const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const requested = pathname === '/' ? '/index.html' : pathname;
    const filename = path.resolve(root, `.${requested}`);

    if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
    }

    fs.stat(filename, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404).end('Not found');
            return;
        }
        response.writeHead(200, {
            'Content-Type': mimeTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        fs.createReadStream(filename).pipe(response);
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Cthulhu Awakening: http://127.0.0.1:${port}`);
});
