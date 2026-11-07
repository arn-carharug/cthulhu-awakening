// Ritual XXXVII — spatial audio: an HRTF-placed creature presence and directional distant thunder.
// Uses a recording fake of the Web Audio API; this checks routing and parameters, not what a
// listener actually hears (headphone listening remains a human QA item).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');

function param(value = 0) {
    return {
        value, targets: [],
        setValueAtTime(v) { this.value = v; },
        setTargetAtTime(v, time) { this.targets.push({ v, time }); this.value = v; },
        linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}
    };
}

function fakeAudioContext({ panner = true, modernListener = true } = {}) {
    const created = [];
    const node = (kind, extra = {}) => {
        const n = { kind, outputs: [], connect(target) { n.outputs.push(target); return target; }, disconnect() {}, ...extra };
        created.push(n);
        return n;
    };
    const listener = modernListener
        ? Object.fromEntries(['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upX', 'upY', 'upZ'].map((k) => [k, param()]))
        : { calls: [], setPosition(...a) { this.calls.push(['position', ...a]); }, setOrientation(...a) { this.calls.push(['orientation', ...a]); } };
    class AudioContext {
        constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = node('destination'); this.listener = listener; this.created = created; }
        resume() { return Promise.resolve(); }
        createGain() { return node('gain', { gain: param(1) }); }
        createDynamicsCompressor() { return node('compressor', { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); }
        createBiquadFilter() { return node('filter', { frequency: param(), Q: param() }); }
        createOscillator() { return node('oscillator', { frequency: param(), start() {}, stop() {} }); }
        createBufferSource() { return node('source', { start(when) { this.startedAt = when; }, stop() {} }); }
        createStereoPanner() { return node('stereo', { pan: param() }); }
        createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    }
    if (panner) {
        AudioContext.prototype.createPanner = function createPanner() {
            return node('panner', { positionX: param(), positionY: param(), positionZ: param() });
        };
    }
    return AudioContext;
}

function audioSystem(options) {
    const context = vm.createContext({ localStorage: { getItem: () => null, setItem() {} } });
    context.window = context;
    context.AudioContext = fakeAudioContext(options);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/audio-system.js'), 'utf8'), context);
    return new context.RitualAudioSystem();
}

const panners = (audio) => audio.context.created.filter((n) => n.kind === 'panner');

test('creature presence is an HRTF-panned loop on the ambient bus, silent until the awakening', async () => {
    const audio = audioSystem();
    await audio.enable();
    const { gain, panner } = audio.presence;
    assert.equal(panner.panningModel, 'HRTF');
    assert.equal(panner.distanceModel, 'inverse');
    assert.ok(gain.outputs.includes(panner), 'presence gain feeds the panner');
    assert.ok(panner.outputs.includes(audio.ambientBus), 'panner feeds the ambient mix');
    assert.equal(gain.gain.value, 0, 'silent before the awakening');
});

test('presence follows awakening progress, dips in the hush beats, and stops on reset', async () => {
    const audio = audioSystem();
    await audio.enable();
    const level = (progress) => { audio.setAwakening(progress); return audio.presence.gain.gain.value; };
    assert.equal(level(0.1), 0, 'not yet present early in the sequence');
    const mid = level(0.5);
    const late = level(0.95);
    assert.ok(mid > 0 && late > mid, `rises with progress (${mid} -> ${late})`);
    assert.ok(level(0.55) < mid, 'drops in the scripted hush');
    audio.reset();
    assert.equal(audio.presence.gain.gain.value, 0);
});

test('listener follows the camera and the presence follows the creature', async () => {
    const audio = audioSystem();
    await audio.enable();
    audio.updateListener([10, 1.3, 60], [0, 0, -1], [0, 1, 0]);
    const l = audio.context.listener;
    assert.deepEqual([l.positionX.value, l.positionY.value, l.positionZ.value], [10, 1.3, 60]);
    assert.deepEqual([l.forwardX.value, l.forwardY.value, l.forwardZ.value], [0, 0, -1]);
    assert.deepEqual([l.upX.value, l.upY.value, l.upZ.value], [0, 1, 0]);
    audio.setCreaturePosition(8, 43.75, -80);
    const p = audio.presence.panner;
    assert.deepEqual([p.positionX.value, p.positionY.value, p.positionZ.value], [8, 43.75, -80]);
});

