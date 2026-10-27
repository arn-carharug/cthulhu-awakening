const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function createCollisionContext() {
    const context = vm.createContext({});
    context.window = context;
    for (const name of ['collision-system', 'discovery-system']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context);
    }
    const collision = new context.CollisionSystem();
    const discoveries = new context.DiscoverySystem(collision);
    return { collision, discoveries, context };
}

test('pillars do not block the boat while submerged, but block and slide when active', () => {
    const { collision } = createCollisionContext();
    // Center pillar at [0, 0, -30], radius 3.2. Hull rz = 3.2 + 4.7 = 7.9.
    // Expected stop Z when heading north toward -30 from 0: -30 + 7.9 = -22.1.
    const start = [0, 0, -10];
    const headingNorth = [0, 0, -30];

    // Submerged: passes straight through
    collision.setPillarsActive(false);
    const passThrough = collision.moveShip(start, headingNorth);
    assert.equal(passThrough[2], -40, 'submerged pillars must not obstruct the boat');

    // Risen / active: stops at hull boundary
    collision.setPillarsActive(true);
    const stopped = collision.moveShip(start, headingNorth);
    assert.ok(stopped[2] > -22.11 && stopped[2] < -22.09, `hull stopped at boundary: ${stopped[2]}`);

    // Reverse motion (heading south away from pillar) is immediately permitted
    const reversed = collision.moveShip(stopped, [0, 0, 5]);
    assert.ok(reversed[2] > stopped[2], 'reversing away from pillar must not be blocked');

    // Oblique approach slides along pillar contour
    const obliqueStart = [-2, 0, -15];
    const obliqueMove = [0, 0, -15];
    const slid = collision.moveShip(obliqueStart, obliqueMove);
    assert.ok(slid[0] < -2, 'boat must slide westward along the curved surface');
    assert.ok(slid[2] < -15, 'boat must advance along the sliding tangent');
});

test('multi-obstacle resolution does not push the boat into adjacent obstacles', () => {
    const { collision } = createCollisionContext();
    collision.setPillarsActive(true);

    // Place a custom obstacle adjacent to stone [-9, 0, 17]
    collision.addObstacle({
        id: 'test_twin_stone',
        position: [-9, 0, 27],
        radius: 1.25,
        isActive: () => true
    });

    // Move between the two obstacles
    const mid = collision.moveShip([-9, 0, 35], [0, 0, -20]);
    // Must not penetrate twin_stone [Z=27 + 5.95 = 32.95]
    assert.ok(mid[2] > 32.94 && mid[2] < 32.96);

    // Try a heavy diagonal push that hits both
    const diagonal = collision.moveShip([-12, 0, 30], [5, 0, -10]);
    for (const obs of collision.obstacles) {
        if (!obs.isActive()) continue;
        const rx = obs.radius + 2.0;
        const rz = obs.radius + 4.7;
        const dist = Math.hypot((diagonal[0] - obs.position[0]) / rx, (diagonal[2] - obs.position[2]) / rz);
        assert.ok(dist >= 0.9999, `boat must not penetrate obstacle ${obs.id}`);
    }
});

test('swept collision prevents tunneling at 30, 60, and 120 FPS step sizes', () => {
    const { collision } = createCollisionContext();
    collision.setPillarsActive(true);

    for (const fps of [30, 60, 120]) {
        let pos = [0, 0, -10];
        const step = -9 / fps; // 9 units/sec speed
        for (let frame = 0; frame < fps * 3; frame++) {
            pos = collision.moveShip(pos, [0, 0, step]);
        }
        assert.ok(pos[2] > -22.11 && pos[2] < -22.09, `stopped accurately at ${fps} FPS`);
    }

    // Huge 200-unit leap
    const leap = collision.moveShip([0, 0, -10], [0, 0, -200]);
    assert.ok(leap[2] > -22.11 && leap[2] < -22.09, 'huge steps cannot tunnel through solid pillar');
});

test('discovery requires proximity, view alignment, and unoccluded line of sight', () => {
    const { discoveries, collision } = createCollisionContext();
    const journalPos = [8, -2.7, 43];
    const boatNear = [8, 0, 48]; // 5 units south, looking north [0, 0, -1]

    // 1. In range, facing it: available
    assert.equal(discoveries.isAvailable({ id: 'journal', position: journalPos }, boatNear, [0, 0, -1]), true);
    assert.equal(discoveries.nearby(boatNear, [0, 0, -1]).some((s) => s.id === 'journal'), true);

    // 2. In range, but facing away: unavailable
    assert.equal(discoveries.isAvailable({ id: 'journal', position: journalPos }, boatNear, [0, 0, 1]), false);
    assert.equal(discoveries.nearby(boatNear, [0, 0, 1]).some((s) => s.id === 'journal'), false);
    assert.equal(discoveries.inspect('journal', boatNear, [0, 0, 1]), null);

    // 3. Occlusion by a solid obstacle between boat and discovery
    collision.addObstacle({
        id: 'occluding_wall',
        position: [8, 0, 45], // directly in the line of sight between [8, 0, 48] and [8, -2.7, 43]
        radius: 1.5,
        isActive: () => true
    });
    assert.equal(discoveries.isAvailable({ id: 'journal', position: journalPos }, boatNear, [0, 0, -1]), false);
    assert.equal(discoveries.nearby(boatNear, [0, 0, -1]).some((s) => s.id === 'journal'), false);

    // 4. Drifting journal does not block movement
    collision.obstacles = collision.obstacles.filter((o) => o.id !== 'occluding_wall');
    const sailedOver = discoveries.moveShip([8, 0, 48], [0, 0, -10]);
    assert.equal(sailedOver[2], 38, 'journal remains non-solid drifting item');
});
