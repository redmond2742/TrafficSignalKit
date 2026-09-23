import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRoute, outputPathsFor } from '../scripts/build-seo-html.mjs';
import { headFor } from '../src/seo/head.js';
import { indexableRoutes } from '../scripts/routerSource.mjs';

// A stand-in for dist/index.html: same shape, none of the build hashes.
const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Traffic Signal Kit | Traffic Engineering Tools &amp; Simulators</title>
  <meta name="description" content="homepage description" />
  <meta property="og:title" content="homepage" />
  <meta property="og:image" content="/og/traffic-signal-kit.jpg" />
  <script type="module" src="/assets/index-abc123.js"></script>
</head>
<body><div id="app"></div></body>
</html>`;

const route = (path) => indexableRoutes().find((r) => r.path === path);

test('a route gets its own title, description and canonical', () => {
  const { html } = renderRoute(TEMPLATE, route('/split-history'));
  assert.match(html, /<title>High-Resolution Split History \| Phase Termination Analysis<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.trafficsignalkit\.com\/split-history">/);
  assert.ok(!html.includes('homepage description'), 'the homepage description survived');
  assert.equal((html.match(/<title>/g) || []).length, 1, 'more than one title');
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, 'more than one canonical');
});

test('existing meta tags are replaced, not duplicated', () => {
  const { html } = renderRoute(TEMPLATE, route('/split-history'));
  for (const key of ['description', 'og:title', 'og:image']) {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    const count = (html.match(new RegExp(`<meta ${attr}="${key}"`, 'g')) || []).length;
    assert.equal(count, 1, `${key} appears ${count} times`);
  }
  assert.ok(!html.includes('content="homepage"'), 'the homepage og:title survived');
});

test('the asset script is untouched, so subdirectory files still boot', () => {
  const { html } = renderRoute(TEMPLATE, route('/tools/block-logic'));
  // Absolute, so /tools/block-logic/index.html resolves it the same as /.
  assert.match(html, /src="\/assets\/index-abc123\.js"/);
});

test('JSON-LD is injected, tagged for removal, and parseable', () => {
  const { html } = renderRoute(TEMPLATE, route('/split-history'));
  const blocks = [...html.matchAll(/<script type="application\/ld\+json" data-seo-prerender>([\s\S]*?)<\/script>/g)];
  assert.ok(blocks.length >= 3, `expected the sitewide blocks, got ${blocks.length}`);
  for (const [, json] of blocks) {
    // < escaping must still round-trip through JSON.parse
    assert.ok(JSON.parse(json.replace(/\\u003c/g, '<'))['@type'], 'block has no @type');
  }
  assert.ok(!/<script type="application\/ld\+json">/.test(html), 'an untagged block would survive hydration and duplicate');
});

test('titles and descriptions are escaped for HTML', () => {
  // This one really does contain an ampersand.
  const { html } = renderRoute(TEMPLATE, route('/blog/offsets-are-the-point'));
  assert.match(html, /<title>Offsets Are the Point \| Coordination &amp; the Green Wave<\/title>/);
  assert.ok(!/<title>[^<]*[^m]& /.test(html), 'a raw ampersand reached the title');
});

test('every indexable route renders with a canonical matching its own path', () => {
  for (const r of indexableRoutes()) {
    if (r.path === '/') continue;
    const { html } = renderRoute(TEMPLATE, r);
    const head = headFor(r.path, r.name);
    assert.ok(
      html.includes(`<link rel="canonical" href="${head.canonical}">`),
      `${r.path}: canonical missing or wrong`,
    );
    assert.ok(!html.includes('<title>Traffic Signal Kit | Traffic Engineering Tools'), `${r.path}: kept the homepage title`);
  }
});

/**
 * Render serves dist/<path>/index.html only when the URL already ends in a
 * slash -- probed live: /_seoprobe returned the SPA shell, /_seoprobe/ returned
 * the file, and there was no redirect between them. Emitting <path>.html as
 * well means the canonical URLs resolve under either host convention.
 */
test('each route is written in both URL forms', () => {
  assert.deepEqual(outputPathsFor('/split-history'), [
    'split-history/index.html',
    'split-history.html',
  ]);
});

test('nested routes keep their directory structure in both forms', () => {
  assert.deepEqual(outputPathsFor('/blog/offsets-are-the-point'), [
    'blog/offsets-are-the-point/index.html',
    'blog/offsets-are-the-point.html',
  ]);
  assert.deepEqual(outputPathsFor('/tools/block-logic'), [
    'tools/block-logic/index.html',
    'tools/block-logic.html',
  ]);
});

test('no emitted path escapes dist', () => {
  for (const route of indexableRoutes()) {
    if (route.path === '/') continue;
    for (const out of outputPathsFor(route.path)) {
      assert.ok(!out.startsWith('/'), `${route.path}: ${out} is absolute`);
      assert.ok(!out.includes('..'), `${route.path}: ${out} escapes dist`);
    }
  }
});

test('a route that is also a directory prefix gets both without colliding', () => {
  // /blog is a route and /blog/* are routes, so dist needs blog.html beside a
  // blog/ directory. They coexist; a collision would be a build failure.
  const [dir, flat] = outputPathsFor('/blog');
  assert.equal(dir, 'blog/index.html');
  assert.equal(flat, 'blog.html');
});
