// Ritual XXXIX — the scene must be visible on first load, and the browser smoke test's server must work.
// Since ritual_24 the first resizeCanvas() ran before the shader program existed, so the projection
// matrix went to a null uniform location and every frame showed only the clear colour until the
// window was resized. scripts/browser-smoke.js checks the rendered pixels in a real browser; this
// test keeps the ordering fix in place for runs without a browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createServer } = require('./serve.js');

const root = path.resolve(__dirname, '..');

test('projection is uploaded after the program and its uniform locations exist', () => {
    const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
    const init = source.slice(source.indexOf('async function main()'));
    const useProgram = init.indexOf('STATE.gl.useProgram(STATE.program)');
    const location = init.indexOf('STATE.uProjectionLoc = STATE.gl.getUniformLocation');
    const firstFrame = init.indexOf('requestAnimationFrame(drawScene)');
    const forcedResize = init.indexOf('resizeCanvas(true)', location);
    assert.ok(useProgram > 0 && location > useProgram, 'program is bound before locations are read');
    assert.ok(forcedResize > location, 'a forced resize uploads the projection once the location exists');
    assert.ok(forcedResize < firstFrame, '... before the first frame is drawn');
});

test('serve.js exports a server that serves the game and refuses paths outside it', async () => {
    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const index = await fetch(`${base}/`);
        assert.equal(index.status, 200);
        assert.match(index.headers.get('content-type'), /text\/html/);
        assert.match(await index.text(), /glCanvas/);
        const script = await fetch(`${base}/main.js`);
        assert.match(script.headers.get('content-type'), /text\/javascript/);
        assert.equal((await fetch(`${base}/missing.js`)).status, 404);
        // fetch normalises dot segments, so send the raw path: it decodes to /../../secret.
        const status = await new Promise((resolve, reject) => http.get(`${base}/..%2f..%2fsecret`, (res) => {
            res.resume();
            resolve(res.statusCode);
        }).on('error', reject));
        assert.equal(status, 403);
    } finally {
        server.close();
    }
});
