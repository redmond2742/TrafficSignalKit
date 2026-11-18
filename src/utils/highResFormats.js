/**
 * Recognising the layout of a high-resolution controller log.
 *
 * The tools read one layout, Trafficware/Cubic's: timestamp, event code,
 * parameter, one event a line. Other controllers export the same three
 * values in another order. D4 writes
 *
 *   EventCode,Param,DateTime,MsgIdx
 *    22,  2,05/30/2024 08:00:05.8,1481
 *
 * and a tool reading that as timestamp-first found nothing in it. This works
 * out which layout a log is in and, when it is not Trafficware/Cubic, reorders
 * it into that layout, so every tool reads it without knowing the difference.
 * A log with a header naming its columns (Timestamp, EventCode, EventParam,
 * in any order, with other columns beside them) is reordered by those names.
 *
 * Detection is cautious: most of the sampled lines have to read as a
 * timestamp, a whole event code and a whole parameter in the same places.
 * Anything else -- a GPX file, a detector map, a signal list -- is left
 * exactly as it was.
 *
 * Framework free, so it runs under `node --test`.
 */

/** The layouts with a name, and where each keeps the three values. */
export const HIGH_RES_FORMATS = {
  trafficware: {
    id: "trafficware",
    name: "Trafficware/Cubic",
    columns: ["Timestamp", "Event code", "Parameter"],
    order: { time: 0, event: 1, param: 2 },
  },
  d4: {
    id: "d4",
    name: "D4",
    columns: ["EventCode", "Param", "DateTime", "MsgIdx"],
    order: { event: 0, param: 1, time: 2 },
  },
};

/** How many lines from the top are looked at to decide. */
const SAMPLE_LINES = 60;
/** The share of those that must fit before a layout is believed. */
const MIN_FIT = 0.8;

const DATE_TIME_RE = /^(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})[ T]+\d{1,2}:\d{2}/;
const EPOCH_RE = /^\d{10,13}(\.\d+)?$/;
const WHOLE_RE = /^-?\d{1,6}$/;

const looksLikeTime = (value) => DATE_TIME_RE.test(value) || EPOCH_RE.test(value);
const isWhole = (value) => WHOLE_RE.test(value);

const splitLine = (line) => line.split(",").map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
const headerKey = (name) => name.toLowerCase().replace(/[\s_\-]/g, "");

const TIME_NAMES = ["timestamp", "datetime", "time", "eventtime", "date"];
const EVENT_NAMES = ["eventcode", "event", "eventid", "enumeration", "code"];
const PARAM_NAMES = ["param", "parameter", "eventparam", "eventparameter", "channel"];

/** The first non-blank lines, without splitting the whole of a large log. */
function firstLines(text, count) {
  const lines = [];
  let start = 0;
  while (lines.length < count && start < text.length) {
    let end = text.indexOf("\n", start);
    if (end < 0) end = text.length;
    const line = text.slice(start, end).trim();
    if (line) lines.push(line);
    start = end + 1;
  }
  return lines;
}

function fits(cells, order) {
  return looksLikeTime(cells[order.time] || "") && isWhole(cells[order.event] || "") && isWhole(cells[order.param] || "");
}

const share = (rows, order) => (rows.length ? rows.filter((cells) => fits(cells, order)).length / rows.length : 0);

/**
 * The layout of a log, or null when it does not read as one.
 *
 * Returns { id, name, columns (as the file has them), order, hasHeader,
 * header, ignored (columns the tools do not need) }.
 */
export function detectHighResFormat(text) {
  const lines = firstLines(String(text ?? ""), SAMPLE_LINES);
  if (!lines.length) return null;
  const first = splitLine(lines[0]);
  const hasHeader = !first.some(looksLikeTime) && first.some((cell) => /[a-z]/i.test(cell));
  const rows = (hasHeader ? lines.slice(1) : lines).map(splitLine);
  if (!rows.length) return null;

  if (hasHeader) {
    const keys = first.map(headerKey);
    const find = (names) => keys.findIndex((key) => names.includes(key));
    const order = { time: find(TIME_NAMES), event: find(EVENT_NAMES), param: find(PARAM_NAMES) };
    if (order.time < 0 || order.event < 0 || order.param < 0) return null;
    if (share(rows, order) < MIN_FIT) return null;
    const used = new Set(Object.values(order));
    const ignored = first.filter((_, i) => !used.has(i));
    const known = Object.values(HIGH_RES_FORMATS).find(
      (format) =>
        format.order.time === order.time &&
        format.order.event === order.event &&
        format.order.param === order.param,
    );
    if (known) {
      return { ...known, columns: first, order, hasHeader, header: first, ignored };
    }
    return {
      id: "headed",
      name: "Columns named in the header",
      columns: first,
      order,
      hasHeader,
      header: first,
      ignored,
    };
  }

  // No header: whichever known layout the values fit.
  const ranked = Object.values(HIGH_RES_FORMATS)
    .map((format) => ({ format, fit: share(rows, format.order) }))
    .sort((a, b) => b.fit - a.fit);
  const best = ranked[0];
  if (best.fit < MIN_FIT) return null;
  const width = Math.max(...rows.map((cells) => cells.length));
  const columns = best.format.columns.slice(0, Math.max(width, 3));
  const used = new Set(Object.values(best.format.order));
  return {
    ...best.format,
    columns,
    hasHeader: false,
    header: null,
    ignored: columns.filter((_, i) => !used.has(i)),
  };
}

function countLines(text) {
  let count = 0;
  let inLine = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 10) {
      inLine = false;
    } else if (!inLine && ch !== 13 && ch !== 32 && ch !== 9) {
      inLine = true;
      count += 1;
    }
  }
  return count;
}

/**
 * The log in the layout the tools read, and what was found.
 *
 * Returns { detection, text }. A Trafficware/Cubic log without a header comes
 * back as the very same string; anything else recognised is rewritten as
 * "timestamp,event,parameter" lines, and the detection carries `rows`,
 * `skipped` (lines that did not read, other than repeated headers), and
 * `sample`: the first rows as they were and as they now are.
 */
export function normalizeHighResText(text) {
  const source = String(text ?? "");
  const detection = detectHighResFormat(source);
  if (!detection) return { detection: null, text: source };
  if (detection.id === "trafficware" && !detection.hasHeader) {
    return { detection: { ...detection, converted: false, rows: countLines(source), skipped: 0, sample: [] }, text: source };
  }

  const { order } = detection;
  const headerKeys = detection.header ? detection.header.map(headerKey).join(",") : null;
  const out = [];
  const sample = [];
  let skipped = 0;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = splitLine(line);
    if (!fits(cells, order)) {
      // a header again, where files were joined, is not a bad line
      if (!headerKeys || cells.map(headerKey).join(",") !== headerKeys) skipped += 1;
      continue;
    }
    const converted = `${cells[order.time]},${Number(cells[order.event])},${Number(cells[order.param])}`;
    out.push(converted);
    if (sample.length < 3) sample.push({ raw: raw.replace(/\r$/, ""), converted });
  }
  return {
    detection: { ...detection, converted: true, rows: out.length, skipped, sample },
    text: out.join("\n"),
  };
}
