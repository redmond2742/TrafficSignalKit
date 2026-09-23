import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSitemap, sitemapUrls } from '../scripts/generate-sitemap.mjs';
import { indexableRoutes } from '../scripts/routerSource.mjs';
import { metaByPath } from '../src/seo/routes.js';

const committed = () =>
  fs.readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');

/**
 * The guard that matters here: regenerating and comparing turns "someone added
 * a route and forgot the sitemap" into a failing test rather than a silent
 * omission. The hand-maintained file had fallen 22 routes behind.
 */
test('the committed sitemap matches what the generator produces', () => {
  assert.equal(
    committed(),
    buildSitemap(),
    'public/sitemap.xml is stale; run: node scripts/generate-sitemap.mjs',
  );
});

test('every indexable route is listed exactly once', () => {
  const urls = sitemapUrls();
  assert.equal(new Set(urls).size, urls.length, 'duplicate url in the sitemap');
  for (const route of indexableRoutes()) {
    if (((metaByPath[route.path]?.robots) || '').includes('noindex')) continue;
    assert.ok(
      urls.includes(`https://www.trafficsignalkit.com${route.path}`),
      `${route.path} is a real route but is not in the sitemap`,
    );
  }
});

test('the sitemap contains no redirecting or unroutable urls', () => {
  const paths = new Set(indexableRoutes().map((route) => route.path));
  for (const url of sitemapUrls()) {
    // Render 301s the apex to www, so an apex url here wastes every crawl.
    assert.ok(url.startsWith('https://www.trafficsignalkit.com'), `${url} is not on the served host`);
    const path = url.replace('https://www.trafficsignalkit.com', '') || '/';
    assert.ok(paths.has(path), `${url} does not correspond to a route`);
  }
});

test('the blog posts are present, which they were not before', () => {
  const urls = sitemapUrls().filter((url) => url.includes('/blog/'));
  assert.equal(urls.length, 5, `expected 5 blog posts in the sitemap, found ${urls.length}`);
});

test('it is well-formed and declares the sitemap namespace', () => {
  const xml = committed();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
  assert.ok(!xml.includes('<lastmod>'), 'lastmod must be omitted rather than faked');
});
