const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createModularHarness() {
    const listeners = new Map();
    const elements = new Map();
    function element(id, tagName = 'DIV') {
        const handlers = new Map();
        const classes = new Set();
        return {
            id, tagName, hidden: ['pause-screen', 'ending-card', 'witness-focus', 'input-status', 'discovery-card', 'choice-card'].includes(id),
            textContent: '', value: '', dataset: {},
            style: { setProperty() {}, transform: '' },
            classList: {
                add: (c) => classes.add(c),
                remove: (c) => classes.delete(c),
                toggle: (c, force) => { if (force) classes.add(c); else classes.delete(c); },
                contains: (c) => classes.has(c)
            },
            addEventListener: (name, fn) => {
                if (!handlers.has(name)) handlers.set(name, []);
                handlers.get(name).push(fn);
            },
            removeEventListener: (name, fn) => {
                const list = handlers.get(name) || [];
                const idx = list.indexOf(fn);
                if (idx !== -1) list.splice(idx, 1);
            },
            dispatch(name, ev) { (handlers.get(name) || []).forEach(fn => fn(ev)); },
            click() { this.dispatch('click', { target: this }); },
            focus() {},
            querySelector: (sel) => get(`${id}:${sel}`),
            querySelectorAll: () => []
        };
    }
    function get(id) {
        if (!elements.has(id)) elements.set(id, element(id));
        return elements.get(id);
    }
    const objectives = ['compass', 'rlyeh', 'lantern', 'witness'].map((id) => {
        const item = get(`objective-${id}`);
        item.dataset.objective = id;
        return item;
    });

    const document = {
        hidden: false, activeElement: null, pointerLockElement: null,
        getElementById: get, querySelector: get, querySelectorAll: () => objectives,
        addEventListener: (name, fn) => {
            if (!listeners.has(name)) listeners.set(name, []);
            listeners.get(name).push(fn);
        },
        removeEventListener: (name, fn) => {
            const list = listeners.get(name) || [];
            const idx = list.indexOf(fn);
            if (idx !== -1) list.splice(idx, 1);
        },
        exitPointerLock() { this.pointerLockElement = null; }
    };
    const vector = {
        create: () => [0, 0, 0], fromValues: (...v) => v, clone: (v) => [...v],
        add(out, a, b) { for (let i = 0; i < 3; i++) out[i] = a[i] + b[i]; return out; }
    };
    const context = vm.createContext({
        console, document, performance: { now: () => 0 },
        navigator: { userAgent: 'Node modular harness' },
        localStorage: { getItem: () => null, setItem() {} },
        AbortController,
        glMatrix: { vec3: vector, vec4: vector, mat4: { create: () => [] } },
        requestAnimationFrame() {},
        addEventListener: (name, fn) => {
            if (!listeners.has(name)) listeners.set(name, []);
            listeners.get(name).push(fn);
        },
        removeEventListener: (name, fn) => {
            const list = listeners.get(name) || [];
            const idx = list.indexOf(fn);
            if (idx !== -1) list.splice(idx, 1);
        }
    });
    context.window = context;

    for (const file of [
        'config', 'timeline', 'scene-controls', 'comfort-settings', 'navigation',
        'collision-system', 'discovery-system', 'wave-field', 'voyage-archive',
        'performance-monitor', 'audio-system', 'narration-catalog', 'narration-system',
        'ritual-presentation', 'game-loop', 'omen-system', 'weather-system', 'asset-loader',
        'scene-lifecycle', 'scene-renderer', 'scene-interaction'
    ]) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
    }
    return { context, listeners, elements, get };
}

test('shared GameConfig.world defines single source of truth for landmarks and collision geometry', () => {
    const { context } = createModularHarness();
    const config = context.GameConfig;
    assert.ok(config?.world, 'GameConfig must expose world coordinates');
    assert.deepEqual([...config.world.ruinsPosition], [0, 0, -30]);
    assert.deepEqual([...config.world.initialShipPosition], [10, 0, 60]);
    assert.deepEqual([...config.world.stonePosition], [-9, -1.4, 17]);
    assert.deepEqual([...config.world.journalPosition], [8, -2.7, 43], 'matches the journal players actually find');
    assert.equal(config.world.cthulhuScale, 25);
    assert.equal(config.world.pillarRadius, 3.2);

    const collision = new context.CollisionSystem();
    const stoneObstacle = collision.obstacles.find(o => o.id === 'stone');
    assert.deepEqual([...stoneObstacle.position], [...config.world.stonePosition]);
    assert.equal(stoneObstacle.radius, config.world.stoneRadius);

    const leftPillar = collision.obstacles.find(o => o.id === 'pillar_left');
    assert.deepEqual([...leftPillar.position], [...config.world.pillarPositions[0]]);
});

