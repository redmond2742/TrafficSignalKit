import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { headFor } from '../src/seo/head.js';
import { site } from '../src/seo/site.js';
import { TOOLS } from '../src/utils/toolRegistry.js';
import { indexableRoutes } from '../scripts/routerSource.mjs';

const publicPath = (url) =>
  new URL('../public' + url.replace(site.baseUrl, ''), import.meta.url);

/**
 * The guard that matters: site.js pointed at /og/traffic-signal-kit.png for
 * months and the file never existed, so every share of every page showed a
 * broken card. Nothing caught it because nothing checked.
 */
test('every route resolves to an og image that exists on disk', () => {
  const missing = [];
  for (const route of indexableRoutes()) {
    const { ogImage } = headFor(route.path, route.name);
    if (!fs.existsSync(publicPath(ogImage))) missing.push(`${route.path} -> ${ogImage}`);
  }
  assert.deepEqual(missing, [], 'og images referenced but not present');
});

test('the sitewide default exists', () => {
  assert.ok(fs.existsSync(publicPath(site.defaultOgImage)), `${site.defaultOgImage} is missing`);
});

test('every tool with card art has its own social card', () => {
  for (const tool of TOOLS.filter((t) => t.image)) {
    const { ogImage } = headFor(tool.path);
    assert.ok(
      ogImage.endsWith(`${tool.path.replace(/^\//, '').replace(/\//g, '-').toLowerCase()}.jpg`),
      `${tool.path} falls back to the generic card despite having art`,
    );
  }
});

test('og images are absolute, on the served host, and a crawler-safe format', () => {
  for (const route of indexableRoutes()) {
    const { ogImage } = headFor(route.path, route.name);
    assert.ok(ogImage.startsWith('https://www.trafficsignalkit.com/'), `${route.path}: ${ogImage} is not absolute`);
    // Several social crawlers still reject WebP, so these must stay jpg/png.
    assert.match(ogImage, /\.(jpg|png)$/, `${route.path}: ${ogImage} is not a crawler-safe format`);
  }
});

test('they meet the 1200x630 floor for a large summary card', () => {
  // JPEG SOF0/SOF2 marker carries the dimensions; no image library needed.
  const dimensions = (file) => {
    const buf = fs.readFileSync(file);
    for (let i = 2; i < buf.length - 9; ) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    throw new Error('no SOF marker in ' + file);
  };
  for (const url of new Set(indexableRoutes().map((r) => headFor(r.path, r.name).ogImage))) {
    const { width, height } = dimensions(publicPath(url));
    assert.equal(width, 1200, `${url} is ${width}px wide`);
    assert.equal(height, 630, `${url} is ${height}px tall`);
  }
});
