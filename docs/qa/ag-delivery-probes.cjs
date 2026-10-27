// Independent non-browser QA probes. No production files are changed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const context = vm.createContext({ AbortController }); context.window = context;
for (const name of ['config', 'collision-system', 'discovery-system', 'scene-renderer', 'narration-catalog', 'narration-system']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context);
}
const results = [];

const collision = new context.CollisionSystem();
collision.addObstacle({ id: 'twin', position: [-9, 0, 27], radius: 1.25, isActive: () => true });
const insideStart = [-9, 0, 22];
const corrected = collision.moveShip(insideStart, [0, 0, 0]);
const clearances = collision.obstacles.filter(item => item.isActive()).map(item => ({ id: item.id,
    clearance: Math.hypot((corrected[0] - item.position[0]) / (item.radius + 2), (corrected[2] - item.position[2]) / (item.radius + 4.7)) }));
results.push({ id: 'QA-F01', scenario: 'Recover overlap with two adjacent expanded hull obstacles',
    start: insideStart, movement: [0, 0, 0], result: [...corrected], clearances,
    expected: 'Every active obstacle clearance >= 1', pass: clearances.every(item => item.clearance >= 0.9999) });

const discovery = new context.DiscoverySystem();
const journal = discovery.sites.find(site => site.id === 'journal');
results.push({ id: 'QA-F02', scenario: 'World config and runtime journal agree',
    configured: [...context.GameConfig.world.journalPosition], runtime: [...journal.position],
    pass: JSON.stringify(context.GameConfig.world.journalPosition) === JSON.stringify(journal.position) });
const originalConfig = context.GameConfig;
context.GameConfig = { ...originalConfig, world: { ...originalConfig.world, stonePosition: [100, 0, 100] } };
const changedWorldCollision = new context.CollisionSystem();
results.push({ id: 'QA-F02b', scenario: 'Collision consumes the shared world geometry',
    configured: [100, 0, 100], actual: [...changedWorldCollision.obstacles.find(item => item.id === 'stone').position],
    pass: changedWorldCollision.obstacles.find(item => item.id === 'stone').position[0] === 100 });
context.GameConfig = originalConfig;

async function narrationProbe() {
    let now = 0, expire, resolveDecode, decoding;
    const enteredDecode = new Promise(resolve => { decoding = resolve; });
    const statuses = [], starts = [];
    const audio = { enabled: true, muted: false, paused: true, volume: 0.7, compressor: {},
        setNarrationDucking() {}, context: { currentTime: 0,
            decodeAudioData() { decoding(); return new Promise(resolve => { resolveDecode = resolve; }); },
            createGain: () => ({ connect() {}, gain: { setValueAtTime() {}, setTargetAtTime() {} } }),
            createBufferSource: () => ({ connect() {}, disconnect() {}, stop() {}, start() { starts.push('started'); } }) } };
    const narrator = new context.NarrationSystem(audio, context.NarrationCatalog, {
        fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
        now: () => now, setTimeout: callback => { expire = callback; return 1; }, clearTimeout() {},
        status: copy => statuses.push(copy) });
    const pending = narrator.play('discovery.journal', { modal: true });
    await enteredDecode;
    now = 20; expire();
    const timedOutState = { current: narrator.current?.id, status: statuses.at(-1), aborted: narrator.current?.controller.signal.aborted };
    resolveDecode({ duration: 10 });
    const accepted = await pending;
    results.push({ id: 'QA-F03', scenario: 'Decode timeout clears loading and forbids late playback',
        timedOutState, laterAccepted: accepted, starts: starts.length,
        pass: !timedOutState.current && starts.length === 0 });
    narrator.stop();
}

function allocationProbe() {
    const library = require(path.join(root, 'js/vendor/gl-matrix-min.js'));
    const math = { mat4: { ...library.mat4 }, vec3: { ...library.vec3 } };
    const original = [], counts = {};
    for (const [type, methods] of [['mat4', ['create']], ['vec3', ['create', 'clone']]]) {
        for (const method of methods) {
            const old = math[type][method]; const label = type + '.' + method;
            original.push(() => { math[type][method] = old; });
            counts[label] = 0;
            math[type][method] = (...args) => { counts[label]++; return old(...args); };
        }
    }
    const renderer = new context.SceneRenderer({ STATE: { mat4: math.mat4, vec3: math.vec3,
        shipPosition: [10, 0, 60], cameraFront: [0, 0, -1], boatMotion: { bob: 0 }, cinematic: {}, elapsedTime: 0 },
        comfortSettings: { cameraShakeEnabled: false } });
    for (let i = 0; i < 60; i++) { renderer.getCameraPosition(); renderer.getFPSTorchMatrix(); }
    original.forEach(restore => restore());
    results.push({ id: 'QA-F04', scenario: '60 iterations of actual per-frame camera/torch helpers',
        allocations: counts, expected: 'Zero allocations as claimed in delivery',
        pass: Object.values(counts).every(count => count === 0),
        note: 'Counts actual helper allocations; this is not a browser GC profile or an FPS measurement.' });
}

function lifecycleProbe() {
    const testFile = path.join(root, 'scripts/ritual-08.test.js');
    const source = fs.readFileSync(testFile, 'utf8');
    const sandbox = { require: createRequire(testFile), __dirname: path.dirname(testFile), module: { exports: {} }, console, AbortController };
    vm.runInNewContext(source.slice(0, source.indexOf('\ntest(')) + '\nmodule.exports = createScene;', sandbox);
    const scene = sandbox.module.exports(true);
    scene.inspect();
    scene.STATE.awakeningTimeline.complete = true;
    scene.resolveEnding('refused');
    scene.advanceScene(0);
    for (let i = 1; i <= 10; i++) scene.advanceScene(i * 100);
    const refused = { title: scene.get('ending-title').textContent, paused: scene.STATE.paused, shown: !scene.get('ending-card').hidden };
    scene.get('ending-restart').click();
    results.push({ id: 'QA-PASS-01', scenario: 'Actual lifecycle adapter refusal ending then next cycle (DOM/GPU boundaries stubbed)',
        refused, cycleAfterRestart: scene.ritualCycle.cycle, completeAfterRestart: scene.STATE.witness.complete,
        pass: refused.shown && refused.paused && scene.ritualCycle.cycle === 2 && !scene.STATE.witness.complete });
    return scene;
}

async function replayRaceProbe(scene) {
    let enable;
    const activated = new Promise(resolve => { enable = resolve; });
    scene.ritualAudio.enable = async () => { await activated; scene.ritualAudio.enabled = true; };
    const calls = [];
    scene.narrator.play = async (id, options) => { calls.push({ id, options }); return true; };
    scene.inspect(); scene.inspectDiscovery('journal'); calls.length = 0;
    const pending = scene.context.sceneLifecycle.replayNarration('discovery.journal');
    scene.get('discovery-close').click();
    scene.resetScene();
    enable(); await pending;
    results.push({ id: 'QA-F05', scenario: 'Closing note and resetting while audio.enable is pending cancels replay',
        cardHidden: scene.get('discovery-card').hidden, callsAfterReset: calls,
        pass: calls.length === 0,
        note: 'Actual lifecycle method; delayed activation and narrator.play boundary are controlled.' });
}

(async () => {
    await narrationProbe(); allocationProbe(); await replayRaceProbe(lifecycleProbe());
    const report = { testedHead: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        node: process.version, browserTestsPerformed: false, results };
    fs.writeFileSync(path.join(__dirname, 'AG_QA_PROBES.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (results.some(result => !result.pass)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
