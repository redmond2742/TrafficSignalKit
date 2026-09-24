/**
 * GTSS export -> what each preempt channel actually serves.
 *
 * A preempt channel number on its own says nothing useful. A GTSS export
 * carries the chain that gives it meaning:
 *
 *   preempt.txt   preempt_channel, signalID, type, phase, maxTime
 *   phases.txt    phase, signal_id, movement_type, num_of_lanes, approach_id
 *   approaches.txt approach_id, signal_id, street_name, compass_bearing
 *
 * So channel 3 at signal 1 serves phases 1 and 6, both of which belong to
 * approach 1-2, which is Ygnacio Valley Road lying 120 degrees from the
 * intersection. That makes "Preempt 3" readable as "Ygnacio Valley Road from
 * the ESE, westbound".
 *
 * preempt.txt is not always inside the export; it is accepted separately too.
 *
 * Framework free, so it runs under `node --test`.
 */

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

/** Cardinal-ish travel direction, for the movement rather than the leg. */
const TRAVEL = { N: 'NB', NNE: 'NB', NE: 'NEB', ENE: 'EB', E: 'EB', ESE: 'EB', SE: 'SEB', SSE: 'SB',
  S: 'SB', SSW: 'SB', SW: 'SWB', WSW: 'WB', W: 'WB', WNW: 'WB', NW: 'NWB', NNW: 'NB' };

export const MOVEMENT_LABELS = { L: 'left', T: 'through', R: 'right', U: 'u-turn' };

/** 120 -> "ESE". Returns null for anything that is not a bearing. */
export function bearingToCompass(bearing) {
  const degrees = Number(bearing);
  if (!Number.isFinite(degrees)) return null;
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}

/**
 * The direction traffic on this approach is travelling.
 *
 * compass_bearing is the bearing of the approach leg from the intersection --
 * where the vehicles come from -- so the movement is the reciprocal. Verified
 * against this schema: of 151 streets with two legs at one signal, 149 have
 * their bearings within 40 degrees of opposite, which only holds if the field
 * describes the leg rather than the direction of travel.
 */
export function bearingToTravel(bearing) {
  const degrees = Number(bearing);
  if (!Number.isFinite(degrees)) return null;
  return TRAVEL[bearingToCompass(degrees + 180)] ?? null;
}

/** Splits a GTSS text file into objects keyed by its header row. */
export function parseTable(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

const uniq = (values) => [...new Set(values.filter((v) => v !== '' && v != null))];

/**
 * Builds, per signal, what each preempt channel serves.
 *
 * Returns { signals: [{ id, label, channels: [...] }], warnings: [...] }.
 * A channel whose phases cannot be resolved still appears, with whatever is
 * known, rather than being dropped -- a gap in the export should be visible,
 * not silently hide a channel that the data plainly uses.
 */
export function buildPreemptDirectory(input) {
  // A default parameter only covers undefined, and callers pass null when
  // nothing has been loaded yet.
  const files = input || {};
  const warnings = [];
  const need = (name) => {
    const text = files[name];
    if (!text) warnings.push(`${name} is missing from the export.`);
    return parseTable(text);
  };

  const preempts = need('preempt.txt');
  const phases = need('phases.txt');
  const approaches = need('approaches.txt');
  const signals = parseTable(files['signals.txt']);
  const agency = parseTable(files['agency.txt'])[0] || null;

  const approachById = new Map(
    approaches.map((a) => [`${a.signal_id}\u0000${a.approach_id}`, a]),
  );
  const phaseByKey = new Map(
    phases.map((p) => [`${p.signal_id}\u0000${p.phase}`, p]),
  );

  const bySignal = new Map();
  for (const row of preempts) {
    // preempt.txt spells it signalID; every other file spells it signal_id.
    const signalId = row.signalID ?? row.signal_id;
    const channel = Number(row.preempt_channel);
    if (!signalId || !Number.isFinite(channel)) continue;

    if (!bySignal.has(signalId)) bySignal.set(signalId, new Map());
    const channels = bySignal.get(signalId);
    if (!channels.has(channel)) {
      channels.set(channel, { channel, type: row.type || '', maxTime: null, phases: [], approaches: [] });
    }
    const entry = channels.get(channel);

    const maxTime = Number(row.maxTime);
    if (Number.isFinite(maxTime)) entry.maxTime = maxTime;

    const phase = Number(row.phase);
    if (Number.isFinite(phase)) {
      entry.phases.push(phase);
      const phaseRow = phaseByKey.get(`${signalId}\u0000${row.phase}`);
      if (phaseRow) {
        const approach = approachById.get(`${signalId}\u0000${phaseRow.approach_id}`);
        entry.approaches.push({
          approachId: phaseRow.approach_id,
          movement: phaseRow.movement_type || '',
          street: approach ? approach.street_name : '',
          bearing: approach ? Number(approach.compass_bearing) : NaN,
        });
      }
    }
  }

  const signalMeta = new Map(signals.map((s) => [s.signal_id, s]));
  const out = [...bySignal.entries()].map(([id, channels]) => ({
    id,
    label: `Signal ${id}`,
    latitude: signalMeta.get(id) ? Number(signalMeta.get(id).latitude) : null,
    longitude: signalMeta.get(id) ? Number(signalMeta.get(id).longitude) : null,
    channels: [...channels.values()]
      .map((entry) => ({
        ...entry,
        phases: uniq(entry.phases).sort((a, b) => a - b),
        ...summariseApproaches(entry.approaches),
      }))
      .sort((a, b) => a.channel - b.channel),
  }));

  out.sort((a, b) => {
    const na = Number(a.id);
    const nb = Number(b.id);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return { signals: out, agency, warnings };
}

/** Reduces a channel's phases to the street and direction they share. */
function summariseApproaches(list) {
  const streets = uniq(list.map((a) => a.street));
  const bearings = list.map((a) => a.bearing).filter(Number.isFinite);
  const movements = uniq(list.map((a) => a.movement));

  // Channels normally serve one approach; when they do not, say so rather
  // than picking one and implying a precision the data does not have.
  const bearing = bearings.length ? bearings[0] : NaN;
  const sameApproach = uniq(list.map((a) => a.approachId)).length <= 1;

  return {
    streets,
    movements,
    bearing: Number.isFinite(bearing) ? bearing : null,
    compass: sameApproach ? bearingToCompass(bearing) : null,
    travel: sameApproach ? bearingToTravel(bearing) : null,
    sameApproach,
  };
}

/** A one-line description for a channel, e.g. "Ygnacio Valley Road from the ESE (WB)". */
export function describeChannel(entry) {
  if (!entry) return '';
  const street = entry.streets.length ? entry.streets.join(' / ') : '';
  if (!street) return entry.phases.length ? `phases ${entry.phases.join(', ')}` : '';
  if (!entry.compass) return street;
  return `${street} from the ${entry.compass}${entry.travel ? ` (${entry.travel})` : ''}`;
}
