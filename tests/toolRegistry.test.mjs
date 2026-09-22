import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TOOLS,
  NAV_GROUPS,
  HOME_ORDER,
  FEATURED_COUNT,
  featuredTools,
  otherTools,
  navLabel,
  searchTerms,
  matchTools,
  topicCounts,
  toolsInGroup,
  homeTools,
} from '../src/utils/toolRegistry.js';

test('every entry is complete and uniquely addressed', () => {
  const paths = TOOLS.map((t) => t.path);
  assert.equal(new Set(paths).size, paths.length, 'duplicate path in TOOLS');
  const groups = new Set(NAV_GROUPS.map((g) => g.id));
  for (const tool of TOOLS) {
    assert.ok(tool.path.startsWith('/'), `${tool.path}: path must be rooted`);
    assert.ok(tool.title && tool.title.trim(), `${tool.path}: missing title`);
    assert.ok(tool.description && tool.description.trim(), `${tool.path}: missing description`);
    assert.ok(Array.isArray(tool.topics) && tool.topics.length, `${tool.path}: missing topics`);
    assert.ok(groups.has(tool.group), `${tool.path}: unknown group ${tool.group}`);
  }
});

test('navLabel prefers the short menu label, falling back to the title', () => {
  assert.equal(navLabel({ title: 'Long Descriptive Name', navTitle: 'Short' }), 'Short');
  assert.equal(navLabel({ title: 'Only One' }), 'Only One');
});

test('searchTerms splits on whitespace and ignores empty input', () => {
  assert.deepEqual(searchTerms('  Red   Light '), ['red', 'light']);
  assert.deepEqual(searchTerms(''), []);
  assert.deepEqual(searchTerms(null), []);
});

test('an empty query matches everything, and does not alias the input', () => {
  const all = matchTools(TOOLS, '');
  assert.equal(all.length, TOOLS.length);
  assert.notEqual(all, TOOLS);
});

test('a tool is findable by its topics alone, not just its name', () => {
  // "machine learning" appears in no title or description on the site.
  const hits = matchTools(TOOLS, 'machine learning');
  assert.deepEqual(hits.map((t) => t.path), ['/yolo-image-annotator']);
});

test('extra terms narrow the result rather than widening it', () => {
  const broad = matchTools(TOOLS, 'detection');
  const narrow = matchTools(TOOLS, 'detection heat');
  assert.ok(broad.length > narrow.length, 'second term did not narrow');
  for (const tool of narrow) {
    assert.ok(broad.some((b) => b.path === tool.path), 'narrow result escaped the broad set');
  }
});

test('search is case insensitive', () => {
  assert.deepEqual(
    matchTools(TOOLS, 'PEDESTRIAN').map((t) => t.path),
    matchTools(TOOLS, 'pedestrian').map((t) => t.path),
  );
});

test('topicCounts is ordered by popularity, then alphabetically', () => {
  const counts = topicCounts(TOOLS);
  assert.ok(counts.length > 0);
  for (let i = 1; i < counts.length; i += 1) {
    const prev = counts[i - 1];
    const cur = counts[i];
    assert.ok(
      prev.count > cur.count || (prev.count === cur.count && prev.name.localeCompare(cur.name) <= 0),
      `out of order at ${prev.name} -> ${cur.name}`,
    );
  }
  // counts must agree with the raw data
  const manual = TOOLS.filter((t) => (t.topics || []).includes(counts[0].name)).length;
  assert.equal(counts[0].count, manual);
});

test('each menu holds only its own tools, alphabetically', () => {
  for (const group of NAV_GROUPS) {
    const inGroup = toolsInGroup(TOOLS, group.id);
    assert.ok(inGroup.length > 0, `${group.id} menu is empty`);
    for (const tool of inGroup) assert.equal(tool.group, group.id);
    const labels = inGroup.map(navLabel);
    assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)));
  }
  // every tool reaches exactly one menu
  const total = NAV_GROUPS.reduce((sum, g) => sum + toolsInGroup(TOOLS, g.id).length, 0);
  assert.equal(total, TOOLS.length, 'a tool is in no menu, or in two');
});

test('home cards all carry art', () => {
  const cards = homeTools(TOOLS);
  assert.ok(cards.length > 0);
  for (const tool of cards) {
    assert.ok(tool.image, `${tool.path}: home card without an image`);
  }
});

/**
 * The drift guard.
 *
 * Reading the router as text is crude, but it is a real running check with no
 * new dependencies, and it is what turns "the nav quietly disagrees with the
 * router" from something you find in production into a failing test.
 */
test('every registry path is a real route', () => {
  const routerSrc = fs.readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8');
  const routes = new Set(
    [...routerSrc.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  );
  assert.ok(routes.size > 20, 'router parse looks wrong; found only ' + routes.size + ' paths');
  for (const tool of TOOLS) {
    assert.ok(routes.has(tool.path), `${tool.path} is in the registry but has no route`);
  }
});

test('HOME_ORDER lists every home card exactly once', () => {
  assert.equal(new Set(HOME_ORDER).size, HOME_ORDER.length, 'duplicate path in HOME_ORDER');
  const cards = homeTools(TOOLS).map((t) => t.path);
  for (const path of HOME_ORDER) {
    assert.ok(cards.includes(path), `${path} is ordered but is not a home card`);
  }
  // the guard that matters: a new card must be placed deliberately, not
  // silently appended to the bottom of the page
  for (const path of cards) {
    assert.ok(HOME_ORDER.includes(path), `${path} is a home card but missing from HOME_ORDER`);
  }
});

test('home cards come back in HOME_ORDER, not registry order', () => {
  assert.deepEqual(homeTools(TOOLS).map((t) => t.path), HOME_ORDER);
});

test('an unlisted home card is appended rather than dropped', () => {
  const extra = { path: '/made-up', title: 'Made Up', description: 'x', topics: ['x'], group: 'misc' };
  const result = homeTools([...TOOLS, extra]).map((t) => t.path);
  assert.equal(result.length, HOME_ORDER.length + 1);
  assert.equal(result[result.length - 1], '/made-up');
});

test('featured is the head of the order, and the rest is the tail', () => {
  const featured = featuredTools(TOOLS);
  const rest = otherTools(TOOLS);
  assert.equal(featured.length, FEATURED_COUNT);
  assert.deepEqual(featured.map((t) => t.path), HOME_ORDER.slice(0, FEATURED_COUNT));
  assert.deepEqual(rest.map((t) => t.path), HOME_ORDER.slice(FEATURED_COUNT));
});

test('featured and the rest partition the home cards exactly', () => {
  const all = homeTools(TOOLS);
  const combined = [...featuredTools(TOOLS), ...otherTools(TOOLS)];
  assert.equal(combined.length, all.length, 'a card was dropped or duplicated');
  assert.equal(new Set(combined.map((t) => t.path)).size, all.length, 'a card appears twice');
});

test('every featured card has art, since they are the largest on the page', () => {
  for (const tool of featuredTools(TOOLS)) {
    assert.ok(tool.image, `${tool.path} is featured but has no image`);
  }
});
