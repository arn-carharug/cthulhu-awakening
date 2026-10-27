const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('GitHub Actions CI workflow exists and defines valid verification pipeline', () => {
    const ciPath = path.join(root, '.github', 'workflows', 'ci.yml');
    assert.ok(fs.existsSync(ciPath), '.github/workflows/ci.yml must exist');

    const content = fs.readFileSync(ciPath, 'utf8');
    assert.match(content, /branches:\s*\[main\]/, 'CI must trigger on main branch');
    assert.match(content, /actions\/checkout@v4/, 'CI must checkout code');
    assert.match(content, /actions\/setup-node@v4/, 'CI must setup Node.js');
    assert.match(content, /node --check main\.js/, 'CI must run syntax check');
    assert.match(content, /node scripts\/validate\.js/, 'CI must run asset validation');
    assert.match(content, /node --test scripts\/ritual-\*\.test\.js/, 'CI must run automated test suite');
});

test('index.html uses strictly relative URLs and no external CDN dependencies', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    // Reject external CDN scripts or stylesheets
    assert.doesNotMatch(html, /https?:\/\/(cdn|unpkg|cdnjs|jsdelivr)/i, 'game must remain 100% offline and CDN-free');

    // Reject root-absolute paths (href="/..." or src="/...")
    const absoluteMatches = html.match(/(?:src|href)=["']\/(?!\/)[^"']*["']/g);
    assert.equal(absoluteMatches, null, `Root-absolute paths break subdirectory hosting: ${JSON.stringify(absoluteMatches)}`);

    // Verify local gl-matrix vendor script
    assert.match(html, /<script src="js\/vendor\/gl-matrix-min\.js"><\/script>/);
});

test('distribution assets, attribution, licenses, and controls are documented in README', () => {
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');

    // Verify build/dev tools are ignored
    assert.match(gitignore, /\.tools\//, '.tools directory must be ignored in .gitignore');

    // Verify attribution and license files exist
    assert.ok(fs.existsSync(path.join(root, 'assets', 'audio', 'narration', 'ATTRIBUTION.md')), 'Narration attribution must exist');
    assert.ok(fs.existsSync(path.join(root, 'js', 'vendor', 'gl-matrix-LICENSE.md')), 'Vendor license must exist');

    // Verify README documents essential commands
    assert.match(readme, /node scripts\/serve\.js/, 'README must document server startup');
    assert.match(readme, /node scripts\/validate\.js/, 'README must document static validation');
    assert.match(readme, /node --test scripts\/ritual-\*\.test\.js/, 'README must document test runner');
    assert.match(readme, /captionsEnabled/, 'README must document subtitle comfort settings');
});
