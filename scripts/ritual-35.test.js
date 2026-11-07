// Ritual XXXV — QA-F06: delivery documents must not point at files that do not exist.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function markdownFiles(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) return markdownFiles(rel);
        return entry.name.endsWith('.md') ? [rel] : [];
    });
}

test('QA-F06: every relative Markdown link in README and docs resolves to an existing file', () => {
    const files = ['README.md', ...markdownFiles('docs'), ...markdownFiles('assets')];
    const broken = [];
    for (const file of files) {
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
            if (/^(https?:|mailto:|#)/.test(target)) continue;
            const resolved = path.join(root, path.dirname(file), decodeURIComponent(target.split('#')[0]));
            if (!fs.existsSync(resolved)) broken.push(`${file} -> ${target}`);
        }
    }
    assert.deepEqual(broken, []);
});

test('QA-F06: reports do not cite node --check as YAML validation', () => {
    for (const file of markdownFiles('docs')) {
        if (file.endsWith('QA_REPORT.md')) continue; // the QA report quotes the original claim
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        for (const line of text.split('\n')) {
            if (/node --check [^\s`]*\.ya?ml/.test(line)) {
                assert.match(line, /~~.*~~|Düzeltme|does not|doğrulamamıştır/, `${file} still presents: ${line.trim()}`);
            }
        }
    }
});
