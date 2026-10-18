const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const values = new Map();
const context = vm.createContext({ localStorage: { getItem: (key) => values.get(key), setItem: (key,value) => values.set(key,value) } }); context.window = context;
for (const file of ['wave-field','audio-system']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js',file+'.js'),'utf8'),context);
test('world-space waves have continuous position-dependent heights and correct slopes', () => {
    for (const [x,z] of [[0,0],[10,60],[-20,-30]]) {
        const sample = context.WaveField.sample(x,z,12,1.4,0.82);
        const dx = (context.WaveField.sample(x+0.001,z,12,1.4,0.82).height-context.WaveField.sample(x-0.001,z,12,1.4,0.82).height)/0.002;
        assert.ok(Math.abs(dx-sample.slopeX)<1e-7);
        assert.ok(Math.abs(sample.height)<=1.4);
        assert.ok(Math.abs(context.WaveField.sample(x,z,12,0,0.82).height) === 0);
    }
    assert.notEqual(context.WaveField.sample(0,0,2,1,1).height,context.WaveField.sample(20,30,2,1,1).height);
});
test('ambient/effects levels are independent and persist; omen motifs differ', () => {
    const audio = new context.RitualAudioSystem();
    audio.setMix('ambient', 0.2); audio.setMix('effects', 2);
    assert.equal(audio.mix.ambient,0.2); assert.equal(audio.mix.effects,1);
    const restored = new context.RitualAudioSystem(); assert.equal(restored.mix.ambient,0.2);
    audio.setOmen('black-tide'); const low=audio.omenTone;
    audio.setOmen('hollow-calm'); assert.notEqual(audio.omenTone,low);
});
