const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function runtime({ reduced = false, saved = null, storageBlocked = false } = {}) {
    const media = { matches: reduced };
    let stored = saved;
    const label = { textContent: '', classList: { remove() {}, add() {} } };
    const context = vm.createContext({
        matchMedia: () => media,
        localStorage: {
            getItem() { if (storageBlocked) throw new Error('blocked'); return stored; },
            setItem(key, value) { if (storageBlocked) throw new Error('blocked'); stored = value; }
        },
        document: { getElementById: () => label }
    });
    context.window = context;
    for (const name of ['comfort-settings', 'omen-system']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', `${name}.js`), 'utf8'), context);
    }
    return { context, media, settings: new context.ComfortSettings(), stored: () => stored };
}

test('all 100-cycle runs contain complete bags without boundary repeats for varied seeds', () => {
    const { context } = runtime();
    for (const seed of [0, 1, 42, 20261018, 4294967295]) {
        const omens = new context.OmenSystem({ on() {} }, seed);
        const ids = Array.from({ length: 100 }, (_, i) => omens.beginCycle(i + 1).id);
        for (let i = 0; i < ids.length; i += 4) assert.equal(new Set(ids.slice(i, i + 4)).size, 4);
        for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]);
        assert.equal(omens.beginCycle(10).id, ids[9], 'retry and revisiting cycle keep the omen');
        const replay = new context.OmenSystem({ on() {} }, seed);
        assert.deepEqual(ids, Array.from({ length: 100 }, (_, i) => replay.beginCycle(i + 1).id));
    }
});

test('seed replacement restarts deterministic sequence, including nonsequential access', () => {
    const { context } = runtime();
    const omens = new context.OmenSystem({ on() {} }, 12);
    const expected = omens.beginCycle(97).id;
    omens.setSeed(12);
    assert.equal(omens.beginCycle(97).id, expected);
    assert.throws(() => omens.beginCycle(0));
    assert.throws(() => omens.beginCycle(NaN));
});

test('system preference updates 3D settings live; individual overrides remain independent', () => {
    const { settings, media } = runtime();
    assert.equal(settings.boatMotionEnabled, true);
    media.matches = true;
    assert.equal(settings.boatMotionEnabled, false);
    assert.equal(settings.cameraShakeEnabled, false);
    assert.ok(settings.lightningScale < 1);
    settings.set('followSystem', false);
    settings.set('reduceBoat', true);
    assert.equal(settings.boatMotionEnabled, false);
    assert.equal(settings.cameraShakeEnabled, true);
    assert.equal(settings.lightningScale, 1);
    settings.set('reduceLightning', true);
    assert.ok(settings.lightningScale < 1);
    assert.equal(settings.lightningIntensity(10), 0.22);
    assert.equal(settings.lightningIntensity(-1), 0);
});

test('settings persist, validate input, and tolerate blocked or malformed storage', () => {
    const first = runtime();
    first.settings.set('seed', 0);
    first.settings.set('reduceShake', true);
    const second = runtime({ saved: first.stored() });
    assert.equal(second.settings.values.seed, 0);
    assert.equal(second.settings.cameraShakeEnabled, false);
    for (const invalid of [NaN, -1, 2.5, 4294967296]) assert.equal(second.settings.set('seed', invalid), false);
    assert.equal(second.settings.set('reduceBoat', 'yes'), false);
    assert.equal(second.settings.set('unknown', true), false);
    assert.equal(runtime({ saved: '{' }).settings.values.seed, 20261018);
    const blocked = runtime({ storageBlocked: true }).settings;
    assert.equal(blocked.set('reduceShake', true), true);
    assert.equal(blocked.cameraShakeEnabled, false);
});
