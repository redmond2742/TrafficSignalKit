import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/**
 * The guard that matters.
 *
 * Without "type": "module", Node treats every .js in this repo as CommonJS
 * unless it happens to sniff the syntax -- and that sniffing only exists from
 * Node 20.19. Render builds on 20.11, where scripts/generate-sitemap.mjs died
 * with "Named export 'metaByPath' not found ... is a CommonJS module" and the
 * whole deploy failed, despite every local run passing.
 *
 * Declaring the format removes the version dependency entirely.
 */
test('package.json declares the module format', () => {
  assert.equal(
    pkg.type,
    'module',
    'the build scripts import src/*.js as ESM; without this they break on Node < 20.19',
  );
});

test('no source file Node has to load uses CommonJS', () => {
  // These are the trees that scripts/ and tests/ import from, so Node parses
  // them directly rather than Vite. A require() or module.exports here would
  // now be a hard error rather than a silent fallback.
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const src = fs.readFileSync(full, 'utf8');
      // ignore commented-out lines; only real statements matter
      const code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      if (/\brequire\s*\(|\bmodule\.exports\b|\bexports\.\w/.test(code)) offenders.push(path.relative(root, full));
    }
  };
  walk(path.join(root, 'src/utils'));
  walk(path.join(root, 'src/seo'));
  assert.deepEqual(offenders, [], 'CommonJS syntax in a tree Node loads as ESM');
});

test('the scripts import only from trees that are safe to load in Node', () => {
  for (const name of fs.readdirSync(path.join(root, 'scripts'))) {
    const src = fs.readFileSync(path.join(root, 'scripts', name), 'utf8');
    for (const m of src.matchAll(/from\s+'(\.\.\/src\/[^']+)'/g)) {
      const target = path.join(root, 'scripts', m[1]);
      assert.ok(fs.existsSync(target), `scripts/${name} imports ${m[1]}, which does not exist`);
      // Extensionless imports resolve under Vite but throw under Node.
      assert.ok(/\.(js|mjs|json)$/.test(m[1]), `scripts/${name} imports ${m[1]} without a file extension`);
    }
  }
});