test('SceneLifecycle unifies pause, reset, awakening, and endings without UI/simulation state drift', () => {
    const { context, get } = createModularHarness();
    const events = new context.SceneRuntime.EventBus();
    const audio = new context.RitualAudioSystem();
    const controls = new context.SceneControls();
    const archive = new context.VoyageArchive();
    const cycle = new context.RitualCycle(events);
    const omens = new context.OmenSystem(events);
    const collision = new context.CollisionSystem();
    const discoveries = new context.DiscoverySystem(collision);
    const comfort = new context.ComfortSettings();
    const presentation = new context.RitualPresentation(events, comfort);
    const timeline = new context.SceneRuntime.SceneTimeline({ duration: 42, events });

    const STATE = {
        gl: null, canvas: get('glCanvas'),
        shipPosition: [10, 0, 60],
        cameraFront: [0, 0, -1], cameraUp: [0, 1, 0],
        yaw: -90, pitch: 0, paused: false,
        awakeningStarted: false, torchLit: false,
        cthulhuRiseY: 0,
        cinematic: { shake: 0, torchShock: 0 },
        witness: { active: false, focus: 0, complete: false },
        awakeningTimeline: timeline
    };

    const ctx = {
        STATE, sceneEvents: events, ritualAudio: audio, sceneControls: controls,
        voyageArchive: archive, ritualCycle: cycle, omenSystem: omens,
        collisionSystem: collision, discoveries, comfortSettings: comfort,
        ritualPresentation: presentation, narrator: { reset() {}, setHidden() {}, stop() {} },
        compassInspectedOnce: true, pillarsRiseY: 0
    };

    const lifecycle = new context.SceneLifecycle(ctx);

    // 1. Pause
    lifecycle.setPaused(true, true);
    assert.equal(STATE.paused, true);
    assert.equal(audio.paused, true);
    assert.equal(get('pause-screen').hidden, false);

    lifecycle.setPaused(false);
    assert.equal(STATE.paused, false);
    assert.equal(audio.paused, false);
    assert.equal(get('pause-screen').hidden, true);

    // 2. Awakening
    lifecycle.startAwakening();
    assert.equal(STATE.awakeningStarted, true);
    assert.equal(timeline.running, true);

    // 3. Ending resolution
    timeline.elapsed = 42;
    timeline.complete = true;
    lifecycle.resolveEnding('witness');
    assert.equal(STATE.witness.complete, true);
    assert.equal(STATE.witness.outcome, 'witness');
    assert.ok(archive.summary().includes('Endings 1/2'));

    // 4. Reset
    lifecycle.reset();
    assert.equal(STATE.awakeningStarted, false);
    assert.equal(STATE.witness.complete, false);
    assert.equal(timeline.running, false);
    assert.equal(cycle.elapsedSeconds, 0);
});

test('SceneInteraction prevents listener duplication across multiple bind calls', () => {
    const { context, get, listeners } = createModularHarness();
    const dummyState = { canvas: get('glCanvas'), paused: false };
    const interaction = new context.SceneInteraction({
        STATE: dummyState,
        sceneLifecycle: { setPaused() {}, reset() {} },
        sceneControls: { clear() {}, keys: new Set() },
        ritualAudio: { setVolume() {}, setMix() {}, toggle() {} },
        discoveries: { sites: [] }
    });

    interaction.bind();
    const initialHandlerCount = interaction.handlers.length;
    assert.ok(initialHandlerCount > 10, 'interaction should register key and UI handlers');

    // Repeated call to bind must not add duplicate listeners
    interaction.bind();
    assert.equal(interaction.handlers.length, initialHandlerCount);

    // Unbind cleanly detaches all listeners
    interaction.unbind();
    assert.equal(interaction.handlers.length, 0);
    assert.equal(interaction.bound, false);
});
