const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
global.window = global;
global.fetch = async (url) => {
    try {
        const body = await fs.readFile(path.resolve(root, url), 'utf8');
        return { ok: true, status: 200, text: async () => body };
    } catch {
        return { ok: false, status: 404, text: async () => '' };
    }
};

async function validate() {
    const loaderSource = await fs.readFile(path.join(root, 'js', 'asset-loader.js'), 'utf8');
    vm.runInThisContext(loaderSource, { filename: 'asset-loader.js' });
    const timelineSource = await fs.readFile(path.join(root, 'js', 'timeline.js'), 'utf8');
    vm.runInThisContext(timelineSource, { filename: 'timeline.js' });
    const effectsSource = await fs.readFile(path.join(root, 'js', 'environment-effects.js'), 'utf8');
    vm.runInThisContext(effectsSource, { filename: 'environment-effects.js' });
    const weatherSource = await fs.readFile(path.join(root, 'js', 'weather-system.js'), 'utf8');
    vm.runInThisContext(weatherSource, { filename: 'weather-system.js' });
    const omenSource = await fs.readFile(path.join(root, 'js', 'omen-system.js'), 'utf8');
    vm.runInThisContext(omenSource, { filename: 'omen-system.js' });
    const audioSource = await fs.readFile(path.join(root, 'js', 'audio-system.js'), 'utf8');
    vm.runInThisContext(audioSource, { filename: 'audio-system.js' });

    const ritualAudio = new RitualAudioSystem();
    ritualAudio.setVolume(0.5);
    assert.ok(ritualAudio.outputGain() > 0.5, 'audio mix does not provide sufficient gain');
    ritualAudio.setVolume(2);
    assert.equal(ritualAudio.volume, 1, 'audio volume did not clamp to its maximum');

    const dustMesh = EnvironmentEffects.createDustField(120);
    assert.equal(dustMesh.length, 120 * 11, 'particle mesh layout is invalid');
    assert.ok([...dustMesh].every(Number.isFinite), 'environment mesh contains invalid values');
    const eyeMesh = EnvironmentEffects.createEyePoints();
    assert.equal(eyeMesh.length, 2 * 11, 'eye mesh layout is invalid');
    const lightning = new WeatherSystem.LightningSystem(7);
    lightning.strike(1.5);
    assert.equal(lightning.intensity, 1.5, 'forced lightning strike is invalid');
    let lightningTriggered = false;
    for (let index = 0; index < 200; index += 1) {
        lightningTriggered = lightning.update(0.1, true) || lightningTriggered;
    }
    assert.equal(lightningTriggered, true, 'lightning system did not produce a strike');
    assert.ok(Number.isFinite(lightning.intensity), 'lightning intensity is invalid');

    const events = new SceneRuntime.EventBus();
    const omenClasses = new Set();
    const omenLabel = {
        textContent: '',
        classList: {
            add: (name) => omenClasses.add(name),
            remove: (name) => omenClasses.delete(name)
        }
    };
    global.document = { getElementById: () => omenLabel };
    const omens = new OmenSystem(events);
    const firstOmen = omens.beginCycle(1);
    const secondOmen = omens.beginCycle(2);
    assert.notEqual(firstOmen.id, secondOmen.id, 'adjacent cycles should not repeat the same omen');
    events.emit('awakening:started');
    assert.equal(omenLabel.textContent, secondOmen.label, 'omen did not reveal during awakening');
    assert.equal(omenClasses.has('revealed'), true, 'omen reveal style was not applied');
    let cueCount = 0;
    events.on('test:cue', () => { cueCount += 1; });
    const timeline = new SceneRuntime.SceneTimeline({
        duration: 2,
        tracks: { rise: { start: 0, duration: 2, to: 10 } },
        cues: [{ at: 1, name: 'test:cue' }],
        events
    });
    timeline.start();
    timeline.update(1);
    assert.equal(cueCount, 1, 'timeline cue did not fire');
    assert.ok(timeline.value('rise') > 0 && timeline.value('rise') < 10, 'timeline track did not interpolate');
    timeline.update(1);
    assert.equal(timeline.complete, true, 'timeline did not complete');
    timeline.reset();
    assert.equal(timeline.value('rise'), 0, 'timeline did not reset');

    const modelDefinitions = [
        ['assets/models/woodBoat.obj', 'assets/models/woodBoat.mtl', true],
        ['assets/models/torch.obj', 'assets/models/torch.mtl', false],
        ['assets/models/compass.obj', 'assets/models/compass.mtl', true],
        ['assets/models/pillars.obj', 'assets/models/pillars.mtl', true],
        ['assets/models/Horror_low_subd.obj', null, true]
    ];

    for (const definition of modelDefinitions) {
        const model = await AssetLoader.loadOBJWithMTL(...definition);
        const stride = definition[2] ? 11 : 9;
        const vertexCount = model.vertices.length / stride;
        assert.ok(vertexCount > 0, `${definition[0]} has no vertices`);
        assert.ok(model.indices.length > 0, `${definition[0]} has no indices`);
        for (const index of model.indices) {
            assert.ok(index < vertexCount, `${definition[0]} contains an out-of-range index`);
        }
        console.log(`${definition[0]}: ${vertexCount} vertices, ${model.indices.length} indices`);
    }

    const requiredFiles = [
        'index.html', 'main.js', 'css/style.css', 'js/config.js', 'js/timeline.js', 'js/scene-controls.js',
        'js/performance-monitor.js', 'js/debug-panel.js', 'js/environment-effects.js',
        'js/weather-system.js', 'js/omen-system.js', 'js/audio-system.js', 'js/ritual-presentation.js', 'js/game-loop.js',
        'shaders/vertex.glsl', 'shaders/fragment.glsl',
        'assets/textures/WeatheredWood2_S.jpg', 'assets/textures/OC1KI90.jpg',
        'assets/textures/boat_wood_wet_v2.png', 'assets/textures/compass_brass_v2.png',
        'assets/textures/germany010.jpg', 'assets/textures/beautiful-photo-sea-waves.jpg',
        'assets/textures/Cthulhu_2k_Base_Color.png', 'assets/textures/Cthulhu_2k_AO.png',
        'assets/textures/Cthulhu_2k_Metallic.png', 'assets/textures/Cthulhu_2k_Roughness.png'
    ];
    await Promise.all(requiredFiles.map((file) => fs.access(path.join(root, file))));
    console.log('Static files and model buffers are valid.');
}

validate().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
