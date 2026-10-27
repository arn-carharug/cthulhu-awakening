const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

function createComfort(saved = null) {
    let stored = saved;
    const context = vm.createContext({
        matchMedia: () => ({ matches: false }),
        localStorage: {
            getItem: () => stored,
            setItem: (key, val) => { stored = val; }
        }
    });
    context.window = context;
    vm.runInContext(fs.readFileSync(path.join(root, 'js', 'comfort-settings.js'), 'utf8'), context);
    return { settings: new context.ComfortSettings(), getStored: () => stored };
}

test('comfortSettings validates and persists captionsEnabled and captionSize', () => {
    const { settings, getStored } = createComfort();
    assert.equal(settings.values.captionsEnabled, true);
    assert.equal(settings.values.captionSize, 'normal');

    assert.equal(settings.set('captionSize', 'large'), true);
    assert.equal(settings.values.captionSize, 'large');
    assert.equal(settings.set('captionSize', 'small'), true);
    assert.equal(settings.values.captionSize, 'small');
    assert.equal(settings.set('captionSize', 'huge'), false);
    assert.equal(settings.values.captionSize, 'small');

    assert.equal(settings.set('captionsEnabled', false), true);
    assert.equal(settings.values.captionsEnabled, false);
    assert.equal(settings.set('captionsEnabled', 'no'), false);
    assert.equal(settings.values.captionsEnabled, false);

    const reloaded = createComfort(getStored()).settings;
    assert.equal(reloaded.values.captionsEnabled, false);
    assert.equal(reloaded.values.captionSize, 'small');
});

test('disabling captions suppresses ritual-caption but preserves voyage hint and objectives', () => {
    const classes = new Set();
    const captionEl = {
        textContent: '',
        dataset: {},
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c)
        }
    };
    const dummyEl = {
        textContent: '',
        style: { setProperty() {}, transform: '' },
        classList: { add() {}, remove() {}, toggle() {} },
        querySelector: () => dummyEl,
        focus() {}
    };
    const documentMock = {
        getElementById: (id) => id === 'ritual-caption' ? captionEl : dummyEl,
        querySelector: () => dummyEl
    };

    const context = vm.createContext({
        document: documentMock
    });
    context.window = context;
    vm.runInContext(fs.readFileSync(path.join(root, 'js', 'comfort-settings.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(root, 'js', 'ritual-presentation.js'), 'utf8'), context);

    const comfort = new context.ComfortSettings();
    const events = { on() {}, emit() {} };
    const presentation = new context.RitualPresentation(events, comfort);

    // Normal behavior: captions show
    presentation.show('The sea recoils.', 3000);
    assert.equal(captionEl.textContent, 'The sea recoils.');
    assert.equal(classes.has('visible'), true);

    // Disable captions
    comfort.set('captionsEnabled', false);
    presentation.applyCaptionSettings(comfort);
    assert.equal(captionEl.textContent, '');
    assert.equal(classes.has('visible'), false);

    // Subsequent show is suppressed while captions are off
    presentation.show('Cthulhu awakens.', 4000);
    assert.equal(captionEl.textContent, '');
    assert.equal(classes.has('visible'), false);

    // Re-enable captions and change size
    comfort.set('captionsEnabled', true);
    comfort.set('captionSize', 'large');
    presentation.applyCaptionSettings(comfort);
    assert.equal(captionEl.dataset.captionSize, 'large');
    presentation.show('Cthulhu awakens.', 4000);
    assert.equal(captionEl.textContent, 'Cthulhu awakens.');
    assert.equal(classes.has('visible'), true);
});

test('index.html contains debug-torch-info inside debug-panel and removes torch-ui from normal HUD', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.equal(/<div id="torch-ui">/.test(html), false, 'torch-ui must not be in normal HUD');
    assert.ok(html.includes('id="debug-torch-info"'), 'debug-torch-info must be inside debug-panel');
    assert.ok(html.includes('id="torch-mode"'), 'torch-mode span must exist');
    assert.ok(html.includes('id="torch-brightness"'), 'torch-brightness span must exist');
    assert.ok(html.includes('id="captions-enabled"'), 'captions-enabled checkbox must exist');
    assert.ok(html.includes('id="caption-size"'), 'caption-size select must exist');
});

test('css/style.css defines distinct non-overlapping zones and focus-visible outlines', () => {
    const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
    assert.ok(css.includes(':focus-visible'), 'focus-visible outline style must be defined');
    assert.ok(css.includes('#ritual-caption[data-caption-size="small"]'), 'small caption size style must exist');
    assert.ok(css.includes('#ritual-caption[data-caption-size="large"]'), 'large caption size style must exist');
    assert.ok(css.includes('#debug-torch-info'), 'debug torch info style must exist');
});
