// Ritual XXXVI — photosensitivity: no more than three flashes in any one-second period
// (WCAG 2.3.1, Xbox Accessibility Guideline 118), whatever the omen, seed or scripted strikes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
context.window = context;
vm.runInContext(fs.readFileSync(path.join(root, 'js/weather-system.js'), 'utf8'), context);
const { LightningSystem } = context.WeatherSystem;

const DT = 1 / 120;
const OMEN_INTERVAL_SCALES = [0.72, 0.86, 1.18, 1.62]; // OmenSystem profiles
const SCALE_EXTREMES = [0.45, 2]; // setProfile clamps to this range

// Runs one storm and returns the times at which brightness jumps up (flash onsets).
function storm(seed, scale, scripted) {
    const lightning = new LightningSystem(seed);
    lightning.setProfile({ intervalScale: scale });
    const onsets = [];
    let previous = 0;
    let t = 0;
    for (let step = 0; step < 120 / DT; step++) {
        for (const strike of scripted(t)) lightning.strike(strike);
        lightning.update(DT, t > 20);
        if (lightning.intensity > previous + 0.05) onsets.push(t);
        previous = lightning.intensity;
        t += DT;
    }
    return onsets;
}

function maxPerSecond(onsets) {
    let worst = 0;
    for (let i = 0; i < onsets.length; i++) {
        let n = 0;
        while (i + n < onsets.length && onsets[i + n] - onsets[i] < 1) n++;
        worst = Math.max(worst, n);
    }
    return worst;
}

// Scripted strikes at the real timeline moments: omen (17 s), flash (24 s), reveal (36 s) and the
// witness strike, all offset by when the awakening starts.
const realTimeline = (start, witnessAt) => (t) => [[start + 17, 0.7], [start + 24, 1.7], [start + 36, 2.15], [witnessAt, 1.85]]
    .filter(([at]) => t <= at && t + DT > at).map(([, k]) => k);

test('natural and scripted lightning never exceeds three flashes per second', () => {
    for (let seed = 1; seed <= 60; seed++) {
        for (const scale of [...OMEN_INTERVAL_SCALES, ...SCALE_EXTREMES]) {
            const onsets = storm(seed, scale, realTimeline(20, 60 + (seed % 17)));
            assert.ok(maxPerSecond(onsets) <= 3, `seed ${seed}, scale ${scale}: ${maxPerSecond(onsets)} flashes/s`);
        }
    }
});

test('even back-to-back scripted strikes are spaced to at most three per second', () => {
    let state = 1;
    const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let seed = 1; seed <= 60; seed++) {
        const onsets = storm(seed, 0.45, () => (random() < DT * 4 ? [0.7 + random() * 1.5] : []));
        assert.ok(maxPerSecond(onsets) <= 3, `seed ${seed}: ${maxPerSecond(onsets)} flashes/s`);
    }
});

test('a scripted strike that arrives too soon is delayed, not dropped', () => {
    const lightning = new LightningSystem(3);
    lightning.update(1, false);
    lightning.strike(1.7);
    assert.equal(lightning.intensity, 1.7, 'first scripted strike flashes immediately');
    lightning.update(0.05, true);
    lightning.strike(2.15);
    assert.ok(lightning.intensity < 1.7, 'second strike within the gap is held back');
    let delivered = false;
    for (let i = 0; i < 60 && !delivered; i++) {
        lightning.update(DT, true);
        delivered = lightning.intensity > 2;
    }
    assert.ok(delivered, 'held strike is delivered once the gap has passed');
});

test('reset forgets pending strikes and flash history', () => {
    const lightning = new LightningSystem(5);
    lightning.update(1, false);
    lightning.strike(1.2);
    lightning.strike(2.0);
    lightning.reset();
    lightning.strike(1.5);
    assert.equal(lightning.intensity, 1.5, 'first strike after reset is not delayed');
    for (let i = 0; i < 120; i++) lightning.update(DT, false);
    assert.ok(lightning.intensity < 0.5, 'the pre-reset pending strike never fires');
});

test('the reveal lantern shock is a single dip, not a strobe', () => {
    const source = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
    const flicker = source.slice(source.indexOf('const torchFlicker'), source.indexOf(';', source.indexOf('const torchFlicker')));
    assert.ok(flicker.includes('torchShock'), 'shock still affects the lantern');
    assert.doesNotMatch(flicker, /torchShock[^\n]*Math\.sin/, 'shock must not oscillate');
    // Remaining idle flicker terms: fast ones must stay far below a 10 % luminance change.
    for (const [, rate, amplitude] of flicker.matchAll(/Math\.sin\(STATE\.elapsedTime \* ([\d.]+)\) \* ([\d.]+)/g)) {
        if (Number(rate) / (2 * Math.PI) > 3) assert.ok(Number(amplitude) <= 0.02, `${rate} rad/s flicker amplitude ${amplitude}`);
    }
});
