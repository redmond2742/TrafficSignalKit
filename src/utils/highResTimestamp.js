/**
 * Shared high-resolution timestamp parsing.
 *
 * Moved verbatim out of pedConflictCorrelator.js so more than one tool can use
 * one audited parser instead of growing another copy. Framework free, so it
 * runs in a view, in a Web Worker, or under `node --test`.
 */

const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,6}))?$/;
export const INTEGER_RE = /^-?\d+$/;
const ZONED_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

function fractionToMs(fraction) {
  if (!fraction) return 0;
  return Number.parseInt(`${fraction}000`.slice(0, 3), 10);
}

/**
 * Accepts M/D/YYYY HH:mm:ss.s (tenths), YYYY-MM-DD HH:mm:ss.sss, ISO 8601
 * (with or without a zone), and epoch seconds/milliseconds.
 * Returns milliseconds from epoch, or NaN when the value is not a timestamp.
 */
export function parseTimestamp(value) {
  if (value == null) return Number.NaN;
  const text = String(value).trim();
  if (!text) return Number.NaN;

  const mdy = MDY_RE.exec(text);
  if (mdy) {
    const [, month, day, yearRaw, hour, minute, second, fraction] = mdy;
    const year = Number(yearRaw) < 100 ? 2000 + Number(yearRaw) : Number(yearRaw);
    const date = new Date(
      year,
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0),
      fractionToMs(fraction),
    );
    return date.getTime();
  }

  const ymd = YMD_RE.exec(text);
  if (ymd) {
    const [, year, month, day, hour, minute, second, fraction] = ymd;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second || 0),
      fractionToMs(fraction),
    );
    return date.getTime();
  }

  if (INTEGER_RE.test(text)) {
    const numeric = Number(text);
    if (numeric >= 1e12) return numeric;
    if (numeric >= 1e9) return numeric * 1000;
    return Number.NaN;
  }

  if (ZONED_RE.test(text) || text.includes('T')) {
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}
