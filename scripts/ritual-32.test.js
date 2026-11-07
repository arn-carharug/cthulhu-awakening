// Ritual XXXII — QA-F03: a narration load timeout ends the request; late results never play.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const UNAVAILABLE = /written text remains/;

// Real NarrationSystem with controllable fetch, decode, clock and timers.
function harness({ fetch, decode } = {}) {
    const starts = [], statuses = [], captions = [], timers = [];
    let now = 0;
    const audio = {
        enabled: true, muted: false, paused: true, volume: 0.7, compressor: {},
        setNarrationDucking() {},
        context: {
            currentTime: 0,
            decodeAudioData: decode || (async () => ({ duration: 2 })),
            createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, setTargetAtTime() {} } }),
            createBufferSource: () => ({ connect() {}, disconnect() {}, stop() {}, start() { starts.push('started'); } })
        }
    };
    const context = vm.createContext({ AbortController });
    context.window = context;
    for (const file of ['narration-catalog', 'narration-system']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', `${file}.js`), 'utf8'), context);
    }
    const narrator = new context.NarrationSystem(audio, context.NarrationCatalog, {
        fetch: fetch || (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })),
        now: () => now,
        setTimeout: (callback, delay) => { const timer = { callback, delay, cleared: false }; timers.push(timer); return timer; },
        clearTimeout: (timer) => { if (timer) timer.cleared = true; },
        status: (copy) => statuses.push(copy),
        caption: (...args) => captions.push(args)
    });
    const expireLoad = () => {
        const timer = timers.at(-1);
        assert.ok(timer && !timer.cleared, 'a live load timer exists');
        timer.callback();
    };
    return { audio, narrator, starts, statuses, captions, timers, expireLoad, advance: (s) => { now += s; } };
}

function deferredDecode() {
    let resolve, reject, entered;
    const started = new Promise((r) => { entered = r; });
    const decode = () => { entered(); return new Promise((res, rej) => { resolve = res; reject = rej; }); };
    return { decode, started, resolve: (v) => resolve(v), reject: (e) => reject(e) };
}

const flush = () => new Promise((r) => setImmediate(r));

test('QA-F03: decode that never returns stops Loading at the timeout', async () => {
    const d = deferredDecode();
    const h = harness({ decode: d.decode });
    const pending = h.narrator.play('discovery.journal', { modal: true });
    await d.started;
    assert.equal(h.statuses.at(-1), 'Loading narrator…');
    h.advance(20);
    h.expireLoad();
    assert.equal(h.narrator.current, null, 'request is released');
    assert.match(h.statuses.at(-1), UNAVAILABLE, 'Loading is replaced by the text fallback');
    await flush();
    assert.equal(h.starts.length, 0);
    // The promise may stay pending forever; nothing else must depend on it.
    void pending;
});

test('QA-F03: decode that completes after the timeout is dropped', async () => {
    const d = deferredDecode();
    const h = harness({ decode: d.decode });
    const pending = h.narrator.play('discovery.journal', { modal: true });
    await d.started;
    h.expireLoad();
    const statusAfterTimeout = h.statuses.at(-1);
    d.resolve({ duration: 10 });
    assert.equal(await pending, false, 'late decode is not accepted');
    assert.equal(h.starts.length, 0, 'late decode never starts audio');
    assert.equal(h.captions.length, 0, 'late decode never captions');
    assert.equal(h.statuses.at(-1), statusAfterTimeout, 'late result does not rewrite the status');
    assert.equal(h.narrator.current, null);
});

test('QA-F03: fetch that hangs past the timeout is dropped too', async () => {
    let resolveFetch;
    const h = harness({ fetch: () => new Promise((r) => { resolveFetch = r; }) });
    const pending = h.narrator.play('discovery.journal', { modal: true });
    h.expireLoad();
    assert.equal(h.narrator.current, null);
    resolveFetch({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    assert.equal(await pending, false);
    assert.equal(h.starts.length, 0);
});

test('QA-F03: a timed-out line does not block the next request', async () => {
    const d = deferredDecode();
    let decodes = 0;
    const h = harness({ decode: (bytes) => (++decodes === 1 ? d.decode(bytes) : Promise.resolve({ duration: 2 })) });
    const first = h.narrator.play('discovery.journal', { modal: true });
    await d.started;
    h.expireLoad();
    assert.equal(await h.narrator.play('discovery.journal', { modal: true, repeat: true }), true);
    assert.equal(h.narrator.current?.id, 'discovery.journal');
    d.resolve({ duration: 10 });
    assert.equal(await first, false);
    assert.equal(h.narrator.current?.id, 'discovery.journal', 'late first result does not clear the newer request');
});

test('QA-F03: load timeout is wall-clock and independent of the pause-aware TTL', async () => {
    const h = harness();
    await h.narrator.play('awakening.presence', { modal: true });
    await h.narrator.play('discovery.journal', { modal: true });
    assert.ok(h.timers.length >= 2);
    assert.ok(h.timers.every((timer) => timer.delay === 15000), `delays: ${h.timers.map((t) => t.delay)}`);
    assert.ok(h.timers.every((timer) => timer.cleared), 'successful loads clear their timer');
});

test('QA-F03: successful load before the timeout still plays', async () => {
    const h = harness();
    h.audio.paused = false;
    assert.equal(await h.narrator.play('discovery.journal', { modal: true }), true);
    assert.equal(h.starts.length, 1);
    assert.equal(h.statuses.at(-1), 'Narrator speaking');
});
