// Ritual XLI — gaze-reactive dread: the heartbeat quickens and a low drone opens up the more directly
// the player looks at the creature. Uses a recording fake of the Web Audio API, so it checks
// scheduling, levels and routing, not how it sounds (headphone listening remains a human QA item).
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

function fakeAudioContext() {
    const created = [];
    const node = (kind, extra = {}) => {
        const n = { kind, outputs: [], connect(target) { n.outputs.push(target); return target; }, disconnect() {}, ...extra };
        created.push(n);
        return n;
    };
    return class AudioContext {
        constructor() {
            this.currentTime = 0; this.sampleRate = 8000; this.created = created;
            this.destination = node('destination');
            this.listener = { setPosition() {}, setOrientation() {} };
        }
        resume() { return Promise.resolve(); }
        createGain() { return node('gain', { gain: param(1) }); }
        createDynamicsCompressor() { return node('compressor', { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); }
        createBiquadFilter() { return node('filter', { frequency: param(), Q: param() }); }
        createOscillator() {
            return node('oscillator', { frequency: param(), start(when) { this.startedAt = when; }, stop() {} });
        }
        createBufferSource() { return node('source', { start() {}, stop() {} }); }
        createPanner() { return node('panner', { positionX: param(), positionY: param(), positionZ: param() }); }
        createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    };
}

function loadContext(files) {
    const values = new Map();
    const context = vm.createContext({ localStorage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) } });
    context.window = context;
    context.AudioContext = fakeAudioContext();
    for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
    return context;
}

async function enabledAudio() {
    const context = loadContext(['audio-system']);
    const audio = new context.RitualAudioSystem();
    await audio.enable();
    return audio;
}

// Heartbeat thumps are the 57 Hz oscillators (the "lub" of each lub-dub).
const beatTimes = (audio) => audio.context.created
    .filter((n) => n.kind === 'oscillator' && n.frequency.value === 57 && n.startedAt !== undefined)
    .map((n) => n.startedAt);

// Simulates `seconds` of 60 fps frames with a constant gaze and returns the beat start times.
function run(audio, gaze, seconds, scale = 1) {
    const before = beatTimes(audio).length;
    for (let frame = 0; frame < seconds * 60; frame++) {
        audio.context.currentTime += 1 / 60;
        audio.setGaze(gaze, scale);
    }
    return beatTimes(audio).slice(before);
}

const meanInterval = (times) => (times.at(-1) - times[0]) / (times.length - 1);

test('gaze is 0 when looking away, 1 when looking straight at the head, and rises monotonically', () => {
    const { DiscoverySystem } = loadContext(['discovery-system']);
    const target = [0, 0, -10];
    assert.equal(DiscoverySystem.gaze([0, 0, -1], target), 1);
    assert.equal(DiscoverySystem.gaze([1, 0, 0], target), 0);
    assert.equal(DiscoverySystem.gaze([0, 0, 1], target), 0);
    assert.equal(DiscoverySystem.gaze([0, 0, 0], target), 0, 'degenerate vectors are not a gaze');
    let previous = -1;
    for (let degrees = 50; degrees >= 0; degrees -= 2) {
        const r = (degrees * Math.PI) / 180;
        const g = DiscoverySystem.gaze([Math.sin(r), 0, -Math.cos(r)], target);
        assert.ok(g >= previous, `${degrees} deg`);
        previous = g;
    }
    const at20 = DiscoverySystem.gaze([Math.sin(0.349), 0, -Math.cos(0.349)], target);
    assert.ok(at20 > 0.2 && at20 < 0.8, `partial gaze at 20 degrees (${at20})`);
});

test('the heartbeat quickens and the drone opens as the gaze holds', async () => {
    const audio = await enabledAudio();
    assert.deepEqual(run(audio, 0, 3), [], 'no heartbeat while looking away');
    assert.equal(audio.dread.gain.gain.value, 0);
    const glance = run(audio, 0.3, 8);
    const glanceDrone = audio.dread.gain.gain.value;
    const glanceCutoff = audio.dread.filter.frequency.value;
    const stare = run(audio, 1, 8);
    assert.ok(glance.length >= 4 && stare.length > glance.length, `${glance.length} -> ${stare.length} beats in 8 s`);
    const bpm = (times) => 60 / meanInterval(times);
    assert.ok(Math.abs(bpm(stare) - 102) < 2, `staring: ${bpm(stare).toFixed(1)} bpm`);
    assert.ok(bpm(glance) > 60 && bpm(glance) < 70, `glance: ${bpm(glance).toFixed(1)} bpm`);
    assert.ok(audio.dread.gain.gain.value > glanceDrone && audio.dread.filter.frequency.value > glanceCutoff);
    assert.ok(audio.dread.gain.outputs.includes(audio.ambientBus), 'drone is on the ambient mix');
});

