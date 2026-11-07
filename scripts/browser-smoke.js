// Browser smoke test: boots the real game in headless Chrome and drives it through the Chrome
// DevTools Protocol. No dependencies — it uses Node's built-in WebSocket (Node 22+) and an
// installed Chrome/Chromium/Edge. It exists because the Node suites run modules in vm contexts and
// cannot see browser-only failures (ritual_38: window timers called with the wrong receiver threw
// "Illegal invocation", so no narration line ever played in a browser while every test passed).
//
//   node scripts/browser-smoke.js            # finds a browser, or set CHROME_PATH
//   node scripts/browser-smoke.js --headed   # watch it run
//   node scripts/browser-smoke.js --screenshot smoke.png
//
// Exit code 0 = all checks passed, 1 = a check failed, 2 = could not run (no browser / old Node).
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('./serve.js');

const BOOT_TIMEOUT_MS = 90_000; // SwiftShader on a CI runner decodes and uploads textures slowly
const headed = process.argv.includes('--headed');
const screenshotArg = process.argv.indexOf('--screenshot');
const screenshotPath = screenshotArg > 0 ? path.resolve(process.argv[screenshotArg + 1]) : null;

function findBrowser() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    const candidates = {
        win32: [
            `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
            `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
            `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`
        ],
        darwin: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
        ],
        linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium']
    }[process.platform] || [];
    return candidates.find((file) => file && fs.existsSync(file)) || null;
}

async function waitForFile(file, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (fs.existsSync(file)) {
            const text = fs.readFileSync(file, 'utf8');
            if (text.includes('\n')) return text;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`browser did not report a DevTools port within ${timeoutMs} ms`);
}

// Minimal CDP client over one browser-level WebSocket with flattened target sessions.
function connect(url) {
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const listeners = [];
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.id && pending.has(message.id)) {
            const { resolve, reject, method } = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) reject(new Error(`${method}: ${message.error.message}`));
            else resolve(message.result);
        } else if (message.method) {
            for (const listener of listeners) listener(message);
        }
    });
    return new Promise((resolve, reject) => {
        socket.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)), { once: true });
        socket.addEventListener('open', () => resolve({
            send(method, params = {}, sessionId) {
                const id = nextId++;
                socket.send(JSON.stringify({ id, method, params, sessionId }));
                return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej, method }));
            },
            on(listener) { listeners.push(listener); },
            close() { socket.close(); }
        }), { once: true });
    });
}

