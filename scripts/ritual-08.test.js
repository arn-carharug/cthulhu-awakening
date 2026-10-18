const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

// Run the actual scene modules and event handlers, replacing only DOM/audio/GPU
// boundaries. This checks state integration without pretending to render WebGL.
function createScene(realMath = false) {
    const listeners = new Map();
    const elements = new Map();
    const documentListeners = new Map();
    function element(id, tagName = 'DIV') {
        const handlers = new Map();
        const classes = new Set();
        return {
            id, tagName, hidden: ['pause-screen', 'ending-card', 'witness-focus', 'input-status', 'discovery-card', 'choice-card'].includes(id),
            textContent: '', value: '', dataset: {}, style: { setProperty() {} },
            classList: {
                add: (name) => classes.add(name), remove: (name) => classes.delete(name),
                contains: (name) => classes.has(name),
                toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
            },
            addEventListener: (name, fn) => handlers.set(name, fn),
            dispatch(name, event) { handlers.get(name)?.(event); },
            click() { handlers.get('click')?.({ target: this, stopPropagation() {} }); },
            closest() { return ['BUTTON', 'INPUT', 'SELECT'].includes(this.tagName) ? this : null; },
            setAttribute() {},
            focus() { document.activeElement = this; dispatch(documentListeners, 'focusin', { target: this }); },
            querySelector: (selector) => get(`${id}:${selector}`),
            querySelectorAll: () => id === 'pause-screen' ? [get('pause-resume')]
                : id === 'ending-card' ? [get('ending-read'), get('ending-continue'), get('ending-restart')]
                    : id === 'discovery-card' ? [get('discovery-read'), get('discovery-close')] : [],
            requestPointerLock() { document.pointerLockElement = this; dispatch(documentListeners, 'pointerlockchange'); return Promise.resolve(); }
        };
    }
    function get(id) {
        if (!elements.has(id)) elements.set(id, element(id,
            /^(ending-(continue|restart)|pause-(resume|toggle)|sound-toggle)$/.test(id) ? 'BUTTON'
                : id === 'volume-control' ? 'INPUT' : 'DIV'));
        return elements.get(id);
    }
    function add(map, name, fn) {
        if (!map.has(name)) map.set(name, []);
        map.get(name).push(fn);
    }
    function dispatch(map, name, props = {}) {
        const event = { key: '', repeat: false, target: document.activeElement,
            preventDefault() {}, ...props };
        for (const fn of map.get(name) || []) fn(event);
    }
    const objectives = ['compass', 'rlyeh', 'lantern', 'witness'].map((id) => {
        const item = get(`objective-${id}`);
        item.dataset.objective = id;
        return item;
    });
    const document = {
        hidden: false, activeElement: null, pointerLockElement: null,
        getElementById: get, querySelector: get, querySelectorAll: () => objectives,
        addEventListener: (name, fn) => add(documentListeners, name, fn),
        exitPointerLock() { this.pointerLockElement = null; dispatch(documentListeners, 'pointerlockchange'); }
    };
    document.activeElement = get('glCanvas');
    const vector = {
        create: () => [0, 0, 0], fromValues: (...v) => v, clone: (v) => [...v],
        add(out, a, b) { for (let i = 0; i < 3; i++) out[i] = a[i] + b[i]; return out; }
    };
    const context = vm.createContext({
        console, document, performance: { now: () => 0 },
        navigator: { userAgent: 'Node DOM test harness; no real browser' },
        localStorage: { getItem: () => null, setItem() {} }, AbortController,
        glMatrix: realMath ? require('../js/vendor/gl-matrix-min.js') : { vec3: vector, vec4: vector, mat4: { create: () => [] } },
        requestAnimationFrame() {},
        addEventListener: (name, fn) => add(listeners, name, fn)
    });
    context.window = context;
    for (const file of ['config', 'timeline', 'scene-controls', 'comfort-settings', 'navigation', 'discovery-system', 'wave-field', 'voyage-archive', 'performance-monitor',
        'audio-system', 'narration-catalog', 'narration-system', 'ritual-presentation', 'game-loop', 'omen-system', 'weather-system', 'asset-loader']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
    }
    const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
    // Omit automatic GPU startup; all production handlers/functions remain intact.
    vm.runInContext(source.slice(0, source.indexOf('\n// BOOTSTRAP')) + `
        STATE.canvas = document.getElementById('glCanvas');
        STATE.performanceMonitor = new PerformanceMonitor(null);
        globalThis.scene = { STATE, sceneControls, ritualCycle, ritualPresentation, ritualAudio, narrator, inspectDiscovery,
            sceneEvents, resetScene, advanceScene, setScenePaused, requestScenePointerLock,
            comfortSettings, updateBoatMotion, getCameraPosition,
            voyageArchive, resolveEnding, openEndingChoice,
            main,
            isLookingAtRlyeh, startAwakening, lightLantern, updateWitnessPhase,
            inspect: () => { compassInspectedOnce = true; },
            uninspect: () => { compassInspectedOnce = false; } };
    `, context);
    return { ...context.scene, get, document, context,
        key: (key, options) => dispatch(listeners, 'keydown', { key, ...options }),
        keyup: (key) => dispatch(listeners, 'keyup', { key }),
        blur: () => dispatch(listeners, 'blur'),
        mouseMove: (props) => dispatch(listeners, 'mousemove', props),
        visibility(hidden) { document.hidden = hidden; dispatch(documentListeners, 'visibilitychange'); }
    };
}

