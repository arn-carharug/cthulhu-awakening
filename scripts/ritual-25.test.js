const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('GameConfig defaults to medium quality preset while preserving low and high options', () => {
    const context = vm.createContext({});
    context.window = context;
    vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), context);
    const config = context.GameConfig;

    assert.equal(config.defaultQuality, 'medium', 'default quality should be medium to protect lower-power hardware');
    assert.ok(config.qualityPresets.low);
    assert.ok(config.qualityPresets.medium);
    assert.ok(config.qualityPresets.high);

    assert.equal(config.qualityPresets.low.usePBR, false);
    assert.equal(config.qualityPresets.medium.usePBR, true, 'medium preset must preserve PBR aesthetics');
    assert.equal(config.qualityPresets.high.usePBR, true);

    assert.ok(config.qualityPresets.medium.waterSegments < config.qualityPresets.high.waterSegments);
    assert.ok(config.qualityPresets.medium.particles < config.qualityPresets.high.particles);
});

test('index.html selects medium quality preset by default on launch screen', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /<option value="medium" selected>Medium<\/option>/, 'index.html launch dropdown must default to medium');
});

test('frame buffers and throttled DOM updates eliminate per-frame allocations and thrashing', () => {
    const listeners = new Map();
    const elements = new Map();
    const writtenValues = { brightness: [], readout: [] };

    function element(id) {
        return {
            id, hidden: false, textContent: '', value: '', dataset: {}, style: {},
            classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
            addEventListener() {},
            setAttribute() {},
            getAttribute() {},
            querySelector: () => null,
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
        addEventListener() {}
    };

    const vector = {
        create: () => [0, 0, 0], fromValues: (...v) => v, clone: (v) => [...v],
        add(out, a, b) { for (let i = 0; i < 3; i++) out[i] = a[i] + b[i]; return out; },
        normalize(out, a) { return out; },
        scaleAndAdd(out, a, b, s) { for (let i = 0; i < 3; i++) out[i] = a[i] + b[i] * s; return out; },
        dot: () => 1
    };
    const matrix = {
        create: () => new Float32Array(16),
        identity: (m) => m,
        translate: (m) => m,
        rotateX: (m) => m,
        rotateY: (m) => m,
        rotateZ: (m) => m,
        scale: (m) => m,
        copy: (out, src) => out,
        clone: (m) => new Float32Array(m),
        perspective: () => {},
        lookAt: () => {}
    };

    const context = vm.createContext({
        console, document, performance: { now: () => 0 },
        navigator: { userAgent: 'Node optimization test' },
        localStorage: { getItem: () => null, setItem() {} },
        AbortController,
        glMatrix: { vec3: vector, vec4: vector, mat4: matrix },
        requestAnimationFrame() {},
        addEventListener() {}
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

    const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
    vm.runInContext(mainSource.slice(0, mainSource.indexOf('\n// BOOTSTRAP')), context);

    assert.ok(context.FRAME_BUFFERS, 'FRAME_BUFFERS pool must be defined');
    assert.ok(context.DOM_CACHE, 'DOM_CACHE must be defined');

    // Simulate 10 updateNavigation calls with identical positions
    const readoutElement = get('compass-readout');
    let domWriteCount = 0;
    Object.defineProperty(readoutElement, 'textContent', {
        get() { return this._val || ''; },
        set(val) {
            this._val = val;
            domWriteCount++;
        }
    });

    for (let i = 0; i < 10; i++) {
        context.updateNavigation();
    }
    assert.equal(domWriteCount, 1, 'identical navigation readings must not write to DOM on every frame');
});
