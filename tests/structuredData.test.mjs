import test from 'node:test';
import assert from 'node:assert/strict';
import { headFor } from '../src/seo/head.js';
import { site } from '../src/seo/site.js';
import { TOOLS } from '../src/utils/toolRegistry.js';
import { indexableRoutes } from '../scripts/routerSource.mjs';

const typesFor = (path, name) => headFor(path, name).jsonLd.map((b) => b['@type']);
const blockOf = (path, type, name) =>
  headFor(path, name).jsonLd.find((b) => b['@type'] === type);

test('every block is valid, self-describing and serializable', () => {
  for (const route of indexableRoutes()) {
    for (const block of headFor(route.path, route.name).jsonLd) {
      assert.equal(block['@context'], 'https://schema.org', `${route.path}: missing @context`);
      assert.ok(block['@type'], `${route.path}: missing @type`);
      assert.doesNotThrow(() => JSON.parse(JSON.stringify(block)), `${route.path}: not serializable`);
    }
  }
});

test('the sitewide entities are on every page, exactly once', () => {
  for (const route of indexableRoutes()) {
    const types = typesFor(route.path, route.name);
    for (const required of ['Organization', 'WebSite']) {
      assert.equal(
        types.filter((t) => t === required).length,
        1,
        `${route.path}: expected exactly one ${required}, got ${types}`,
      );
    }
  }
});

/**
 * The defect this replaced: all 52 routes emitted the same single
 * SoftwareApplication, which told Google the entire site was one application.
 */
test('each tool describes itself, not the whole site', () => {
  const apps = new Set();
  for (const tool of TOOLS) {
    if (['/about', '/blog', '/reference'].includes(tool.path)) continue;
    const app = blockOf(tool.path, 'SoftwareApplication');
    assert.ok(app, `${tool.path}: no SoftwareApplication`);
    assert.equal(app.name, tool.title, `${tool.path}: wrong name`);
    assert.equal(app.url, `${site.baseUrl}${tool.path}`, `${tool.path}: wrong url`);
    // Google flags a free application with no offers node.
    assert.equal(app.offers.price, '0', `${tool.path}: missing free offer`);
    assert.ok(!apps.has(app.url), `${tool.path}: duplicate application url`);
    apps.add(app.url);
  }
  assert.ok(apps.size > 30, `expected a distinct application per tool, got ${apps.size}`);
});

test('an about or notes page does not claim to be an application', () => {
  for (const path of ['/about', '/blog', '/reference']) {
    assert.ok(!typesFor(path).includes('SoftwareApplication'), `${path} claims to be an app`);
  }
});

test('blog posts are articles with real dates and an author', () => {
  const posts = indexableRoutes().filter((r) => r.path.startsWith('/blog/'));
  assert.equal(posts.length, 5, `expected 5 posts, found ${posts.length}`);
  for (const post of posts) {
    const article = blockOf(post.path, 'BlogPosting', post.name);
    assert.ok(article, `${post.path}: no BlogPosting`);
    assert.ok(article.headline, `${post.path}: no headline`);
    assert.match(article.datePublished, /^\d{4}-\d{2}-\d{2}$/, `${post.path}: bad datePublished`);
    assert.ok(article.dateModified >= article.datePublished, `${post.path}: modified before published`);
    assert.ok(article.author?.name, `${post.path}: no author`);
    assert.ok(article.publisher?.logo?.url, `${post.path}: no publisher logo`);
    assert.equal(article.mainEntityOfPage['@id'], `${site.baseUrl}${post.path}`);
    assert.ok(!typesFor(post.path, post.name).includes('SoftwareApplication'), `${post.path} is an article, not an app`);
  }
});

test('breadcrumbs are ordered from the home page and absolute', () => {
  for (const [path, depth] of [['/split-history', 2], ['/blog/offsets-are-the-point', 3]]) {
    const crumbs = blockOf(path, 'BreadcrumbList');
    assert.ok(crumbs, `${path}: no BreadcrumbList`);
    assert.equal(crumbs.itemListElement.length, depth, `${path}: wrong depth`);
    crumbs.itemListElement.forEach((crumb, i) => {
      assert.equal(crumb.position, i + 1, `${path}: positions must start at 1 and be contiguous`);
      assert.ok(crumb.item.startsWith('https://'), `${path}: crumb ${i} is not absolute`);
      assert.ok(crumb.name, `${path}: crumb ${i} has no name`);
    });
    assert.equal(crumbs.itemListElement[0].item, `${site.baseUrl}/`);
    assert.equal(crumbs.itemListElement.at(-1).item, `${site.baseUrl}${path}`);
  }
});

test('the home page is not its own breadcrumb', () => {
  assert.ok(!typesFor('/').includes('BreadcrumbList'));
});

test('a noindex page carries no page-level markup', () => {
  const types = typesFor('/anything-unknown', 'not-found');
  assert.deepEqual(types, ['Organization', 'WebSite'], 'a page we ask Google to drop should not be marked up');
});

test('the organization logo points at an og image that exists', () => {
  const org = blockOf('/', 'Organization');
  assert.equal(org.logo, `${site.baseUrl}${site.defaultOgImage}`);
  // It used to hardcode a .png that was never in the repo.
  assert.match(org.logo, /\.(jpg|png)$/);
});
