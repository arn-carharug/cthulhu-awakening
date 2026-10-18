const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
function archive(saved, blocked=false) {
    let value=saved;
    const c=vm.createContext({localStorage:{getItem(){if(blocked)throw new Error(); return value;},setItem(key,v){if(blocked)throw new Error();value=v;}}});c.window=c;
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/voyage-archive.js'),'utf8'),c);
    return {instance:new c.VoyageArchive(), stored:()=>value};
}
test('archive deduplicates and persists only recognized entries; clear affects archive',()=>{
    const first=archive(null);
    assert.equal(first.instance.record('endings','witness'),true);
    assert.equal(first.instance.record('endings','witness'),false);
    assert.equal(first.instance.record('endings','made-up'),false);
    first.instance.record('notes','journal'); first.instance.record('omens','red-wake');
    const restored=archive(first.stored()).instance;
    assert.equal(restored.data.notes.length,1); assert.equal(restored.data.endings.length,1);
    restored.clear(); assert.equal(restored.data.notes.length,0); assert.equal(restored.data.endings.length,0);
    const dirty=archive('{"endings":["witness","invalid","witness"]}').instance;
    assert.equal(dirty.data.endings.length,1);
});
test('archive remains usable with malformed or blocked storage',()=>{
    assert.equal(archive('{').instance.data.endings.length,0);
    const session=archive(null,true).instance;
    assert.equal(session.record('endings','refused'),true);
    assert.ok(session.summary().includes('Endings 1/2'));
});