async function main() {
    if (typeof WebSocket !== 'function') {
        console.error('browser-smoke: needs Node 22+ (global WebSocket).');
        return 2;
    }
    const browserPath = findBrowser();
    if (!browserPath) {
        console.error('browser-smoke: no Chrome, Chromium or Edge found. Set CHROME_PATH.');
        return 2;
    }

    const server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cthulhu-smoke-'));
    const args = [
        `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
        '--disable-extensions', '--disable-background-networking', '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
        // Software WebGL so the test runs on GPU-less CI machines exactly as on a desktop.
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
        '--window-size=1280,720'
    ];
    if (!headed) args.push('--headless=new');
    if (process.platform === 'linux' && process.getuid?.() === 0) args.push('--no-sandbox');
    const browser = spawn(browserPath, [...args, 'about:blank'], { stdio: 'ignore' });

    const failures = [];
    const problems = []; // page errors, console errors and failed requests seen at any time
    const results = {};
    const check = (name, ok, detail) => {
        results[name] = ok ? 'pass' : `FAIL${detail === undefined ? '' : `: ${detail}`}`;
        if (!ok) failures.push(name);
    };

    let cdp;
    try {
        const [port, browserPathPart] = (await waitForFile(path.join(profile, 'DevToolsActivePort'), 30_000)).trim().split('\n');
        cdp = await connect(`ws://127.0.0.1:${port}${browserPathPart}`);
        const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
        const send = (method, params) => cdp.send(method, params, sessionId);
        const evaluate = async (expression, { gesture = false } = {}) => {
            const { result, exceptionDetails } = await send('Runtime.evaluate', {
                expression, awaitPromise: true, returnByValue: true, userGesture: gesture
            });
            if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
            return result.value;
        };
        const waitFor = async (expression, timeoutMs, what) => {
            const deadline = Date.now() + timeoutMs;
            for (;;) {
                const value = await evaluate(expression);
                if (value) return value;
                if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
                await new Promise((resolve) => setTimeout(resolve, 250));
            }
        };

        cdp.on((message) => {
            if (message.sessionId !== sessionId) return;
            const p = message.params;
            if (message.method === 'Runtime.exceptionThrown') {
                problems.push(`exception: ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`);
            } else if (message.method === 'Runtime.consoleAPICalled' && (p.type === 'error' || p.type === 'assert')) {
                problems.push(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
            } else if (message.method === 'Network.responseReceived' && p.response.status >= 400
                && !p.response.url.endsWith('/favicon.ico')) { // requested by the browser itself, not the game
                problems.push(`HTTP ${p.response.status}: ${p.response.url}`);
            } else if (message.method === 'Network.loadingFailed' && !p.canceled) {
                problems.push(`request failed (${p.errorText}): ${p.requestId}`);
            }
        });
        await Promise.all(['Runtime.enable', 'Network.enable', 'Page.enable'].map((m) => send(m)));
        await send('Page.navigate', { url: `${origin}/` });
        await waitFor(`document.readyState === 'complete' && !!document.getElementById('start-scene')`, 20_000, 'the launch screen');

        // 1. Boot: the real button, the real asset loads, the real WebGL 2 context.
        const bootStart = Date.now();
        await evaluate(`document.getElementById('start-scene').click()`, { gesture: true });
        const outcome = await waitFor(`(() => {
            if (!document.getElementById('fatal-error').hidden) return 'fatal: ' + document.getElementById('fatal-message').textContent;
            return STATE.initialLoadMs != null ? 'ready' : null;
        })()`, BOOT_TIMEOUT_MS, 'the scene to load');
        results.bootMs = Date.now() - bootStart;
        check('boots without the fatal-error panel', outcome === 'ready', outcome);
        if (outcome !== 'ready') throw new Error(outcome);
        check('WebGL 2 context', await evaluate(`STATE.gl instanceof WebGL2RenderingContext`));

        // 2. Frames advance and the frame is not just the clear colour.
        const frames = async () => (await evaluate(`STATE.performanceMonitor.snapshot().sampleCount`)) || 0;
        const before = await frames();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const after = await frames();
        check('render loop advances', after > before, `${before} -> ${after} samples`);
        const picture = await evaluate(`new Promise((resolve) => requestAnimationFrame(() => setTimeout(() => {
            // Read back right after a drawScene frame (the drawing buffer is not preserved).
            requestAnimationFrame(() => {
                const gl = STATE.gl;
                const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, n = 24;
                const px = new Uint8Array(4);
                const seen = new Set();
                let sum = 0;
                for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
                    gl.readPixels(Math.floor((x + 0.5) * w / n), Math.floor((y + 0.5) * h / n), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
                    seen.add(px[0] + ',' + px[1] + ',' + px[2]);
                    sum += px[0] + px[1] + px[2];
                }
                resolve({ distinct: seen.size, meanLevel: sum / (n * n * 3), glError: gl.getError() });
            });
        })))`);
        results.picture = picture;
        if (screenshotPath) {
            const { data } = await send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(screenshotPath, Buffer.from(data, 'base64'));
            results.screenshot = screenshotPath;
        }
        check('frame shows more than the clear colour', picture.distinct >= 8, `${picture.distinct} distinct colours`);
        check('no WebGL error', picture.glError === 0, `gl.getError() = ${picture.glError}`);

        // 3. Audio and narration — the path ritual_38 fixed.
        const sound = await evaluate(`(async () => {
            await ritualAudio.enable();
            if (ritualAudio.muted) await ritualAudio.toggle();
            const played = await narrator.play('discovery.journal', { modal: true });
            const status = document.getElementById('narration-status')?.textContent ?? null;
            const state = ritualAudio.context?.state;
            narrator.stop();
            return { played, state, status, panner: ritualAudio.presence?.panner?.panningModel ?? null };
        })()`, { gesture: true });
        results.audio = sound;
        check('audio context runs', sound.state === 'running', sound.state);
        check('a narration line actually plays', sound.played === true, JSON.stringify(sound));
        check('creature presence is HRTF-panned', sound.panner === 'HRTF', sound.panner);

        // 4. The awakening sequence runs for a while without errors.
        const awakened = await evaluate(`(() => {
            sceneLifecycle.toggleCompassInspection();
            sceneLifecycle.toggleCompassInspection();
            sceneLifecycle.startAwakening();
            return STATE.awakeningStarted;
        })()`, { gesture: true });
        check('awakening starts', awakened === true);
        const t0 = await evaluate(`STATE.awakeningTimeline.elapsed`);
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const t1 = await evaluate(`STATE.awakeningTimeline.elapsed`);
        // Software GL can run at ~2 fps and frame deltas are clamped, so only require progress.
        check('awakening timeline advances', t1 > t0 + 0.2, `${t0.toFixed(2)} -> ${t1.toFixed(2)} s`);

        // 5. Reset returns to a playable state.
        await evaluate(`sceneLifecycle.reset()`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        check('reset clears the awakening', (await evaluate(`STATE.awakeningStarted`)) === false);

        results.diagnostics = await evaluate(`(() => { const d = getSceneDiagnostics(); return { browser: d.browser, quality: d.quality, renderSize: d.renderSize, initialLoadMs: Math.round(d.initialLoadMs), fps: d.performance?.fps }; })()`);
    } catch (error) {
        failures.push(`run aborted: ${error.message}`);
    } finally {
        check('no page errors, console errors or failed requests', problems.length === 0, `\n    ${problems.join('\n    ')}`);
        cdp?.close();
        browser.kill();
        server.close();
        await new Promise((resolve) => browser.once('exit', resolve).once('error', resolve) && setTimeout(resolve, 3000));
        try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* profile lock on Windows */ }
    }

    console.log(JSON.stringify(results, null, 2));
    if (failures.length) {
        console.error(`\nbrowser-smoke: ${failures.length} failure(s):\n  - ${failures.join('\n  - ')}`);
        return 1;
    }
    console.log('\nbrowser-smoke: all checks passed');
    return 0;
}

main().then((code) => process.exit(code), (error) => { console.error(error); process.exit(2); });
