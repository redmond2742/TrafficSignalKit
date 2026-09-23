import test from 'node:test';
import assert from 'node:assert/strict';
import { renderRoute } from '../scripts/build-seo-html.mjs';
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
