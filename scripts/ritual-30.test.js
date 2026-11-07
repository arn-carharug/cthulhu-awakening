// Ritual XXX — QA-F01: overlap recovery must be valid for every active obstacle at once.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadContext() {
    const context = vm.createContext({});
    context.window = context;
    for (const name of ['collision-system', 'discovery-system']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context);
    }
    return context;
}

const clearances = (collision, p) => collision.obstacles
    .filter((obs) => obs.isActive())
    .map((obs) => ({ id: obs.id, value: collision.constructor.clearance(obs, p) }));

function assertClearOfAll(collision, p, label) {
    for (const { id, value } of clearances(collision, p)) {
        assert.ok(value >= 1, `${label}: hull overlaps ${id} (clearance ${value})`);
    }
    assert.ok(p.every(Number.isFinite), `${label}: non-finite result`);
}

const twin = { id: 'twin', position: [-9, 0, 27], radius: 1.25, isActive: () => true };

test('QA-F01: stuck between two adjacent obstacles recovers clear of both', () => {
    const { CollisionSystem } = loadContext();
    const collision = new CollisionSystem();
    collision.addObstacle({ ...twin });
    const result = collision.moveShip([-9, 0, 22], [0, 0, 0]);
    assertClearOfAll(collision, result, 'stone then twin');
    assert.ok(Math.hypot(result[0] + 9, result[2] - 22) < 3, 'recovery stays near the stuck position');
});

test('QA-F01: obstacle order reversed gives an equally valid recovery', () => {
    const { CollisionSystem } = loadContext();
    const collision = new CollisionSystem();
    collision.obstacles.unshift({ ...twin });
    const result = collision.moveShip([-9, 0, 22], [0, 0, 0]);
    assertClearOfAll(collision, result, 'twin then stone');
});

test('QA-F01: moving while stuck between obstacles never ends inside either', () => {
    const { CollisionSystem } = loadContext();
    const collision = new CollisionSystem();
    collision.addObstacle({ ...twin });
    for (const move of [[0, 0, -3], [0, 0, 3], [2, 0, 0], [-2, 0, 1], [0, 0, -40]]) {
        assertClearOfAll(collision, collision.moveShip([-9, 0, 22], move), `move ${move}`);
    }
});

test('QA-F01: sliding into a second obstacle keeps clearance from both', () => {
    const { CollisionSystem } = loadContext();
    const collision = new CollisionSystem();
    collision.addObstacle({ id: 'side', position: [-3, 0, 17], radius: 1.25, isActive: () => true });
    let pos = [-6, 0, 35];
    for (let i = 0; i < 40; i++) {
        pos = collision.moveShip(pos, [0.3, 0, -1.5]);
        assertClearOfAll(collision, pos, `step ${i}`);
    }
});

test('QA-F01: discovery movement uses the single collision implementation', () => {
    const context = loadContext();
    const source = fs.readFileSync(path.join(root, 'js/discovery-system.js'), 'utf8');
    assert.doesNotMatch(source, /class\s+\w*CollisionSystem/, 'no duplicate collision class in discovery-system.js');
    const discovery = new context.DiscoverySystem();
    assert.ok(discovery.collision instanceof context.CollisionSystem);
    discovery.collision.addObstacle({ ...twin });
    assertClearOfAll(discovery.collision, discovery.moveShip([-9, 0, 22], [0, 0, 0]), 'via DiscoverySystem');
});
