import test from 'node:test';
import assert from 'node:assert/strict';
import {
  columnName,
  escapeXml,
  excelSerial,
  safeSheetName,
  sheetXml,
  xlsxEntries,
} from '../src/utils/xlsx.js';

test('columnName counts past Z the way a spreadsheet does', () => {
  assert.equal(columnName(0), 'A');
  assert.equal(columnName(25), 'Z');
  // The carry is the part that is easy to get wrong: there is no column "BA"
  // before "AA", because the alphabet has no zero digit.
  assert.equal(columnName(26), 'AA');
  assert.equal(columnName(27), 'AB');
  assert.equal(columnName(51), 'AZ');
  assert.equal(columnName(52), 'BA');
  assert.equal(columnName(701), 'ZZ');
  assert.equal(columnName(702), 'AAA');
});

test('escapeXml neutralises the five markup characters', () => {
  assert.equal(escapeXml('a & b'), 'a &amp; b');
  assert.equal(escapeXml('<tag>'), '&lt;tag&gt;');
  assert.equal(escapeXml('say "hi"'), 'say &quot;hi&quot;');
  assert.equal(escapeXml("it's"), 'it&apos;s');
});

test('escapeXml drops control characters rather than emitting a corrupt part', () => {
  // Excel reports an unescapable character as a damaged workbook, not a bad
  // cell, so one stray byte would lose the whole export.
  assert.equal(escapeXml('a\u0007b\u001fc'), 'abc');
  // Tab, newline and carriage return are legal in XML and are kept.
  assert.equal(escapeXml('a\tb\nc\rd'), 'a\tb\nc\rd');
});

test('excelSerial puts the epoch where Excel does', () => {
  // 1970-01-01 is serial 25569 in Excel's 1900 system.
  assert.equal(excelSerial(Date.UTC(1970, 0, 1), 0), 25569);
  assert.equal(excelSerial(Date.UTC(1970, 0, 2), 0), 25570);
  // Half a day past midnight is half a serial unit.
  assert.equal(excelSerial(Date.UTC(1970, 0, 1, 12), 0), 25569.5);
});

test('excelSerial writes the local wall clock, not the UTC instant', () => {
  const ms = Date.UTC(2024, 2, 14, 15, 0);
  // An offset of 480 minutes is UTC-8: 15:00Z is 07:00 local, and it is the
  // local 07:00 that carries the meaning here -- a commute, not an instant.
  const local = excelSerial(ms, 480);
  const utc = excelSerial(ms, 0);
  // A serial is a day, so eight hours of offset is a third of one.
  assert.ok(Math.abs(utc - local - 8 / 24) < 1e-9, `shifted by ${utc - local} days`);
  assert.ok(Math.abs((local % 1) * 24 - 7) < 1e-6, 'local clock reads 07:00');
});

test('excelSerial refuses a non-time', () => {
  assert.equal(excelSerial(NaN, 0), null);
  assert.equal(excelSerial(undefined, 0), null);
});

test('safeSheetName strips what Excel rejects and obeys the length cap', () => {
  assert.equal(safeSheetName('Preemption events'), 'Preemption events');
  assert.equal(safeSheetName('a/b\\c?d*e[f]g:h'), 'a b c d e f g h');
  assert.equal(safeSheetName(''), 'Sheet1');
  assert.equal(safeSheetName(null), 'Sheet1');
  assert.equal(safeSheetName('x'.repeat(40)).length, 31);
});

test('sheetXml types cells by what they are', () => {
  const xml = sheetXml(['Text', 'Number', 'Stamp', 'Day'], [
    ['007', 42, { date: Date.UTC(2024, 2, 14, 7, 0), offsetMinutes: 0 }, { day: Date.UTC(2024, 2, 14, 7, 0), offsetMinutes: 0 }],
  ]);
  // A leading-zero id stays text, or the signal number loses its zeros.
  assert.match(xml, /<c r="A2"[^>]*t="inlineStr"><is><t[^>]*>007<\/t>/);
  // A number is a number, so a duration column can be averaged.
  assert.match(xml, /<c r="B2"[^>]*><v>42<\/v><\/c>/);
  assert.match(xml, /<c r="C2" s="2"><v>45365\.29[0-9]*<\/v><\/c>/);
  // The day column is truncated to midnight so a pivot groups by day.
  assert.match(xml, /<c r="D2" s="3"><v>45365<\/v><\/c>/);
});

test('sheetXml gives the header its own style and a frozen pane', () => {
  const xml = sheetXml(['Signal'], [['7']]);
  assert.match(xml, /<row r="1"><c r="A1" s="1"/);
  assert.match(xml, /<pane ySplit="1" topLeftCell="A2"[^>]*state="frozen"/);
  // Filtering by day is the reason the export exists, so it arrives ready.
  assert.match(xml, /<autoFilter ref="A1:A2"\/>/);
});

test('sheetXml sizes the sheet to the widest row, not the header', () => {
  const xml = sheetXml(['A'], [['one', 'two', 'three']]);
  assert.match(xml, /<dimension ref="A1:C2"\/>/);
});

test('xlsxEntries emits every part the format requires', () => {
  const names = xlsxEntries({ columns: ['A'], rows: [['x']] }).map((e) => e.name);
  assert.deepEqual(names.sort(), [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/workbook.xml',
    'xl/worksheets/sheet1.xml',
  ]);
});

test('xlsxEntries declares the styles Excel refuses to open without', () => {
  const styles = xlsxEntries({ columns: ['A'], rows: [] })
    .find((e) => e.name === 'xl/styles.xml').data;
  // Fill 0 must be "none" and fill 1 "gray125" whether or not anything uses
  // them; a workbook missing either is reported as corrupt, not unstyled.
  assert.match(styles, /<fills count="2"><fill><patternFill patternType="none"\/>/);
  assert.match(styles, /patternType="gray125"/);
  assert.match(styles, /<cellStyles count="1"><cellStyle name="Normal"/);
  assert.match(styles, /<cellXfs count="4">/);
});

test('a sheet name with markup in it does not break the workbook', () => {
  const book = xlsxEntries({ columns: ['A'], rows: [], sheetName: 'A & B' })
    .find((e) => e.name === 'xl/workbook.xml').data;
  assert.match(book, /name="A &amp; B"/);
});