test('browsers with only the legacy listener API still get position and orientation', async () => {
    const audio = audioSystem({ modernListener: false });
    await audio.enable();
    audio.updateListener([1, 2, 3], [0, 0, -1], [0, 1, 0]);
    assert.deepEqual(audio.context.listener.calls, [['position', 1, 2, 3], ['orientation', 0, 0, -1, 0, 1, 0]]);
});

test('without PannerNode the presence is unpanned and nothing throws', async () => {
    const audio = audioSystem({ panner: false });
    await audio.enable();
    assert.equal(audio.presence.panner, null);
    assert.ok(audio.presence.gain.outputs.includes(audio.ambientBus));
    audio.setCreaturePosition(0, 0, -80);
    audio.distantThunder(1, 0.5);
});

test('distant thunder is placed on the strike side of the horizon and arrives after the flash', async () => {
    const audio = audioSystem();
    await audio.enable();
    audio.updateListener([10, 1, 60], [0, 0, -1], [0, 1, 0]);
    const before = panners(audio).length;
    audio.distantThunder(1.2, -0.8);
    audio.distantThunder(1.2, 0.8);
    const [left, right] = panners(audio).slice(before);
    assert.ok(left.positionX.value < 10 && right.positionX.value > 10, 'left/right follow the strike direction');
    assert.ok(left.positionZ.value < 60, 'thunder comes from the horizon ahead');
    const sources = audio.context.created.filter((n) => n.kind === 'source' && n.startedAt !== undefined);
    assert.ok(sources.slice(-2).every((s) => s.startedAt >= 0.45), 'thunder is delayed after the flash');
});

test('distant thunder respects mute and pause', async () => {
    const audio = audioSystem();
    await audio.enable();
    const count = () => audio.context.created.length;
    audio.setPaused(true);
    let n = count();
    audio.distantThunder(1, 0);
    assert.equal(count(), n, 'no thunder while paused');
    audio.setPaused(false);
    await audio.toggle(); // mute
    n = count();
    audio.distantThunder(1, 0);
    assert.equal(count(), n, 'no thunder while muted');
});

test('the scene drives the listener, the creature position and natural thunder', () => {
    const testFile = path.join(__dirname, 'ritual-08.test.js');
    const source = fs.readFileSync(testFile, 'utf8');
    const sandbox = { require: createRequire(testFile), __dirname, module: { exports: {} }, console, AbortController };
    vm.runInNewContext(`${source.slice(0, source.indexOf('\ntest('))}\nmodule.exports = createScene;`, sandbox);
    const scene = sandbox.module.exports(true);
    scene.STATE.gl = new Proxy({}, { get: (_, k) => (typeof k === 'string' && /^[A-Z0-9_]+$/.test(k) ? 0 : () => null) });
    Object.assign(scene.get('glCanvas'), { clientWidth: 800, clientHeight: 600, width: 800, height: 600 });
    scene.STATE.canvas = scene.get('glCanvas');
    const calls = { listener: [], creature: [], thunder: [] };
    scene.ritualAudio.updateListener = (p, f, u) => calls.listener.push([[...p], [...f], [...u]]);
    scene.ritualAudio.setCreaturePosition = (...xyz) => calls.creature.push(xyz);
    scene.ritualAudio.distantThunder = (...args) => calls.thunder.push(args);
    scene.inspect();
    scene.context.drawScene(16);
    scene.context.drawScene(32);
    assert.equal(calls.listener.length, 2, 'listener updated every frame');
    assert.deepEqual(calls.listener[1][1], [...scene.STATE.cameraFront]);
    const [x, y, z] = calls.creature.at(-1);
    const world = scene.context.GameConfig.world;
    assert.equal(z, world.creatureBasePosition[2] + scene.STATE.omen.creatureOffset[1]);
    assert.ok(y > world.creatureBasePosition[1], 'source sits at head height above the model origin');
    assert.ok(Number.isFinite(x));
    scene.STATE.lightning.direction = -0.6;
    scene.sceneEvents.emit('weather:lightning', { intensity: 1.1 });
    assert.deepEqual(calls.thunder, [[1.1, -0.6]]);
});
