const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(options = {}) {
    const starts = [], statuses = [], captions = [], ducking = [], sources = [];
    const audio = {
        enabled: true, muted: false, paused: false, volume: 0.7,
        compressor: {},
        setNarrationDucking: value => ducking.push(value),
        context: {
            currentTime: 0,
            createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, setTargetAtTime() {} } }),
            decodeAudioData: options.decode || (async () => ({ duration: 2.0 })),
            createBufferSource() {
                const source = {
                    connect() {}, disconnect() {},
                    start(when, offset) { starts.push(offset); },
                    stop() { this.stopped = true; }
                };
                sources.push(source);
                return source;
            }
        }
    };
    const storage = new Map();
    const context = vm.createContext({
        AbortController,
        setTimeout,
        clearTimeout,
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        fetch: options.fetch || (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }))
    });
    context.window = context;
    for (const file of ['narration-catalog', 'narration-system']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
    }
    const narrator = new context.NarrationSystem(audio, context.NarrationCatalog, {
        status: value => statuses.push(value),
        caption: (...args) => captions.push(args)
    });
    return { audio, narrator, starts, statuses, captions, ducking, sources, storage, catalog: context.NarrationCatalog };
}

test('delayed fetch exceeding TTL does not speak, does not caption, and clears status', async () => {
    let respond;
    const h = harness({
        fetch: () => new Promise(resolve => { respond = resolve; })
    });
    const pending = h.narrator.play('awakening.presence');
    assert.equal(h.statuses.at(-1), 'Loading narrator…');

    // Advance audio context time by 5.5s (exceeds awakening.presence 4.8s TTL)
    h.audio.context.currentTime = 5.5;

    respond({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    const result = await pending;

    assert.equal(result, false, 'stale play should return false');
    assert.equal(h.starts.length, 0, 'audio source should not start');
    assert.equal(h.captions.length, 0, 'caption callback should not fire');
    assert.equal(h.narrator.current, null, 'current clip should be cleared');
    assert.equal(h.statuses.at(-1), '', 'status should be cleared');
});

test('delayed decode exceeding TTL does not speak, does not caption, and clears status', async () => {
    let decode, decodeCalled;
    const decoding = new Promise(resolve => { decodeCalled = resolve; });
    const h = harness({
        decode: () => {
            decodeCalled();
            return new Promise(resolve => { decode = resolve; });
        }
    });
    const pending = h.narrator.play('awakening.reveal');
    await decoding;
    assert.equal(h.statuses.at(-1), 'Loading narrator…');

    // Advance time beyond awakening.reveal 5.8s TTL
    h.audio.context.currentTime = 6.5;
    decode({ duration: 1.7 });
    const result = await pending;

    assert.equal(result, false, 'stale decoded play should return false');
    assert.equal(h.starts.length, 0, 'audio should not start');
    assert.equal(h.captions.length, 0, 'caption should not be displayed');
    assert.equal(h.narrator.current, null);
    assert.equal(h.statuses.at(-1), '');
});

test('paused time is excluded from TTL; line remains valid and plays when unpaused', async () => {
    let respond;
    const h = harness({
        fetch: () => new Promise(resolve => { respond = resolve; })
    });
    // awakening.eyes has TTL 6.8s
    const pending = h.narrator.play('awakening.eyes');
    h.audio.context.currentTime = 1.0;

    // User pauses scene at t=1.0 for 20 seconds
    h.audio.paused = true;
    h.narrator.sync();
    h.audio.context.currentTime = 21.0;

    // Fetch resolves while paused at t=21.0 (active elapsed time is only 1.0s)
    respond({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });

    // Now unpause at t=22.0
    h.audio.context.currentTime = 22.0;
    h.audio.paused = false;
    h.narrator.sync();

    const result = await pending;
    assert.equal(result, true, 'line should play successfully after pause');
    assert.equal(h.starts.length, 1, 'audio source should have started');
    assert.equal(h.captions.length, 1, 'caption should be emitted');
    assert.equal(h.captions[0][0], 'awakening.eyes');
});

test('stale line cannot overwrite newer caption or interrupt newer line', async () => {
    let respondSlow;
    const h = harness({
        fetch: (file) => {
            if (file.includes('awakening.rumble')) {
                return new Promise(resolve => { respondSlow = resolve; });
            }
            return Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
        }
    });

    const pendingRumble = h.narrator.play('awakening.rumble');
    assert.equal(h.captions.length, 0);

    // Newer line requested at t=2.0
    h.audio.context.currentTime = 2.0;
    const resultPresence = await h.narrator.play('awakening.presence');
    assert.equal(resultPresence, true);
    assert.equal(h.captions.length, 1);
    assert.equal(h.captions[0][0], 'awakening.presence');

    // Slow rumble finishes at t=5.0
    h.audio.context.currentTime = 5.0;
    respondSlow({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    const resultRumble = await pendingRumble;

    assert.equal(resultRumble, false);
    // Crucial check: caption list must still have only presence, never overwritten by rumble!
    assert.equal(h.captions.length, 1);
    assert.equal(h.captions[0][0], 'awakening.presence');
});

test('modal lines and endings are not expired by ambient TTL; missing audio fails quietly', async () => {
    let respond;
    const h = harness({
        fetch: () => new Promise(resolve => { respond = resolve; })
    });
    const pendingJournal = h.narrator.play('discovery.journal', { modal: true });
    // Simulate player reading note for 25 seconds before audio fetch returns
    h.audio.context.currentTime = 25.0;
    respond({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    const resultJournal = await pendingJournal;

    assert.equal(resultJournal, true, 'modal lines should not expire via ambient TTL');
    assert.equal(h.starts.length, 1);

    // Missing ending audio fails quietly without crashing or blocking
    const hMissing = harness({ fetch: async () => ({ ok: false }) });
    const resultEnding = await hMissing.narrator.play('ending.witnessed', { modal: true });
    assert.equal(resultEnding, false);
    assert.match(hMissing.statuses.at(-1), /written text remains/);
});
