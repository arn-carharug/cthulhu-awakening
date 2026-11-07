// Ritual XXXIV — QA-F04: measure gl-matrix buffer allocations on the real per-frame call chain.
//
// Scope of this measurement: every vec3/vec4/mat4 buffer created through gl-matrix (create,
// clone, fromValues, ...) while the production drawScene() runs with a stubbed WebGL context.
// It does not count plain JS objects/arrays and is not a browser GC profile or FPS measurement.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const testFile = path.join(__dirname, 'ritual-08.test.js');
const localRequire = createRequire(testFile);
const glMatrix = localRequire('../js/vendor/gl-matrix-min.js');

// Every gl-matrix buffer is constructed through ARRAY_TYPE; a counting subclass sees all of them.
let allocations = 0;
class CountingFloat32Array extends Float32Array {
    constructor(...args) { super(...args); allocations++; }
}
glMatrix.glMatrix.setMatrixArrayType(CountingFloat32Array);

function loadCreateScene() {
    const source = fs.readFileSync(testFile, 'utf8');
    const sandbox = { require: localRequire, __dirname, module: { exports: {} }, console, AbortController };
    vm.runInNewContext(`${source.slice(0, source.indexOf('\ntest('))}\nmodule.exports = createScene;`, sandbox);
    return sandbox.module.exports;
}
const createScene = loadCreateScene();

// No-op WebGL: enum lookups return 0, every method returns null.
const stubGL = new Proxy({}, {
    get: (_, key) => (typeof key === 'string' && /^[A-Z0-9_]+$/.test(key) ? 0 : () => null)
});

function renderingScene() {
    const scene = createScene(true);
    scene.STATE.gl = stubGL;
    Object.assign(scene.get('glCanvas'), { clientWidth: 800, clientHeight: 600, width: 800, height: 600 });
    scene.STATE.canvas = scene.get('glCanvas');
    scene.inspect();
    let clock = 0;
    const frames = (count) => {
        scene.context.drawScene(clock += 16); // warm-up frame, not counted
        allocations = 0;
        for (let i = 0; i < count; i++) scene.context.drawScene(clock += 16);
        return allocations;
    };
    return { scene, frames };
}

test('QA-F04: drawScene creates no gl-matrix buffers while sailing', () => {
    const { frames } = renderingScene();
    assert.equal(frames(120), 0);
});

test('QA-F04: drawScene creates no gl-matrix buffers while inspecting the compass', () => {
    const { scene, frames } = renderingScene();
    scene.STATE.compassInspectMode = true;
    assert.equal(frames(120), 0);
});

test('QA-F04: drawScene creates no gl-matrix buffers through awakening, eyes, shake and lit torch', () => {
    const { scene, frames } = renderingScene();
    scene.STATE.awakeningStarted = true;
    scene.STATE.awakeningTimeline.start();
    scene.STATE.cinematic.eyes = true;
    assert.equal(frames(120), 0, 'awakening');
    scene.STATE.torchLit = true;
    scene.STATE.cinematic.shake = 0.5;
    assert.equal(frames(120), 0, 'lit torch with camera shake');
    scene.STATE.awakeningTimeline.complete = true;
    assert.equal(frames(120), 0, 'witness phase');
});

test('QA-F04: the counter does detect a per-frame allocation', () => {
    const { scene, frames } = renderingScene();
    const original = scene.context.sceneRenderer.getCameraPosition;
    scene.context.sceneRenderer.getCameraPosition = function leaky() { return glMatrix.vec3.clone(original.call(this)); };
    assert.ok(frames(10) >= 10, 'a deliberately leaky helper is counted');
});

test('QA-F04: hand-held torch transform is unchanged by buffer reuse', () => {
    const { scene } = renderingScene();
    const S = scene.STATE;
    const { vec3, mat4 } = glMatrix;
    S.torchLit = true;
    S.cameraFront = vec3.fromValues(0.3, -0.2, -0.93);
    S.shipPosition = vec3.fromValues(4, 0, 25);

    // Reference: the previous allocating implementation.
    const camera = [...scene.getCameraPosition()];
    const front = vec3.normalize(vec3.create(), S.cameraFront);
    const right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), front, [0, 1, 0]));
    const up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), right, front));
    const pos = vec3.clone(camera);
    vec3.scaleAndAdd(pos, pos, front, 0.45);
    vec3.scaleAndAdd(pos, pos, right, 0.22);
    vec3.scaleAndAdd(pos, pos, up, -0.18);
    const expected = mat4.create();
    mat4.translate(expected, expected, pos);
    mat4.rotateY(expected, expected, -Math.atan2(front[0], -front[2]));
    mat4.rotateX(expected, expected, Math.asin(front[1]));
    mat4.rotateX(expected, expected, -Math.PI / 8);
    mat4.scale(expected, expected, [0.08, 0.08, 0.08]);

    const target = S.torchMatrix;
    const actual = scene.context.getFPSTorchMatrix(target);
    assert.equal(actual, target, 'writes into the caller-provided matrix');
    for (let i = 0; i < 16; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-6, `element ${i}`);
});
