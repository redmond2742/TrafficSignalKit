import test from 'node:test';
import assert from 'node:assert/strict';
import { dragHasFiles, fileMatchesAccept, pickDroppedFiles, rejectedMessage } from '../src/utils/fileDrop.js';

const file = (name, type = '') => ({ name, type });

test('only a drag carrying files counts: text and page blocks are left alone', () => {
  assert.equal(dragHasFiles({ types: ['Files'] }), true);
  assert.equal(dragHasFiles({ types: ['text/plain', 'text/html'] }), false);
  assert.equal(dragHasFiles({ types: [] }), false);
  assert.equal(dragHasFiles(null), false);
});

test('no accept list takes anything, as a file input does', () => {
  assert.equal(fileMatchesAccept(file('log.dat'), ''), true);
  assert.equal(fileMatchesAccept(file('anything'), undefined), true);
});

test('an extension matches whatever the case, and with no reported type', () => {
  const accept = '.csv,.txt,text/csv,text/plain';
  assert.equal(fileMatchesAccept(file('EXPORT.CSV'), accept), true);
  assert.equal(fileMatchesAccept(file('log.txt'), accept), true);
  assert.equal(fileMatchesAccept(file('report.pdf', 'application/pdf'), accept), false);
  assert.equal(fileMatchesAccept(file('notcsv'), accept), false);
});

test('a type or a family of types matches when the extension says nothing', () => {
  assert.equal(fileMatchesAccept(file('export', 'text/csv'), '.csv,text/csv'), true);
  assert.equal(fileMatchesAccept(file('photo', 'image/png'), 'image/*'), true);
  assert.equal(fileMatchesAccept(file('clip', 'video/mp4'), 'image/*'), false);
});

test('dropped files are sorted, and a one-file box keeps the first acceptable', () => {
  const dropped = [file('a.pdf'), file('b.csv'), file('c.csv')];
  const many = pickDroppedFiles(dropped, { accept: '.csv' });
  assert.deepEqual(many.accepted.map((f) => f.name), ['b.csv', 'c.csv']);
  assert.deepEqual(many.rejected.map((f) => f.name), ['a.pdf']);
  const one = pickDroppedFiles(dropped, { accept: '.csv', multiple: false });
  assert.deepEqual(one.accepted.map((f) => f.name), ['b.csv']);
  // the extra csv was not the wrong kind, so it is not reported as refused
  assert.deepEqual(one.rejected.map((f) => f.name), ['a.pdf']);
  assert.deepEqual(pickDroppedFiles(null), { accepted: [], rejected: [] });
});

test('the refusal names the files and what the box takes', () => {
  assert.equal(
    rejectedMessage([file('a.pdf'), file('b.docx')], '.csv,.txt,text/csv'),
    'Not loaded: a.pdf, b.docx. This box takes .csv, .txt.',
  );
  assert.equal(rejectedMessage([file('clip.mp4')], 'image/*'), 'Not loaded: clip.mp4.');
});
