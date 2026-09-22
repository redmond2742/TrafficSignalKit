import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, escapeRegExp, highlightMatches } from '../src/utils/highlight.js';

test('escapeHtml neutralises every character that can open a tag or attribute', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml(`"quoted" 'single'`), '&quot;quoted&quot; &#39;single&#39;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(42), '42');
});

test('escapeRegExp makes metacharacters literal', () => {
  for (const ch of ['(', '[', '*', '+', '?', '.', '^', '$', '|', '\\']) {
    const re = new RegExp(escapeRegExp(ch));
    assert.ok(re.test(`x${ch}y`), `${ch} should match literally`);
  }
});

test('the default tag matches what the call sites rendered before', () => {
  assert.equal(highlightMatches('abc', 'b'), 'a<strong>b</strong>c');
  assert.equal(highlightMatches('abc', 'b', { tag: 'mark' }), 'a<mark>b</mark>c');
});

test('the payload that used to execute is now inert', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const out = highlightMatches(evil, 'src');
  assert.ok(!out.includes('<img'), 'raw tag survived into the output');
  assert.ok(out.startsWith('&lt;img'));
  assert.equal(out, '&lt;img <strong>src</strong>=x onerror=alert(1)&gt;');
});

test('matching is case insensitive but preserves the original casing', () => {
  assert.equal(highlightMatches('Detector Off', 'detector'), '<strong>Detector</strong> Off');
  assert.equal(highlightMatches('DETECTOR', 'detector'), '<strong>DETECTOR</strong>');
});

test('every occurrence is marked', () => {
  assert.equal(highlightMatches('aXaXa', 'a'), '<strong>a</strong>X<strong>a</strong>X<strong>a</strong>');
});

test('an entity next to a match does not break the tags', () => {
  // The bug this guards: computing offsets on the raw string, then escaping,
  // shifts every index once "&" becomes "&amp;".
  assert.equal(highlightMatches('a&b', 'b'), 'a&amp;<strong>b</strong>');
  assert.equal(highlightMatches('<b>hi</b>', 'hi'), '&lt;b&gt;<strong>hi</strong>&lt;/b&gt;');
});

test('no match and no needle both return escaped text', () => {
  assert.equal(highlightMatches('<b>', 'zzz'), '&lt;b&gt;');
  assert.equal(highlightMatches('<b>', ''), '&lt;b&gt;');
  assert.equal(highlightMatches('<b>', null), '&lt;b&gt;');
});

test('regex metacharacters in the needle are treated literally', () => {
  // "." must not behave as "any character"
  assert.equal(highlightMatches('a.b axb', '.'), 'a<strong>.</strong>b axb');
  assert.equal(highlightMatches('cost (net)', '('), 'cost <strong>(</strong>net)');
});

test('non-string input is coerced rather than dropped', () => {
  assert.equal(highlightMatches(1234, '23'), '1<strong>23</strong>4');
  assert.equal(highlightMatches(null, 'x'), '');
});