test('five-second movement is equal at 30, 60, and 120 FPS; diagonals are normalized', () => {
    for (const fps of [30, 60, 120]) {
        for (const keys of [['w'], ['w', 'd']]) {
            const scene = createScene();
            scene.inspect();
            keys.forEach((key) => scene.key(key));
            scene.advanceScene(0);
            for (let frame = 1; frame <= fps * 5; frame++) scene.advanceScene(frame * 1000 / fps);
            const [x, , z] = scene.STATE.shipPosition;
            assert.ok(Math.abs(Math.hypot(x - 10, z - 60) - 45) < 1e-8);
            assert.ok(Math.abs(scene.ritualCycle.elapsedSeconds - 5) < 1e-8);
        }
    }
});

test('held movement stops the hull at the stone at different frame rates', () => {
    for (const fps of [30, 60, 120]) {
        const scene = createScene();
        scene.inspect();
        scene.STATE.shipPosition = [-9, 0, 35];
        scene.key('w');
        scene.advanceScene(0);
        for (let frame = 1; frame <= fps * 4; frame++) scene.advanceScene(frame * 1000 / fps);
        assert.ok(scene.STATE.shipPosition[2] > 22.94 && scene.STATE.shipPosition[2] < 22.96);
        scene.keyup('w'); scene.key('s');
        scene.advanceScene(4100);
        assert.ok(scene.STATE.shipPosition[2] > 23, 'reverse movement releases contact');
    }
});

test('key release, opposite inputs, UI focus, and compass/awakening gates stop movement', () => {
    const scene = createScene();
    scene.key('w');
    assert.equal(scene.sceneControls.keys.size, 0);
    scene.inspect();
    scene.key('w');
    scene.keyup('W');
    assert.equal(scene.sceneControls.keys.size, 0);
    scene.key('w'); scene.key('s');
    assert.equal(Math.hypot(...scene.sceneControls.movement([0, 0, -1], 9, 1)), 0);
    scene.get('volume-control').focus();
    scene.key('w');
    assert.equal(scene.sceneControls.keys.size, 0);
    scene.get('glCanvas').focus();
    scene.key('w'); scene.STATE.awakeningStarted = true;
    scene.advanceScene(0); scene.advanceScene(100);
    assert.equal(scene.STATE.shipPosition[2], 60);
});

test('blur clears held inputs, releases pointer lock, and pauses scene/audio', () => {
    const scene = createScene();
    scene.inspect(); scene.key('w'); scene.requestScenePointerLock(); scene.key('w');
    scene.advanceScene(0); scene.advanceScene(100);
    scene.blur();
    assert.equal(scene.sceneControls.keys.size, 0);
    assert.equal(scene.document.pointerLockElement, null);
    assert.equal(scene.STATE.paused, true);
    assert.equal(scene.ritualAudio.paused, true);
    assert.equal(scene.get('pause-screen').hidden, false);
    const elapsed = scene.ritualCycle.elapsedSeconds;
    scene.advanceScene(10000);
    assert.equal(scene.ritualCycle.elapsedSeconds, elapsed);
});

