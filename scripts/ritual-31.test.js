// Ritual XXXI — QA-F02: GameConfig.world is the one source that every module actually consumes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const MODULES = ['config', 'navigation', 'collision-system', 'discovery-system'];

// Loads the real modules, then swaps in an edited world definition the way a level designer would.
function loadWithWorld(overrides = {}) {
    const context = vm.createContext({});
    context.window = context;
    for (const name of MODULES) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context);
    }
    const original = context.GameConfig;
    context.GameConfig = { ...original, world: { ...original.world, ...overrides } };
    return context;
}

const moved = {
    stonePosition: [40, -1.4, -5],
    stoneRadius: 2,
    journalPosition: [-30, -2.7, 12],
    pillarPositions: [[-20, 0, -90], [0, 0, -90], [20, 0, -90]],
    pillarRadius: 4,
    ruinsPosition: [0, 0, -90],
    boatHull: { rx: 3, rz: 6 }
};

test('default config matches the geometry players see today', () => {
    const context = loadWithWorld();
    const world = context.GameConfig.world;
    const discovery = new context.DiscoverySystem();
    const site = (id) => discovery.sites.find((item) => item.id === id);
    assert.deepEqual([...site('journal').position], [...world.journalPosition]);
    assert.deepEqual([...world.journalPosition], [8, -2.7, 43]);
    assert.deepEqual([...site('stone').position], [...world.stonePosition]);
    assert.equal(site('stone').collisionRadius, world.stoneRadius);
});

test('collision obstacles and hull follow an edited world definition', () => {
    const context = loadWithWorld(moved);
    const collision = new context.CollisionSystem();
    const stone = collision.obstacles.find((obs) => obs.id === 'stone');
    assert.deepEqual([...stone.position], moved.stonePosition);
    assert.equal(stone.radius, moved.stoneRadius);
    const pillars = collision.obstacles.filter((obs) => obs.id.startsWith('pillar_'));
    assert.deepEqual(Array.from(pillars, (obs) => [...obs.position]), moved.pillarPositions);
    assert.ok(pillars.every((obs) => obs.radius === moved.pillarRadius));

    // Sailing straight at the moved stone stops at the edited hull + stone extent.
    const stopped = collision.moveShip([40, 0, 30], [0, 0, -60]);
    assert.ok(Math.abs(stopped[2] - (-5 + moved.stoneRadius + moved.boatHull.rz)) < 0.01, `stopped at ${stopped[2]}`);
    // The old stone location no longer blocks anything.
    assert.deepEqual([...collision.moveShip([-9, 0, 30], [0, 0, -20])], [-9, 0, 10]);
});

test('discovery sites, line of sight and movement share the edited world', () => {
    const context = loadWithWorld(moved);
    const discovery = new context.DiscoverySystem();
    assert.deepEqual([...discovery.sites.find((s) => s.id === 'journal').position], moved.journalPosition);
    assert.equal(discovery.inspect('journal', [-30, 0, 20])?.id, 'journal', 'journal is found at its new position');
    assert.equal(discovery.inspect('journal', [8, 0, 45]), null, 'nothing remains at the old journal position');
    assert.equal(discovery.inspect('stone', [40, 0, 5])?.id, 'stone');
    const stone = discovery.collision.obstacles.find((obs) => obs.id === 'stone');
    assert.deepEqual([...stone.position], moved.stonePosition, 'DiscoverySystem builds collision from the same world');
});

test('navigation bears toward the configured ruins', () => {
    const context = loadWithWorld(moved);
    const sample = new context.VoyageNavigation().sample([0, 0, 0], [0, 0, -1], 0);
    assert.ok(Math.abs(sample.distance - 90) < 1e-9);
    assert.ok(Math.abs(sample.relative) < 1e-9);
});

test('world modules keep no private copy of landmark coordinates', () => {
    const literals = ['-9, -1.4, 17', '8, -2.7, 43', '-50, 0, -30', '50, 0, -30', '10, 0, 60'];
    for (const file of ['main.js', 'js/collision-system.js', 'js/discovery-system.js', 'js/navigation.js', 'js/scene-lifecycle.js']) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        for (const literal of literals) {
            assert.ok(!source.includes(literal), `${file} hardcodes [${literal}]`);
        }
    }
});
