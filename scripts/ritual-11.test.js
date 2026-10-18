const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const context = vm.createContext({}); context.window = context;
for (const file of ['discovery-system', 'environment-effects']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
test('discovery range, repeat inspection, reset and optional completion are independent', () => {
    const system = new context.DiscoverySystem();
    assert.equal(system.inspect('stone', [10,0,60]), null);
    assert.equal(system.inspect('journal', [10,0,60]).id, 'journal');
    assert.equal(system.inspect('journal', [10,0,60]).id, 'journal');
    assert.equal(system.found.size, 1);
    assert.equal(system.inspect('stone', [-9,0,17]).id, 'stone');
    system.reset(); assert.equal(system.found.size, 0);
    assert.equal(system.sites.length, 2);
    const mesh = context.EnvironmentEffects.createDiscoveryMesh(system.sites);
    assert.ok(mesh.length > 2 * 36 * 11);
    assert.ok([...mesh].every(Number.isFinite));
    const stoneVertices = [];
    for (let offset = 0; offset < mesh.length; offset += 11) {
        if (mesh[offset + 9] !== -1) continue;
        stoneVertices.push(mesh.slice(offset, offset + 11));
        assert.ok(Math.abs(Math.hypot(...mesh.slice(offset + 3, offset + 6)) - 1) < 1e-5);
    }
    assert.ok(stoneVertices.length > 36);
    assert.ok(Math.min(...stoneVertices.map(vertex => vertex[1])) < -3.5, 'rock base sits below the sea');
    assert.deepEqual(mesh, context.EnvironmentEffects.createDiscoveryMesh(system.sites));
});
test('lantern alignment normalizes vectors and rejects zero or backwards aims', () => {
    const aligned = context.DiscoverySystem.aligned;
    assert.equal(aligned([0,0,-1],[0,0,-100]), true);
    assert.equal(aligned([0,0,-1],[0,0,100]), false);
    assert.equal(aligned([0,0,0],[0,0,-1]), false);
    assert.equal(aligned([0,0,-1],[30,0,-100]), false);
});
