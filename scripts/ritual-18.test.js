const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness(options = {}) {
    const starts = [], statuses = [], captions = [], ducking = [], sources = [];
    const audio = { enabled: true, muted: false, paused: false, volume: 0.7,
        compressor: {}, setNarrationDucking: value => ducking.push(value),
        context: { currentTime: 0,
            createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, setTargetAtTime() {} } }),
            decodeAudioData: options.decode || (async () => ({ duration: 10 })),
            createBufferSource() {
                const source = { connect() {}, disconnect() {},
                    start(when, offset) { starts.push(offset); }, stop() { this.stopped = true; } };
                sources.push(source); return source;
            }
        }
    };
    const storage = new Map();
    const context = vm.createContext({ AbortController,
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        fetch: options.fetch || (async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) })) });
    context.window = context;
    for (const file of ['narration-catalog', 'narration-system']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
    const narrator = new context.NarrationSystem(audio, context.NarrationCatalog, {
        status: value => statuses.push(value), caption: (...args) => captions.push(args)
    });
    return { audio, narrator, starts, statuses, captions, ducking, sources, storage, catalog: context.NarrationCatalog };
}

test('one narrator source, priority interruption, duplicate suppression and caption timing', async () => {
    const h = harness();
    await h.narrator.play('awakening.eyes');
    assert.deepEqual(h.starts, [0]);
    assert.equal(h.captions[0][2], 10, 'caption uses decoded audio duration');
    assert.equal(await h.narrator.play('awakening.eyes'), false);
    await h.narrator.play('discovery.stone', { modal: true });
    assert.equal(h.sources[0].stopped, true);
    assert.equal(await h.narrator.play('awakening.presence'), false, 'ambient line cannot interrupt discovery');
    await h.narrator.play('ending.refused', { modal: true });
    assert.equal(h.sources[1].stopped, true);
    h.sources[2].onended();
    assert.equal(h.narrator.current, null);
    assert.equal(h.ducking.at(-1), false);
});

test('pause resumes from the offset; modal voice survives world pause but obeys focus loss', async () => {
    const h = harness();
    await h.narrator.play('awakening.eyes');
    h.audio.context.currentTime = 2;
    h.audio.paused = true; h.narrator.sync();
    assert.equal(h.sources[0].stopped, true);
    h.audio.context.currentTime = 20;
    h.audio.paused = false; h.narrator.sync();
    assert.deepEqual(h.starts, [0, 2]);
    assert.equal(h.captions.length, 1);
    h.audio.paused = true;
    await h.narrator.play('discovery.journal', { modal: true });
    assert.ok(h.narrator.current.source);
    h.narrator.setHidden(true);
    assert.equal(h.narrator.current.source, null);
    h.narrator.setHidden(false);
    assert.ok(h.narrator.current.source);
});

test('mute drops old lines, independent narrator settings persist, reset permits the next cycle', async () => {
    const h = harness();
    await h.narrator.play('awakening.eyes');
    h.audio.muted = true; h.narrator.sync();
    assert.equal(h.narrator.current, null);
    h.audio.muted = false; h.narrator.sync();
    assert.equal(h.starts.length, 1, 'unmute does not replay a stale sentence');
    h.narrator.setVolume(0.3);
    h.narrator.setEnabled(false);
    assert.deepEqual(JSON.parse(h.storage.get('ritual-narration')), { enabled: false, volume: 0.3 });
    assert.equal(await h.narrator.play('discovery.stone', { modal: true }), false);
    h.narrator.setEnabled(true); h.narrator.reset();
    assert.equal(await h.narrator.play('awakening.eyes'), true);
    h.narrator.setVolume(0);
    assert.equal(h.narrator.current, null);
});

test('reset aborts a delayed fetch and prevents an old cycle from decoding or speaking', async () => {
    let respond, signal;
    const h = harness({ fetch: (file, options) => { signal = options.signal; return new Promise(resolve => { respond = resolve; }); } });
    const pending = h.narrator.play('awakening.eyes');
    h.narrator.reset();
    assert.equal(signal.aborted, true);
    respond({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    await pending;
    assert.equal(h.starts.length, 0);
    assert.equal(h.narrator.cache.size, 0);
});

test('reset during decoding and interrupted requests cannot replace a newer line', async () => {
    let decode, started;
    const decoding = new Promise(resolve => { started = resolve; });
    const h = harness({ decode: () => { started(); return new Promise(resolve => { decode = resolve; }); } });
    const pending = h.narrator.play('awakening.eyes');
    await decoding;
    h.narrator.reset();
    decode({ duration: 3 });
    await pending;
    assert.equal(h.starts.length, 0);
    assert.equal(h.narrator.cache.size, 0);
});

test('missing recordings fail quietly and partial Turkish catalog falls back per entry', async () => {
    const h = harness({ fetch: async () => ({ ok: false }) });
    assert.equal(await h.narrator.play('awakening.eyes'), false);
    assert.equal(h.narrator.current, null);
    assert.match(h.statuses.at(-1), /written text remains/);
    h.catalog.languages.tr = { 'awakening.eyes': { text: 'Seni görüyor.' } };
    h.narrator.language = 'tr';
    assert.equal(h.narrator.entry('awakening.eyes').text, 'Seni görüyor.');
    assert.equal(h.narrator.entry('ending.refused').text, 'The sea lets you pass. For now.');
});

test('English audio manifest matches generated catalog, file sizes and timeline slots', () => {
    const h = harness();
    const root = path.resolve(__dirname, '..');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/audio/narration/manifest.json')));
    assert.deepEqual(JSON.parse(JSON.stringify(h.catalog)), manifest);
    const lines = JSON.parse(fs.readFileSync(path.join(__dirname, 'narration-lines.json')));
    let bytes = 0;
    assert.equal(Object.keys(h.catalog.languages.en).length, 10);
    for (const line of lines) {
        const entry = h.narrator.entry(line.id);
        assert.equal(entry.text, line.text);
        assert.equal(fs.statSync(path.join(root, entry.file)).size, entry.bytes);
        assert.ok(entry.duration > 0 && entry.duration < (line.maxSeconds || 60));
        bytes += entry.bytes;
    }
    assert.ok(bytes < 3 * 1024 * 1024);
});
