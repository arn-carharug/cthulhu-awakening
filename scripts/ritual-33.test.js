// Ritual XXXIII — QA-F05: a "Read aloud" replay waiting on audio activation is cancelled when its
// card closes, the cycle resets, or a newer request replaces it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Reuse the real scene adapter from ritual-08 (production lifecycle, DOM/GPU boundaries stubbed).
function loadCreateScene() {
    const testFile = path.join(__dirname, 'ritual-08.test.js');
    const source = fs.readFileSync(testFile, 'utf8');
    const sandbox = { require: createRequire(testFile), __dirname, module: { exports: {} }, console, AbortController };
    vm.runInNewContext(`${source.slice(0, source.indexOf('\ntest('))}\nmodule.exports = createScene;`, sandbox);
    return sandbox.module.exports;
}
const createScene = loadCreateScene();

// Scene whose audio activation stays pending until `activate()` and whose narrator records plays.
function sceneWithPendingAudio() {
    const scene = createScene(true);
    const plays = [];
    let release = [];
    scene.ritualAudio.enabled = false;
    scene.ritualAudio.enable = () => new Promise((resolve) => { release.push(() => { scene.ritualAudio.enabled = true; resolve(); }); });
    scene.narrator.play = async (id, options) => { plays.push({ id, modal: options?.modal }); return true; };
    const activate = () => { const pending = release; release = []; pending.forEach((fn) => fn()); };
    const lifecycle = scene.context.sceneLifecycle;
    return { scene, plays, activate, lifecycle };
}

function openJournal(scene, plays) {
    scene.inspect();
    scene.inspectDiscovery('journal');
    assert.equal(scene.get('discovery-card').hidden, false, 'journal card is open');
    plays.length = 0; // ignore the automatic play when the card opens
}

test('QA-F05: closing the note and resetting while activation is pending cancels the replay', async () => {
    const { scene, plays, activate, lifecycle } = sceneWithPendingAudio();
    openJournal(scene, plays);
    const pending = lifecycle.replayNarration('discovery.journal');
    scene.get('discovery-close').click();
    scene.resetScene();
    activate();
    assert.equal(await pending, false);
    assert.deepEqual(plays, [], 'no narration starts after the card closed and the cycle reset');
});

test('QA-F05: closing the note alone cancels the pending replay', async () => {
    const { scene, plays, activate, lifecycle } = sceneWithPendingAudio();
    openJournal(scene, plays);
    const pending = lifecycle.replayNarration('discovery.journal');
    scene.get('discovery-close').click();
    activate();
    assert.equal(await pending, false);
    assert.deepEqual(plays, []);
});

test('QA-F05: reset alone (R / restart) cancels the pending replay', async () => {
    const { scene, plays, activate, lifecycle } = sceneWithPendingAudio();
    openJournal(scene, plays);
    const pending = lifecycle.replayNarration('discovery.journal');
    scene.resetScene(true);
    activate();
    assert.equal(await pending, false);
    assert.deepEqual(plays, []);
});

test('QA-F05: continuing past the ending cancels a pending ending replay', async () => {
    const { scene, plays, activate, lifecycle } = sceneWithPendingAudio();
    scene.inspect();
    scene.STATE.awakeningTimeline.complete = true;
    scene.resolveEnding('witness');
    plays.length = 0;
    const pending = lifecycle.replayNarration('ending.witnessed');
    lifecycle.dismissEnding();
    activate();
    assert.equal(await pending, false);
    assert.deepEqual(plays, []);
});

test('QA-F05: only the newest of several pending replays plays', async () => {
    const { scene, plays, activate, lifecycle } = sceneWithPendingAudio();
    openJournal(scene, plays);
    const first = lifecycle.replayNarration('discovery.journal');
    const second = lifecycle.replayNarration('discovery.journal');
    activate();
    assert.deepEqual([await first, await second], [false, true]);
    assert.deepEqual(plays, [{ id: 'discovery.journal', modal: true }]);
});

test('QA-F05: an uninterrupted replay still plays once audio is ready', async () => {
    const { scene, plays, activate, lifecycle } = sceneWithPendingAudio();
    openJournal(scene, plays);
    const pending = lifecycle.replayNarration('discovery.journal');
    activate();
    assert.equal(await pending, true);
    assert.deepEqual(plays, [{ id: 'discovery.journal', modal: true }]);
});

test('QA-F05: failed audio activation reports no playback', async () => {
    const { scene, plays, lifecycle } = sceneWithPendingAudio();
    openJournal(scene, plays);
    scene.ritualAudio.enable = async () => { throw new Error('blocked'); };
    assert.equal(await lifecycle.replayNarration('discovery.journal'), false);
    assert.deepEqual(plays, []);
});
