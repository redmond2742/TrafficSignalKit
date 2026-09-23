import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;
const PLUGIN = path.join(SRC, 'plugins/vuetify.js');

/** Every mdi-* name written anywhere in the app. */
function iconsUsedInSource() {
  const found = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(vue|js)$/.test(entry.name)) continue;
      if (full === PLUGIN) continue; // the map itself
      for (const m of fs.readFileSync(full, 'utf8').matchAll(/mdi-[a-z0-9-]+/g)) found.add(m[0]);
    }
  };
  walk(SRC);
  return found;
}

/** The keys of the ICONS map, read from source so no CSS import is needed. */
function iconsMapped() {
  const src = fs.readFileSync(PLUGIN, 'utf8');
  const block = /export const ICONS = \{([\s\S]*?)\n\}/.exec(src);
  assert.ok(block, 'could not find the ICONS map');
  return new Set([...block[1].matchAll(/'(mdi-[a-z0-9-]+)'/g)].map((m) => m[1]));
}

/**
 * The guard that matters: @mdi/font resolved any icon name by CSS class, so a
 * typo just showed nothing. With SVG paths an unmapped name renders an empty
 * icon, which is easy to miss in review and obvious to a user.
 */
test('every icon used in the app is mapped to an SVG path', () => {
  const mapped = iconsMapped();
  const missing = [...iconsUsedInSource()].filter((name) => !mapped.has(name)).sort();
  assert.deepEqual(missing, [], 'icons used but not imported in src/plugins/vuetify.js');
});

test('the map carries no icons the app never uses', () => {
  const used = iconsUsedInSource();
  const unused = [...iconsMapped()].filter((name) => !used.has(name)).sort();
  assert.deepEqual(unused, [], 'mapped but unused; drop them so the bundle stays honest');
});

test('the icon font is gone for good', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!deps['@mdi/font'], '@mdi/font is back; it ships 3.3MB of webfonts for 21 icons');
  assert.ok(deps['@mdi/js'], '@mdi/js must be a dependency');

  const plugin = fs.readFileSync(PLUGIN, 'utf8');
  assert.ok(!plugin.includes('materialdesignicons.css'), 'the icon stylesheet import is back');
});
