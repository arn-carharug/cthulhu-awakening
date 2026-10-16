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

    const events = new SceneRuntime.EventBus();
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
        'index.html', 'main.js', 'css/style.css', 'js/config.js', 'js/timeline.js',
        'js/performance-monitor.js', 'js/debug-panel.js',
        'shaders/vertex.glsl', 'shaders/fragment.glsl',
        'assets/textures/WeatheredWood2_S.jpg', 'assets/textures/OC1KI90.jpg',
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
