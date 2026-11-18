import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHighResFormat, normalizeHighResText } from '../src/utils/highResFormats.js';
import { sampleHighResLog, sampleGpxPass, sampleBlockLogicCsv, sampleSignalLocations } from '../src/utils/sampleData.js';
import { parseTimestamp } from '../src/utils/highResTimestamp.js';
import { parseHighResEvents } from '../src/utils/pedConflictCorrelator.js';

// D4's export: event code and parameter first, padded with spaces, then the
// time, then a message index nothing needs.
const D4 = [
  'EventCode,Param,DateTime,MsgIdx',
  ' 22,  2,05/30/2024 08:00:05.8,1481',
  '  3,  2,05/30/2024 08:00:06.8,1482',
  '  3,  6,05/30/2024 08:00:06.8,1483',
  '  1,  4,05/30/2024 08:01:02.8,1523',
  '151,  3,05/30/2024 08:00:41.9,1511',
  '',
].join('\r\n');

test('a D4 log is recognised by its header, and its message index set aside', () => {
  const d = detectHighResFormat(D4);
  assert.equal(d.id, 'd4');
  assert.equal(d.name, 'D4');
  assert.equal(d.hasHeader, true);
  assert.deepEqual(d.columns, ['EventCode', 'Param', 'DateTime', 'MsgIdx']);
  assert.deepEqual(d.ignored, ['MsgIdx']);
});

test('a D4 log is reordered to timestamp, event code, parameter, spaces trimmed', () => {
  const { detection, text } = normalizeHighResText(D4);
  assert.deepEqual(text.split('\n'), [
    '05/30/2024 08:00:05.8,22,2',
    '05/30/2024 08:00:06.8,3,2',
    '05/30/2024 08:00:06.8,3,6',
    '05/30/2024 08:01:02.8,1,4',
    '05/30/2024 08:00:41.9,151,3',
  ]);
  assert.equal(detection.rows, 5);
  assert.equal(detection.skipped, 0);
  // the proof keeps each line exactly as the file had it
  assert.deepEqual(detection.sample[0], { raw: ' 22,  2,05/30/2024 08:00:05.8,1481', converted: '05/30/2024 08:00:05.8,22,2' });
});

test('what a D4 log becomes reads in the existing parsers', () => {
  const { text } = normalizeHighResText(D4);
  assert.equal(parseTimestamp(text.split(',')[0]), new Date(2024, 4, 30, 8, 0, 5, 800).getTime());
  const { events, skipped } = parseHighResEvents(text);
  assert.equal(events.length, 5);
  assert.equal(skipped, 0);
  assert.deepEqual([events[0].code, events[0].param], [22, 2]);
});

test('a D4 log without its header is still recognised by where the values sit', () => {
  const noHeader = D4.split('\r\n').slice(1).join('\n');
  const { detection, text } = normalizeHighResText(noHeader);
  assert.equal(detection.id, 'd4');
  assert.equal(detection.hasHeader, false);
  assert.deepEqual(detection.ignored, ['MsgIdx']);
  assert.equal(text.split('\n')[0], '05/30/2024 08:00:05.8,22,2');
});

test('two D4 files joined: the second header is not counted as a bad line', () => {
  const { detection } = normalizeHighResText(`${D4}\n${D4}`);
  assert.equal(detection.rows, 10);
  assert.equal(detection.skipped, 0);
  const junk = normalizeHighResText(`${D4}\nnot a row\n`).detection;
  assert.equal(junk.skipped, 1);
});

test('a Trafficware/Cubic log is recognised and handed on untouched', () => {
  const log = sampleHighResLog();
  const { detection, text } = normalizeHighResText(log);
  assert.equal(detection.name, 'Trafficware/Cubic');
  assert.equal(detection.converted, false);
  assert.equal(detection.rows, log.split('\n').length);
  assert.equal(text, log, 'the very same string, not a rewrite');
  // tenths-of-a-second epoch times, as in the tools' own examples
  assert.equal(detectHighResFormat('16764339605, 1, 6\n16764339809, 8, 6').id, 'trafficware');
});

test('other layouts are reordered by the names in their header', () => {
  const csv = 'SignalID,Timestamp,EventCode,EventParam\n1001,2024-05-30 08:00:05.8,22,2\n1001,2024-05-30 08:00:06.8,3,6\n';
  const { detection, text } = normalizeHighResText(csv);
  assert.equal(detection.id, 'headed');
  assert.deepEqual(detection.ignored, ['SignalID']);
  assert.deepEqual(text.split('\n'), ['2024-05-30 08:00:05.8,22,2', '2024-05-30 08:00:06.8,3,6']);
});

test('what is not a controller log is left exactly as it was', () => {
  const others = {
    gpx: sampleGpxPass(),
    'detector map': 'Det 1\t1\nDet 2\t2',
    'phase, detector map': '1, 1\n2, 2',
    'signal list': 'signal_id,agency_id,latitude,longitude\n16,SF,37.9,-122.0',
    'block logic rows': sampleBlockLogicCsv(),
    'signal locations': sampleSignalLocations(),
    'half typed': '4/14/2026 07:0',
    empty: '',
  };
  for (const [name, text] of Object.entries(others)) {
    const result = normalizeHighResText(text);
    assert.equal(result.detection, null, `${name} was taken for a log`);
    assert.equal(result.text, text, `${name} was changed`);
  }
});

test('a log that is mostly something else is not believed', () => {
  const mostlyNotes = ['notes about the cabinet', 'checked loops', 'replaced a card', ' 22,  2,05/30/2024 08:00:05.8,1481'].join('\n');
  assert.equal(detectHighResFormat(mostlyNotes), null);
});
