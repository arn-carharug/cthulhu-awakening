const { test } = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const vm = require('node:vm');
const root=path.resolve(__dirname,'..');const c=vm.createContext({});c.window=c;
vm.runInContext(fs.readFileSync(path.join(root,'js/texture-catalog.js'),'utf8'),c);
test('texture variants exist, low really downloads less, and high stays within budget',()=>{
    const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/textures/optimized/manifest.json'),'utf8'));
    assert.ok(manifest.variants.high.bytes < 12*1024*1024);
    assert.ok(manifest.variants.low.bytes < manifest.variants.high.bytes/2);
    for(const quality of ['low','high']) {
        let actual=0;
        for(const url of Object.values(c.TextureCatalog.entries(quality)))actual+=fs.statSync(path.join(root,url)).size;
        assert.equal(actual,manifest.variants[quality].bytes);
    }
    assert.notEqual(c.TextureCatalog.entries('low').waterTexture,c.TextureCatalog.entries('high').waterTexture);
    assert.equal(c.TextureCatalog.entries('medium').waterTexture,c.TextureCatalog.entries('high').waterTexture);
});
test('startup scripts are local and pinned gl-matrix exports the expected math API',()=>{
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    assert.equal(/<script[^>]+src=["']https?:/.test(html),false);
    const glm=require('../js/vendor/gl-matrix-min.js');
    assert.equal(typeof glm.mat4.perspective,'function');
    assert.equal(typeof glm.vec3.normalize,'function');
    assert.ok(fs.readFileSync(path.join(root,'js/vendor/gl-matrix-LICENSE.md'),'utf8').includes('Permission is hereby granted'));
});

test('failed image loading deletes the placeholder GPU texture',async()=>{
    let image, deleted;
    const context=vm.createContext({Image: class {constructor(){image=this;} }}); context.window=context;
    vm.runInContext(fs.readFileSync(path.join(root,'js/asset-loader.js'),'utf8'),context);
    const texture={};
    const gl={createTexture:()=>texture,bindTexture(){},texImage2D(){},deleteTexture(value){deleted=value;}};
    const promise=context.AssetLoader.loadTexture(gl,'missing.webp'); image.onerror();
    await assert.rejects(promise,/missing.webp/); assert.equal(deleted,texture);
});