test('hidden time never advances the scene, cycle, captions, or ending countdown', () => {
    const scene = createScene();
    scene.ritualPresentation.show('Test caption', 1000);
    scene.ritualPresentation.completeWitness();
    scene.advanceScene(0); scene.advanceScene(100);
    const elapsed = scene.ritualCycle.elapsedSeconds;
    const remaining = scene.ritualPresentation.endingTimer;
    scene.visibility(true);
    scene.advanceScene(60000);
    scene.setScenePaused(false);
    assert.equal(scene.STATE.paused, true, 'cannot resume a hidden scene');
    assert.equal(scene.ritualCycle.elapsedSeconds, elapsed);
    assert.equal(scene.ritualPresentation.endingTimer, remaining);
    scene.visibility(false);
    assert.equal(scene.STATE.paused, true, 'returning requires deliberate resume');
    scene.get('pause-resume').click();
    scene.advanceScene(61000); scene.advanceScene(61100);
    assert.ok(Math.abs(scene.ritualCycle.elapsedSeconds - elapsed - 0.1) < 1e-8);
    assert.equal(scene.ritualAudio.paused, false);
});

test('ending releases mouse and focuses usable buttons; Tab stays in dialog', () => {
    const scene = createScene();
    scene.requestScenePointerLock();
    scene.ritualPresentation.completeWitness();
    scene.advanceScene(0);
    for (let frame = 1; frame <= 10; frame++) scene.advanceScene(frame * 100);
    assert.equal(scene.get('ending-card').hidden, false);
    assert.equal(scene.get('pause-screen').hidden, true);
    assert.equal(scene.STATE.paused, true);
    assert.equal(scene.document.pointerLockElement, null);
    assert.equal(scene.document.activeElement.id, 'ending-continue');
    scene.key('Tab');
    assert.equal(scene.document.activeElement.id, 'ending-restart');
    scene.key('Tab');
    assert.equal(scene.document.activeElement.id, 'ending-read');
    scene.key('Tab');
    assert.equal(scene.document.activeElement.id, 'ending-continue');
    scene.get('ending-continue').click();
    assert.equal(scene.STATE.paused, false);
    assert.equal(scene.document.pointerLockElement, scene.STATE.canvas);
});

test('ten resets clear inspection, captions, and pending endings without advancing cycle', () => {
    const scene = createScene();
    for (let run = 0; run < 10; run++) {
        scene.STATE.compassYaw = 3;
        scene.STATE.compassPitch = -1;
        scene.STATE.compassInspectMode = true;
        scene.STATE.compassHovered = true;
        scene.STATE.torchLit = true;
        scene.ritualPresentation.show('Old cycle', 3000);
        scene.ritualPresentation.completeWitness();
        scene.resetScene();
        assert.equal(scene.STATE.compassYaw, 0);
        assert.equal(scene.STATE.compassPitch, 0);
        assert.equal(scene.STATE.compassInspectMode, false);
        assert.equal(scene.STATE.compassHovered, false);
        assert.equal(scene.STATE.torchLit, false);
        assert.equal(scene.ritualCycle.cycle, 1);
        assert.equal(scene.ritualCycle.elapsedSeconds, 0);
        scene.advanceScene(run * 2000);
        scene.advanceScene(run * 2000 + 1500);
        assert.equal(scene.get('ending-card').hidden, true);
        assert.equal(scene.get('ritual-caption').textContent, '');
    }
    scene.get('ending-restart').click();
    assert.equal(scene.ritualCycle.cycle, 2);
});

test('R repetition does not reset repeatedly; buttons retain native keyboard actions', () => {
    const scene = createScene();
    scene.STATE.compassYaw = 1;
    scene.key('r', { repeat: true });
    assert.equal(scene.STATE.compassYaw, 1);
    scene.key('r');
    assert.equal(scene.STATE.compassYaw, 0);
    scene.STATE.compassYaw = 2;
    scene.get('sound-toggle').focus(); scene.key('r');
    assert.equal(scene.STATE.compassYaw, 2);
});

test('pointer-lock rejection has visible feedback and successful retry clears it', async () => {
    const scene = createScene();
    const request = scene.STATE.canvas.requestPointerLock;
    scene.STATE.canvas.requestPointerLock = () => Promise.reject(new Error('denied'));
    scene.requestScenePointerLock();
    await Promise.resolve();
    assert.equal(scene.get('input-status').hidden, false);
    scene.STATE.canvas.requestPointerLock = request;
    scene.requestScenePointerLock();
    assert.equal(scene.get('input-status').hidden, true);
});

