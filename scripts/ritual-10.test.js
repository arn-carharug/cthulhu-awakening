const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({}); context.window = context;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/navigation.js'), 'utf8'), context);
const navigation = new context.VoyageNavigation();
test('navigation preserves cardinal headings and wraps relative bearing', () => {
    assert.equal(navigation.sample([0, 0, 60], [0, 0, -1], 0).heading, 0);
    assert.equal(navigation.sample([0, 0, 60], [1, 0, 0], 0).heading, Math.PI / 2);
    assert.equal(navigation.sample([0, 0, 60], [0, 0, -1], 0).relative, 0);
    assert.ok(Math.abs(navigation.sample([0, 0, 60], [0, 0, 1], 0).relative) <= Math.PI);
});
test('anomaly deviation is deterministic and approach requires facing the ruins', () => {
    assert.equal(navigation.sample([0, 0, 60], [0, 0, -1], 1).needleAngle, 0);
    const near = navigation.sample([0, 0, 0], [0, 0, -1], 1);
    assert.notEqual(near.needleAngle, 0);
    assert.equal(near.needleAngle, navigation.sample([0, 0, 0], [0, 0, -1], 1).needleAngle);
    assert.equal(near.canAwaken, true);
    assert.equal(navigation.sample([0, 0, 0], [0, 0, 1], 1).canAwaken, false);
    assert.equal(navigation.sample([0, 0, 60], [0, 0, -1], 1).canAwaken, false);
});