test('looking away silences it, and a late frame never fires a burst of beats', async () => {
    const audio = await enabledAudio();
    run(audio, 1, 2);
    assert.deepEqual(run(audio, 0.01, 3), [], 'beats stop when the gaze drops');
    run(audio, 1, 1);
    audio.context.currentTime += 4; // tab stalled for four seconds
    const before = beatTimes(audio).length;
    audio.setGaze(1);
    assert.ok(beatTimes(audio).length - before <= 1, 'at most one beat after a stall');
    assert.ok(beatTimes(audio).at(-1) >= audio.context.currentTime, 'no beats scheduled in the past');
});

test('pause, mute, the scripted hush and the comfort setting are respected; reset clears it', async () => {
    const audio = await enabledAudio();
    audio.setPaused(true);
    assert.deepEqual(run(audio, 1, 2), [], 'silent while paused');
    audio.setPaused(false);
    await audio.toggle();
    assert.deepEqual(run(audio, 1, 2), [], 'silent while muted');
    await audio.toggle();
    run(audio, 1, 3);
    const full = audio.dread.gain.gain.value;
    audio.setAwakening(0.55); // inside a hush beat
    run(audio, 1, 1);
    assert.ok(audio.dread.gain.gain.value < full * 0.1, 'the hush quiets the drone too');
    audio.setAwakening(0.7);
    const softened = run(audio, 1, 6, 0.35);
    assert.ok(audio.dread.gain.gain.value < full * 0.2, 'softened drone');
    assert.ok(60 / meanInterval(softened) < 72, 'softened heartbeat stays slow');
    audio.reset();
    assert.equal(audio.dread.gain.gain.value, 0);
    assert.equal(audio.dread.level, 0);
});

test('the drone follows the omen tone', async () => {
    const audio = await enabledAudio();
    audio.setOmen('black-tide');
    assert.deepEqual([...audio.dread.oscillators.map(({ oscillator }) => oscillator.frequency.value)], [41, 82 * 0.503, 61.5]);
});

test('"Soften heartbeat" is a saved comfort option that ignores the reduced-motion preference', () => {
    const context = loadContext(['comfort-settings']);
    context.matchMedia = () => ({ matches: true });
    const settings = new context.ComfortSettings();
    assert.equal(settings.dreadScale, 1);
    assert.equal(settings.set('reduceDread', true), true);
    assert.equal(new context.ComfortSettings().dreadScale, 0.35, 'persisted');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /id="comfort-dread"/);
    assert.match(fs.readFileSync(path.join(root, 'js/scene-interaction.js'), 'utf8'), /'comfort-dread': 'reduceDread'/);
});

test('the scene feeds the gaze only once the creature is near, and only when looking at its head', () => {
    const testFile = path.join(__dirname, 'ritual-08.test.js');
    const source = fs.readFileSync(testFile, 'utf8');
    const sandbox = { require: createRequire(testFile), __dirname, module: { exports: {} }, console, AbortController };
    vm.runInNewContext(`${source.slice(0, source.indexOf('\ntest('))}\nmodule.exports = createScene;`, sandbox);
    const scene = sandbox.module.exports(true);
    scene.STATE.gl = new Proxy({}, { get: (_, k) => (typeof k === 'string' && /^[A-Z0-9_]+$/.test(k) ? 0 : () => null) });
    Object.assign(scene.get('glCanvas'), { clientWidth: 800, clientHeight: 600, width: 800, height: 600 });
    scene.STATE.canvas = scene.get('glCanvas');
    const gazes = [];
    let head = null;
    scene.ritualAudio.setGaze = (amount, scale) => gazes.push([amount, scale]);
    scene.ritualAudio.setCreaturePosition = (...xyz) => { head = xyz; };
    scene.inspect();
    let t = 16;
    const frame = () => { scene.context.drawScene((t += 16)); return gazes.at(-1); };

    const lookAtHead = () => {
        const camera = scene.context.sceneRenderer.getCameraPosition();
        const d = head.map((v, i) => v - camera[i]);
        const n = Math.hypot(...d);
        scene.STATE.cameraFront = d.map((v) => v / n);
    };
    frame();
    lookAtHead();
    assert.deepEqual(frame(), [0, 1], 'before the awakening the creature is not there to watch');

    scene.STATE.awakeningStarted = true;
    scene.STATE.awakeningTimeline.complete = true;
    frame();
    lookAtHead();
    const [staring] = frame();
    assert.ok(staring > 0.95, `staring at the risen creature (${staring})`);
    scene.STATE.cameraFront = [1, 0, 0];
    assert.equal(frame()[0], 0, 'looking away');

    scene.comfortSettings.set('reduceDread', true);
    assert.equal(frame()[1], 0.35, 'comfort scale is passed through');
    scene.STATE.witness.complete = true;
    lookAtHead();
    assert.equal(frame()[0], 0, 'silent once the ending is decided');
});
