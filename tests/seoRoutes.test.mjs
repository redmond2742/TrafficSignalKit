import test from 'node:test';
import assert from 'node:assert/strict';
import { routeMeta, metaByPath } from '../src/seo/routes.js';
import { headFor } from '../src/seo/head.js';
import { TOOLS } from '../src/utils/toolRegistry.js';
import { parseRouterRoutes, indexableRoutes } from './routerSource.mjs';

const isNoindex = (meta) => (meta.robots || '').includes('noindex');

test('the router parse is sane', () => {
  // A router refactor that breaks the regex must fail loudly rather than let
  // every guard below pass vacuously over an empty list.
  const routes = parseRouterRoutes();
  assert.ok(routes.length > 40, `router parse looks wrong; found only ${routes.length} routes`);
  assert.ok(indexableRoutes().length > 40, 'no indexable routes parsed');
});

/**
 * The guard that matters: this is the one that makes "a new route ships with
 * the generic homepage title" a failing test instead of something you find
 * months later in Search Console. Twelve routes were in that state.
 */
test('every real route has its own SEO metadata', () => {
  for (const route of indexableRoutes()) {
    const meta = metaByPath[route.path];
    assert.ok(meta, `${route.path} (${route.name}) has no routeMeta entry`);
    assert.equal(meta.path, route.path, `${route.name}: routeMeta path disagrees with the router`);
  }
});

test('every SEO entry points at a real route', () => {
  const paths = new Set(parseRouterRoutes().map((route) => route.path));
  for (const [name, meta] of Object.entries(routeMeta)) {
    if (!meta.path) continue; // the 404 entry deliberately has none
    assert.ok(paths.has(meta.path), `routeMeta.${name} points at ${meta.path}, which is not a route`);
  }
});

test('every tool in the registry has SEO metadata', () => {
  for (const tool of TOOLS) {
    assert.ok(metaByPath[tool.path], `${tool.path} is in the registry but has no SEO metadata`);
  }
});

test('titles and descriptions are unique across routes', () => {
  const seenTitle = new Map();
  const seenDescription = new Map();
  for (const [name, meta] of Object.entries(routeMeta)) {
    if (seenTitle.has(meta.title)) {
      assert.fail(`${name} and ${seenTitle.get(meta.title)} share a title: ${meta.title}`);
    }
    seenTitle.set(meta.title, name);
    if (seenDescription.has(meta.description)) {
      assert.fail(`${name} and ${seenDescription.get(meta.description)} share a description`);
    }
    seenDescription.set(meta.description, name);
  }
});

test('titles and descriptions fit what search engines display', () => {
  for (const [name, meta] of Object.entries(routeMeta)) {
    if (isNoindex(meta)) continue; // length is irrelevant on a page that is not indexed
    assert.ok(meta.title.length <= 60, `${name}: title is ${meta.title.length} chars, truncated at 60`);
    assert.ok(
      meta.description.length >= 50 && meta.description.length <= 160,
      `${name}: description is ${meta.description.length} chars, want 50-160`,
    );
  }
});

test('headFor resolves by path and by name, and never invents a canonical for a 404', () => {
  const byPath = headFor('/split-history');
  assert.equal(byPath.canonical, 'https://www.trafficsignalkit.com/split-history');
  assert.ok(byPath.title.includes('Split History'));

  // The catch-all has a pattern for a path, so only its name resolves.
  const notFound = headFor('/some-url-that-does-not-exist', 'not-found');
  assert.equal(notFound.canonical, null, 'a noindex page must not carry a canonical');
  assert.match(notFound.robots, /noindex/);
});

test('every indexable route produces a complete, absolute head', () => {
  for (const route of indexableRoutes()) {
    const head = headFor(route.path, route.name);
    assert.ok(head.title, `${route.path}: no title`);
    assert.ok(head.description, `${route.path}: no description`);
    assert.equal(
      head.canonical,
      `https://www.trafficsignalkit.com${route.path}`,
      `${route.path}: canonical is wrong`,
    );
    assert.ok(head.ogImage.startsWith('https://'), `${route.path}: og:image must be absolute`);
    assert.ok(head.jsonLd.length >= 3, `${route.path}: expected the sitewide JSON-LD blocks`);
  }
});

test('canonicals all point at the host that is actually served', () => {
  // Render serves www and 301s the apex. A canonical on the apex points at a
  // redirect, which is what every one of these used to do.
  for (const route of indexableRoutes()) {
    const { canonical } = headFor(route.path, route.name);
    assert.ok(
      canonical.startsWith('https://www.trafficsignalkit.com/'),
      `${route.path}: canonical ${canonical} is not on the served host`,
    );
  }
});
