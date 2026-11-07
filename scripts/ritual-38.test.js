'use strict'; // strict mode keeps an undefined receiver undefined, as in browsers
// Ritual XXXVIII — narration must survive browser timer semantics.
// Browsers throw "TypeError: Illegal invocation" when window.setTimeout/clearTimeout are called with
// any receiver other than the global (e.g. this.setTimeout(...) on another object). Node does not,
// which is why earlier tests passed while every narration line failed in the browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function browserLikeContext() {
    const context = vm.createContext({ AbortController, localStorage: { getItem: () => null, setItem() {} } });
    context.window = context;
    const vmGlobal = vm.runInContext('globalThis', context);
    const receiverCheck = (name, real) => function browserTimer(...args) {
        if (this !== undefined && this !== context && this !== vmGlobal) throw new TypeError(`Illegal invocation (${name})`);
        return real(...args);
    };
    context.setTimeout = receiverCheck('setTimeout', setTimeout);
    context.clearTimeout = receiverCheck('clearTimeout', clearTimeout);
    context.fetch = receiverCheck('fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
    for (const file of ['narration-catalog', 'narration-system']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', `${file}.js`), 'utf8'), context);
    }
    return context;
}

function audio() {
    const starts = [];
    return {
        starts, enabled: true, muted: false, paused: false, volume: 0.7, compressor: {}, setNarrationDucking() {},
        context: {
            currentTime: 0,
            decodeAudioData: async () => ({ duration: 2 }),
            createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, setTargetAtTime() {} } }),
            createBufferSource: () => ({ connect() {}, disconnect() {}, stop() {}, start() { starts.push('started'); } })
        }
    };
}

test('narration plays with the real window timers and fetch (no injected options)', async () => {
    const context = browserLikeContext();
    const sound = audio();
    const statuses = [];
    const narrator = new context.NarrationSystem(sound, context.NarrationCatalog, { status: (s) => statuses.push(s) });
    assert.equal(await narrator.play('discovery.journal', { modal: true }), true);
    assert.equal(sound.starts.length, 1, 'the line actually starts');
    assert.equal(statuses.at(-1), 'Narrator speaking');
});

test('timed awakening lines also play and stop cleanly with window timers', async () => {
    const context = browserLikeContext();
    const sound = audio();
    const narrator = new context.NarrationSystem(sound, context.NarrationCatalog);
    assert.equal(await narrator.play('awakening.presence'), true);
    narrator.stop(); // exercises clearTimeout on the live timer path
    narrator.reset();
    assert.equal(narrator.current, null);
});
