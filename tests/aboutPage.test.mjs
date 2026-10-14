import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseRouterRoutes } from '../scripts/routerSource.mjs';

const source = fs.readFileSync(new URL('../src/views/About.vue', import.meta.url), 'utf8');

/**
 * The About page links into the tools from running prose, where a renamed
 * route would not show up as anything but a dead link. These keep it honest.
 */
test('every tool the About page links to is a real route', () => {
  const routes = parseRouterRoutes();
  const live = new Set(routes.filter((r) => !r.redirect && !r.isCatchAll).map((r) => r.path));
  const targets = [...source.matchAll(/<router-link\s+to="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(targets.length >= 10, `expected the tool links, found ${targets.length}`);
  const dead = targets.filter((to) => !live.has(to));
  assert.deepEqual(dead, [], 'links to routes that do not exist, or only redirect');
});

test('links that leave the site open in a new tab, without handing it the opener', () => {
  const external = [...source.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(external.length > 0);
  for (const tag of external) {
    assert.match(tag, /target="_blank"/, tag);
    assert.match(tag, /rel="noopener"/, tag);
  }
});