test('performance reports raw 250ms frames while simulation advances only 100ms', () => {
    const scene = createScene();
    scene.advanceScene(0); scene.advanceScene(250); scene.advanceScene(500);
    const snapshot = scene.STATE.performanceMonitor.snapshot();
    assert.equal(snapshot.fps, 4);
    assert.equal(snapshot.p95FrameMs, 250);
    assert.equal(scene.ritualCycle.elapsedSeconds, 0.2);
    scene.ritualCycle.finish();
    scene.ritualCycle.update(10);
    assert.equal(scene.ritualCycle.elapsedSeconds, 0.2, 'finished stats stay frozen');
});

test('audio reset and pause stop scheduled one-shot sounds and cancel rumble envelopes', () => {
    const scene = createScene();
    const audio = scene.ritualAudio;
    const calls = [];
    const parameter = () => ({
        cancelScheduledValues: () => calls.push('cancel'),
        setTargetAtTime: (value) => calls.push(value)
    });
    audio.context = { currentTime: 1 };
    audio.master = { gain: parameter() };
    audio.rumble = { frequency: parameter() };
    audio.rumbleGain = { gain: parameter() };
    audio.windGain = { gain: parameter() };
    const sound = () => ({ stop: () => calls.push('stop') });
    audio.transients.add(sound());
    audio.reset();
    assert.equal(audio.transients.size, 0);
    assert.equal(calls.filter((value) => value === 'stop').length, 1);
    assert.equal(calls.filter((value) => value === 'cancel').length, 3);
    audio.transients.add(sound());
    audio.setPaused(true);
    assert.equal(audio.transients.size, 0);
    assert.equal(calls.at(-1), 0);
    audio.setVolume(1);
    assert.equal(calls.at(-1), 0, 'volume cannot unmute a paused scene');
    audio.setPaused(false);
    assert.equal(calls.at(-1), audio.outputGain());
});

test('comfort settings actually suppress 3D boat motion and camera shake', () => {
    const scene = createScene();
    scene.STATE.elapsedTime = 2;
    scene.STATE.cinematic.shake = 1;
    scene.updateBoatMotion();
    assert.notEqual(scene.STATE.boatMotion.bob, 0);
    const movingCamera = scene.getCameraPosition();
    scene.comfortSettings.set('reduceBoat', true);
    scene.comfortSettings.set('reduceShake', true);
    scene.updateBoatMotion();
    assert.equal(scene.STATE.boatMotion.bob, 0);
    assert.equal(scene.STATE.boatMotion.roll, 0);
    assert.equal(scene.STATE.boatMotion.pitch, 0);
    const stillCamera = scene.getCameraPosition();
    assert.equal(stillCamera[0], 10);
    assert.equal(stillCamera[1], 1.2);
    assert.notEqual(movingCamera[0], stillCamera[0]);
});

test('keyboard compass inspection unlocks movement only after lowering; arrows turn the camera', () => {
    const scene = createScene();
    scene.key('e');
    assert.equal(scene.STATE.compassInspectMode, true);
    assert.equal(scene.ritualCycle.completed.has('compass'), true);
    scene.key('c');
    scene.key('w');
    assert.equal(scene.sceneControls.keys.has('w'), true);
    scene.keyup('w');
    scene.key('ArrowRight');
    assert.equal(scene.STATE.yaw, -86);
    assert.ok(scene.STATE.cameraFront[0] > 0);
});

test('both endings freeze statistics and persist outcome; refusal requires deliberate confirmation', () => {
    for (const outcome of ['witness', 'refused']) {
        const scene = createScene();
        scene.resolveEnding(outcome);
        assert.equal(scene.STATE.witness.complete, false, 'cannot end before awakening finishes');
        scene.STATE.awakeningTimeline.complete = true;
        scene.STATE.torchLit = true;
        if (outcome === 'refused') {
            scene.openEndingChoice();
            assert.equal(scene.STATE.witness.complete, false);
            assert.equal(scene.STATE.paused, true);
            scene.get('reject-confirm').click();
            assert.equal(scene.STATE.torchLit, false);
        } else scene.resolveEnding(outcome);
        assert.equal(scene.STATE.witness.outcome, outcome);
        assert.equal(scene.ritualCycle.finished, true);
        assert.equal(scene.voyageArchive.data.endings[0], outcome);
        scene.resolveEnding(outcome);
        assert.equal(scene.voyageArchive.data.endings.length, 1);
        scene.resetScene();
        assert.equal(scene.voyageArchive.data.endings.length, 1, 'retry preserves discovered endings');
    }
});

