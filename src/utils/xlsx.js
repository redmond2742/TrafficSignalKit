/**
 * Minimal single-sheet .xlsx writer.
 *
 * An xlsx is a zip of XML parts, and src/utils/zipWriter.js already writes
 * zips, so a real workbook costs no dependency at all. The alternative was
 * handing Excel a .csv and calling it an export: that loses the timestamp as
 * a timestamp -- Excel guesses at the format, and a column of preemption
 * start times is exactly where a wrong guess about day and month does damage.
 * Dates here are written as serial numbers with a number format attached, so
 * they arrive sortable and filterable by day with nothing to re-parse.
 *
 * Framework free so it runs in the view and under `node --test`.
 *
 * Cells are inline strings rather than a shared-strings table: an event log
 * repeats little enough that the table would not pay for itself, and it keeps
 * the part count down.
 */
import { buildZipParts } from './zipWriter.js';

/** Excel counts days from 1899-12-30, the epoch its 1900 leap-year bug implies. */
const EXCEL_EPOCH_OFFSET = 25569;
const MS_PER_DAY = 86400000;
/** Custom formats start at 164; everything below is reserved by the spec. */
const FMT_DATETIME = 164;
const FMT_DATE = 165;

/** Style indices into cellXfs below. */
const STYLE_DEFAULT = 0;
const STYLE_HEADER = 1;
const STYLE_DATETIME = 2;
const STYLE_DATE = 3;

/** Excel rejects these in a sheet name, and 31 characters is its ceiling. */
const SHEET_NAME_BAD = /[\\/?*[\]:]/g;

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // A raw control character makes the whole part unreadable, and Excel
    // reports that as a corrupt file rather than a bad cell.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

/** 0 -> A, 25 -> Z, 26 -> AA. */
export function columnName(index) {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/**
 * Epoch milliseconds as an Excel date serial, in local time.
 *
 * Local, not UTC, and deliberately: every other time in this tool is local,
 * because the patterns being read out of it are human schedules. Writing the
 * UTC instant would shift a 07:14 commute into the previous evening for
 * anyone west of the meridian, which is precisely the analysis the export is
 * for.
 */
export function excelSerial(ms, offsetMinutes) {
  if (!Number.isFinite(ms)) return null;
  const offset = Number.isFinite(offsetMinutes)
    ? offsetMinutes
    : new Date(ms).getTimezoneOffset();
  return (ms - offset * 60000) / MS_PER_DAY + EXCEL_EPOCH_OFFSET;
}

/** A sheet name Excel will accept, with the invalid characters dropped. */
export function safeSheetName(name) {
  const cleaned = String(name || '').replace(SHEET_NAME_BAD, ' ').trim();
  return (cleaned || 'Sheet1').slice(0, 31);
}

/**
 * One cell. A value may be a primitive, {date: ms} for a timestamp, or
 * {day: ms} for the calendar day alone. Anything not a finite number or a
 * date is written as text, so an id like "007" keeps its zeros instead of
 * becoming 7.
 */
function cellXml(value, ref, style) {
  if (value === null || value === undefined || value === '') {
    return style === STYLE_DEFAULT ? '' : `<c r="${ref}" s="${style}"/>`;
  }
  if (typeof value === 'object' && ('date' in value || 'day' in value)) {
    const dayOnly = 'day' in value;
    const serial = excelSerial(dayOnly ? value.day : value.date, value.offsetMinutes);
    if (serial === null) return '';
    // Truncated rather than formatted away: a date column that still carries
    // a time sorts and groups by the instant, so two events on one day land
    // in two groups in a pivot.
    const v = dayOnly ? Math.floor(serial) : serial;
    return `<c r="${ref}" s="${dayOnly ? STYLE_DATE : STYLE_DATETIME}"><v>${v}</v></c>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function rowXml(values, rowNumber, style) {
  const cells = values
    .map((value, index) => cellXml(value, `${columnName(index)}${rowNumber}`, style))
    .join('');
  return `<row r="${rowNumber}">${cells}</row>`;
}

export function sheetXml(columns, rows) {
  const width = Math.max(columns.length, ...rows.map((r) => r.length), 1);
  const lastColumn = columnName(width - 1);
  const lastRow = rows.length + 1;

  const body = rows.map((values, index) => rowXml(values, index + 2, STYLE_DEFAULT)).join('');
  // Widths are guessed from the header: it is the one row whose length is
  // known before the data is walked, and a too-narrow date column shows as
  // ######, which reads as a broken export.
  const cols = columns
    .map((label, index) => {
      const width = Math.min(Math.max(String(label).length + 4, 10), 44);
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rowXml(columns, 1, STYLE_HEADER)}${body}</sheetData><autoFilter ref="A1:${lastColumn}${lastRow}"/></worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

/*
 * Excel is strict about this part: fonts, fills, borders, cellStyleXfs and
 * cellXfs must all be present, and fill 0 must be "none" with fill 1
 * "gray125", whether or not anything uses them. Dropping either one is
 * reported to the user as a corrupt workbook, not as a missing style.
 */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="${FMT_DATETIME}" formatCode="yyyy\\-mm\\-dd\\ hh:mm:ss"/><numFmt numFmtId="${FMT_DATE}" formatCode="yyyy\\-mm\\-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="${FMT_DATETIME}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="${FMT_DATE}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function workbookXml(sheetName) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

/** The parts of a one-sheet workbook, as zip entries. */
export function xlsxEntries({ columns, rows, sheetName = 'Sheet1', date }) {
  const name = safeSheetName(sheetName);
  const parts = [
    ['[Content_Types].xml', CONTENT_TYPES],
    ['_rels/.rels', ROOT_RELS],
    ['xl/workbook.xml', workbookXml(name)],
    ['xl/_rels/workbook.xml.rels', WORKBOOK_RELS],
    ['xl/styles.xml', STYLES],
    ['xl/worksheets/sheet1.xml', sheetXml(columns, rows)],
  ];
  return parts.map(([entryName, data]) => ({ name: entryName, data, date }));
}

/** The media type registered for xlsx; a blob typed application/zip is treated as one. */
export const XLSX_MEDIA_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function xlsxBlob(spec) {
  const { parts } = buildZipParts(xlsxEntries(spec));
  return new Blob(parts, { type: XLSX_MEDIA_TYPE });
}
