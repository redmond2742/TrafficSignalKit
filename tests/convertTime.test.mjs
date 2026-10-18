import test from 'node:test';
import assert from 'node:assert/strict';
import convertTime from '../src/mixins/convertTime.js';

const convert = (ts) => convertTime.methods.convertTimestamp.call(convertTime.methods, ts);
const at = (h, m, s, ms) => new Date(2026, 3, 14, h, m, s, ms).getTime();

/**
 * The bug this guards: the M/D/YYYY branch parsed with luxon's "S" token,
 * which is milliseconds, so the tenths every controller export carries were
 * read as thousandths and every duration was off by up to 0.9 s.
 */
test('tenths of a second are tenths, not milliseconds', () => {
  assert.equal(convert('4/14/2026 07:00:35.5').MillisecFromEpoch, at(7, 0, 35, 500));
  assert.equal(convert('04/14/2026 07:00:35.1').MillisecFromEpoch, at(7, 0, 35, 100));
  assert.equal(convert('4/14/2026 07:00:35.25').MillisecFromEpoch, at(7, 0, 35, 250));
});

test('a 3.5 s yellow measures 3.5 s', () => {
  const start = convert('4/14/2026 07:00:42.0').MillisecFromEpoch;
  const end = convert('4/14/2026 07:00:45.5').MillisecFromEpoch;
  assert.equal((end - start) / 1000, 3.5);
});

test('a one-digit hour is read rather than rejected', () => {
  const result = convert('4/14/2026 7:05:09.4');
  assert.equal(result.calculatable, true);
  assert.equal(result.MillisecFromEpoch, at(7, 5, 9, 400));
});

test('the readable form still shows tenths', () => {
  assert.equal(convert('4/14/2026 07:00:35.5').humanReadable, 'Tue, Apr 14 2026 7:00:35.5 AM');
  assert.equal(convert('4/14/2026 07:00:35.0').humanReadable, 'Tue, Apr 14 2026 7:00:35.0 AM');
});
