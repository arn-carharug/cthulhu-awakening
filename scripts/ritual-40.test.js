// Ritual XL — Gerstner chop, crest foam and moon glint on the ocean.
// The look itself was checked by eye in a real browser (before/after screenshots, not committed); these tests pin the
// parts that can silently break: the chop table reaching the shader, the boat riding the same
// surface, and crests that sharpen without folding over at the largest waves the game produces.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
context.window = context;
for (const file of ['config', 'omen-system', 'wave-field']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context);
}
const { WaveField, GameConfig } = context;
const vertex = fs.readFileSync(path.join(root, 'shaders/vertex.glsl'), 'utf8');
const fragment = fs.readFileSync(path.join(root, 'shaders/fragment.glsl'), 'utf8');

test('the shader receives exactly the chop table the boat uses', () => {
    const count = WaveField.CHOP.length;
    assert.match(vertex, new RegExp(`uniform vec4 uChop\\[${count}\\];`));
    assert.match(vertex, new RegExp(`for \\(int i = 0; i < ${count}; i\\+\\+\\)`));
    assert.equal(count, 2, 'uChopShape packs two waves');
    assert.deepEqual(Array.from(WaveField.uniforms.chop),
        Array.from(new Float32Array(WaveField.CHOP.flatMap((w) => [w.dirX, w.dirZ, w.k, w.omega]))));
    assert.deepEqual(Array.from(WaveField.uniforms.shape),
        Array.from(new Float32Array(WaveField.CHOP.flatMap((w) => [w.amplitude, w.steepness]))));
    const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
    assert.match(main, /uniform4fv\([^;]*"uChop"\), window\.WaveField\.uniforms\.chop\)/);
    assert.match(main, /uniform4fv\([^;]*"uChopShape"\), window\.WaveField\.uniforms\.shape\)/);
});

test('chop directions are unit length and waves travel at a slow deep-water pace', () => {
    for (const w of WaveField.CHOP) {
        assert.ok(Math.abs(Math.hypot(w.dirX, w.dirZ) - 1) < 1e-12);
        const period = (2 * Math.PI) / (w.omega * GameConfig.ocean.waveSpeed);
        assert.ok(period > 4 && period < 15, `period ${period.toFixed(1)} s`);
        // Must be resolvable by the coarsest water grid (2-unit cells): at least 6 vertices per wave.
        assert.ok((2 * Math.PI) / w.k >= 12);
    }
});

test('crests sharpen but never fold into loops, even at the largest waves', () => {
    // Largest height multiplier: ocean height x strongest omen x full awakening surge (getWaveSettings).
    const strongestOmen = Math.max(...context.OmenSystem.PROFILES.map((p) => p.waveHeight ?? 1));
    const maxHeight = GameConfig.ocean.waveHeight * strongestOmen * (1 + 1.05);
    const fold = WaveField.CHOP.reduce((sum, w) => sum + w.steepness * w.k * w.amplitude, 0) * maxHeight;
    assert.ok(fold > 0.02, `chop is visible (${fold.toFixed(3)})`);
    assert.ok(fold < 1, `Jacobian stays positive (${fold.toFixed(3)})`);
});

test('the boat rides the chop and the height stays within the documented bound', () => {
    const swellOnly = (x, z, t) => (Math.sin(x * 0.055 + t) * 0.48 + Math.sin(z * 0.071 - t * 0.73) * 0.32
        + Math.sin((x + z) * 0.031 + t * 0.46) * 0.20);
    let differs = 0;
    for (let i = 0; i < 200; i++) {
        const x = (i * 37) % 300 - 150;
        const z = (i * 53) % 300 - 150;
        const t = i * 0.7;
        const sample = WaveField.sample(x, z, t, 1, 1);
        assert.ok(Math.abs(sample.height) <= WaveField.maxAmplitude + 1e-12);
        if (Math.abs(sample.height - swellOnly(x, z, t)) > 0.02) differs++;
    }
    assert.ok(differs > 100, 'chop changes the sampled surface');
});

test('foam no longer flickers per pixel and the glint uses the rippled normal', () => {
    const water = fragment.slice(fragment.indexOf('if (uIsWater) {'), fragment.indexOf('vec3 ao = '));
    assert.doesNotMatch(water, /randomNoise\(/, 'per-pixel white noise made foam shimmer');
    assert.match(water, /stoneNoise\(/, 'foam is broken up by smooth value noise');
    assert.match(water, /vCrest/, 'crest foam follows the Gerstner fold');
    assert.match(water, /reflect\(-viewDirection, surfaceNormal\)/);
    assert.match(fragment, /smoothstep\(18\.0, 70\.0, viewDistance\)/, 'ripples fade out before they alias');
});