test('context loss pauses and shows a reload path instead of silently continuing', async () => {
    const scene = createScene();
    scene.context.console = { ...console, error() {} };
    scene.STATE.canvas.getContext = () => null;
    await assert.rejects(scene.main(), /WebGL 2/);
    let prevented = false;
    scene.STATE.canvas.dispatch('webglcontextlost', { preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(scene.STATE.paused, true);
    assert.equal(scene.get('fatal-error').hidden, false);
    assert.ok(scene.get('fatal-message').textContent.includes('context was lost'));
});

test('all four omens support the complete loop with real vector math and reduced effects', () => {
    const encountered = new Set();
    for (const reduced of [false, true]) {
    for (let cycle = 1; cycle <= 4; cycle++) {
        const scene = createScene(true);
        scene.comfortSettings.set('reduceBoat', reduced);
        scene.comfortSettings.set('reduceShake', reduced);
        scene.comfortSettings.set('reduceLightning', reduced);
        scene.ritualCycle.cycle = cycle;
        scene.resetScene();
        encountered.add(scene.STATE.omen.id);
        scene.key('e'); scene.key('c'); scene.key('w');
        let timestamp = 0;
        for (let frame = 0; frame < 600 && !scene.STATE.awakeningStarted; frame++) {
            const delta = scene.advanceScene(timestamp);
            if (scene.isLookingAtRlyeh()) scene.startAwakening();
            scene.STATE.awakeningTimeline.update(delta);
            timestamp += 1000 / 60;
        }
        assert.equal(scene.STATE.awakeningStarted, true);
        scene.keyup('w');
        for (let frame = 0; frame < 2600 && !scene.STATE.awakeningTimeline.complete; frame++) {
            const delta = scene.advanceScene(timestamp);
            scene.STATE.awakeningTimeline.update(delta);
            timestamp += 1000 / 60;
        }
        assert.equal(scene.STATE.awakeningTimeline.complete, true);
        scene.lightLantern();
        const { mat4, vec3, vec4 } = scene.context.glMatrix;
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, [scene.STATE.omen.creatureOffset[0], 5, -80 + scene.STATE.omen.creatureOffset[1]]);
        mat4.scale(matrix, matrix, [25,25,25]);
        const head = vec4.transformMat4(vec4.create(), vec4.fromValues(0,1.55,1.39,1), matrix);
        const front = vec3.subtract(vec3.create(), head, scene.getCameraPosition());
        vec3.normalize(scene.STATE.cameraFront, front);
        for (let frame = 0; frame < 250 && !scene.STATE.witness.complete; frame++) {
            const delta = scene.advanceScene(timestamp); scene.updateWitnessPhase(delta, matrix); timestamp += 1000 / 60;
        }
        assert.equal(scene.STATE.witness.outcome, 'witness', scene.STATE.omen.id);
        assert.equal(scene.ritualCycle.completed.size, 4);
        assert.ok(scene.voyageArchive.data.endings.includes('witness'));
    }
    }
    assert.equal(encountered.size, 4);
});

test('mouse movement on the launch screen cannot rotate an uninitialized camera', () => {
    const scene = createScene();
    scene.STATE.canvas = null;
    scene.mouseMove({ movementX: 100, movementY: 100 });
    scene.mouseMove({ movementX: 100, movementY: 100 });
    assert.equal(scene.STATE.firstMouse, true);
    assert.equal(scene.STATE.yaw, -90);
    assert.equal(scene.STATE.pitch, 0);
});

test('narration adapter routes scene events, discovery cards, endings and reset', () => {
    const scene = createScene();
    const played = [];
    scene.narrator.play = (id, options) => { played.push({ id, options }); return Promise.resolve(true); };
    scene.sceneEvents.emit('awakening:eyes');
    assert.equal(played.at(-1).id, 'awakening.eyes');
    scene.sceneEvents.emit('timeline:complete');
    assert.equal(played.at(-1).id, 'witness.begin');
    scene.inspect(); scene.inspectDiscovery('journal');
    assert.equal(played.at(-1).id, 'discovery.journal');
    assert.equal(played.at(-1).options.modal, true);
    assert.equal(scene.STATE.paused, true);
    scene.get('discovery-close').click();
    assert.equal(scene.STATE.paused, false);
    scene.STATE.witness.outcome = 'refused';
    scene.sceneEvents.emit('ending:shown');
    assert.equal(played.at(-1).id, 'ending.refused');
    assert.equal(played.at(-1).options.modal, true);
    scene.narrator.seen.add('awakening.eyes');
    scene.resetScene();
    assert.equal(scene.narrator.seen.size, 0);
});
