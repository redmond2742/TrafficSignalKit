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
 * approach 1-2, which is Main Street with a compass bearing of 120 degrees.
 * That is the heading traffic holds as it arrives, so "Preempt 3" reads as
 * "Main Street from the WNW, eastbound".
 *
 * preempt.txt is not always inside the export; it is accepted separately too.
 *
 * Framework free, so it runs under `node --test`.
 */

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

/** Cardinal-ish travel direction, from a heading in degrees. */
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
 * compass_bearing is the heading of the approach *to* the intersection: the
 * way vehicles are pointed as they arrive. So the travel direction is the
 * bearing itself, and a bearing of 240 is westbound.
 *
 * This was the reciprocal until it was reported wrong from real data -- a
 * WSW approach carrying phases 2 and 5 was being labelled eastbound. The
 * evidence offered for the reciprocal was that of 151 streets with two legs
 * at one signal, 149 had bearings within 40 degrees of opposite. That is a
 * fact about opposing approaches, not about the field: two legs of a street
 * point opposite ways whether the number describes the leg or the movement,
 * so the test could not tell the two readings apart and was never evidence
 * for either. The specification settles it -- "compass_bearing indicates the
 * compass bearing of the approach to the intersection" -- and so does the
 * builder that writes these files, which takes the click for where traffic
 * comes from and stores the bearing back toward the signal.
 */
export function bearingToTravel(bearing) {
  const degrees = Number(bearing);
  if (!Number.isFinite(degrees)) return null;
  return TRAVEL[bearingToCompass(degrees)] ?? null;
}

/**
 * The compass point traffic on this approach arrives from.
 *
 * The reciprocal of the bearing: a vehicle heading WSW into the intersection
 * entered it from the ENE. This is the half of the label that says which leg
 * of the intersection is meant.
 */
export function bearingToOrigin(bearing) {
  const degrees = Number(bearing);
  if (!Number.isFinite(degrees)) return null;
  return bearingToCompass(degrees + 180);
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
 * Returns { signals, signalCount, warnings, agency }, where `signals` holds
 * only the intersections that have preempt channels. `signalCount` is how
 * many signals.txt describes in total, which is usually the larger number:
 * an export covers a whole agency, and most of its signals have no preemption
 * at all. Reporting only the first would suggest the export was thinner than
 * it is.
 *
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
  const streetsBySignal = new Map();
  for (const approach of approaches) {
    if (!streetsBySignal.has(approach.signal_id)) streetsBySignal.set(approach.signal_id, []);
    streetsBySignal.get(approach.signal_id).push(approach.street_name);
  }

  const out = [...bySignal.entries()].map(([id, channels]) => ({
    id,
    crossStreets: crossStreetName(streetsBySignal.get(id)),
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

  return {
    signals: out,
    // Signals the export describes at all, preemption or not. Null rather
    // than zero when signals.txt is missing: unknown is not none, and the
    // caller should be able to tell the difference before printing a count.
    signalCount: files['signals.txt'] === undefined ? null : signals.length,
    agency,
    warnings,
  };
}

/**
 * A readable name for a signal, from the streets meeting at it.
 *
 * signals.txt carries only an ID and coordinates, so the name has to come from
 * the approaches. The two streets with the most legs are the through routes;
 * a single-leg entry is usually a driveway or a parking exit and would make a
 * worse label than the cross street it sits opposite.
 */
export function crossStreetName(streets) {
  const counts = new Map();
  const order = new Map();
  (streets || []).forEach((street, index) => {
    if (!street) return;
    counts.set(street, (counts.get(street) || 0) + 1);
    if (!order.has(street)) order.set(street, index);
  });
  if (!counts.size) return '';
  // Ties break on the order the approaches are listed, not alphabetically:
  // at a four-leg signal with two single-leg cross streets, the export's own
  // ordering is a better guess at which matters than the alphabet is.
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || order.get(a[0]) - order.get(b[0]),
  );
  return ranked.slice(0, 2).map(([street]) => street).join(' & ');
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
    // Where the traffic came from, which is the reciprocal of where it is
    // pointed. `travel` is the bearing itself; see bearingToTravel.
    compass: sameApproach ? bearingToOrigin(bearing) : null,
    travel: sameApproach ? bearingToTravel(bearing) : null,
    sameApproach,
  };
}

/** A one-line description for a channel, e.g. "Main Street from the WNW (EB)". */
export function describeChannel(entry) {
  if (!entry) return '';
  const street = entry.streets.length ? entry.streets.join(' / ') : '';
  if (!street) return entry.phases.length ? `phases ${entry.phases.join(', ')}` : '';
  if (!entry.compass) return street;
  return `${street} from the ${entry.compass}${entry.travel ? ` (${entry.travel})` : ''}`;
}


/**
 * detectors.txt -> which channels serve which phase, per signal.
 *
 * Returns a Map of signal id to a Map of phase to channel list, plus the
 * purpose of each channel where the export records one. Purpose matters here:
 * a stop-bar detector says whether anything is at the line now, while an
 * advance detector fired seconds ago for a vehicle that may already be gone.
 * A tool asking "is the intersection being used right now" wants the former,
 * so it is carried through rather than flattened away.
 */
export function buildDetectorDirectory(input) {
  const files = input || {};
  const rows = parseTable(files['detectors.txt']);
  const bySignal = new Map();
  const purposes = new Map();
  const warnings = [];
  let unassigned = 0;

  for (const row of rows) {
    const signalId = row.signal_id ?? row.signalID;
    const channel = Number(row.channel);
    const phase = Number(row.phase);
    if (!signalId || !Number.isFinite(channel)) continue;
    if (!Number.isFinite(phase) || phase === 0) {
      // A detector with no phase is a count or a system station; it tells us
      // nothing about whether a movement is being used.
      unassigned += 1;
      continue;
    }
    if (!bySignal.has(signalId)) bySignal.set(signalId, new Map());
    const byPhase = bySignal.get(signalId);
    if (!byPhase.has(phase)) byPhase.set(phase, []);
    if (!byPhase.get(phase).includes(channel)) byPhase.get(phase).push(channel);
    if (row.purpose) purposes.set(`${signalId}\u0000${channel}`, String(row.purpose).trim());
  }

  for (const byPhase of bySignal.values()) {
    for (const channels of byPhase.values()) channels.sort((a, b) => a - b);
  }
  if (!rows.length) warnings.push('The export has no detectors.txt, so no channels could be assigned.');
  else if (!bySignal.size) warnings.push('detectors.txt named no channel with a phase.');

  return {
    bySignal,
    purposes,
    unassigned,
    signals: [...bySignal.keys()].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a < b ? -1 : a > b ? 1 : 0;
    }),
    warnings,
  };
}

/**
 * approaches.txt + phases.txt -> an intersection per signal, ready to draw.
 *
 * Everything a phase diagram needs is already in a GTSS export; it just lives
 * in two files joined on approach_id. This does the join and nothing else, so
 * the renderer stays ignorant of where its data came from and a hand-built
 * intersection in the UI is the same shape as an exported one.
 *
 * A phase whose approach_id names no approach is kept, not dropped. It cannot
 * be drawn -- there is no bearing to draw it on -- but it is real, it is in
 * the file, and a diagram silently missing phase 4 is worse than one that says
 * phase 4 could not be placed.
 */
export function buildPhaseDirectory(input) {
  const files = input || {};
  const warnings = [];
  const approachRows = parseTable(files['approaches.txt']);
  const phaseRows = parseTable(files['phases.txt']);
  const signalRows = parseTable(files['signals.txt']);
  const agency = parseTable(files['agency.txt'])[0] || null;

  if (!approachRows.length) warnings.push('The export has no approaches.txt, so nothing can be drawn.');
  if (!phaseRows.length) warnings.push('The export has no phases.txt, so the legs have no movements on them.');

  const bySignal = new Map();
  const ensure = (signalId) => {
    if (!bySignal.has(signalId)) {
      bySignal.set(signalId, { signalId, approaches: [], phases: [], latitude: null, longitude: null });
    }
    return bySignal.get(signalId);
  };

  for (const row of approachRows) {
    const signalId = row.signal_id ?? row.signalID;
    if (!signalId || !row.approach_id) continue;
    const bearing = Number(row.compass_bearing);
    ensure(signalId).approaches.push({
      approachId: String(row.approach_id),
      streetName: String(row.street_name || '').trim(),
      compassBearing: Number.isFinite(bearing) ? bearing : null,
      postedSpeed: row.posted_speed === '' ? null : Number(row.posted_speed),
      freeRight: Number(row.free_right) || 0,
    });
  }

  let unplaced = 0;
  for (const row of phaseRows) {
    const signalId = row.signal_id ?? row.signalID;
    const phase = Number(row.phase);
    if (!signalId || !Number.isFinite(phase)) continue;
    const entry = ensure(signalId);
    const approachId = String(row.approach_id || '');
    if (!entry.approaches.some((a) => a.approachId === approachId)) unplaced += 1;
    entry.phases.push({
      phase,
      approachId,
      movementType: String(row.movement_type || 'T').trim(),
      numOfLanes: Number(row.num_of_lanes) || 1,
      pedX: Number(row.PedX ?? row.pedX) || 0,
      crosswalkLength: row.crosswalk_length === '' ? null : Number(row.crosswalk_length),
    });
  }

  for (const row of signalRows) {
    const signalId = row.signal_id ?? row.signalID;
    if (!signalId || !bySignal.has(signalId)) continue;
    const entry = bySignal.get(signalId);
    entry.latitude = Number(row.latitude);
    entry.longitude = Number(row.longitude);
  }

  for (const entry of bySignal.values()) {
    entry.phases.sort((a, b) => a.phase - b.phase);
    entry.name = crossStreetName(entry.approaches.map((a) => a.streetName));
  }

  if (unplaced) {
    warnings.push(
      `${unplaced} ${unplaced === 1 ? 'phase names an approach' : 'phases name approaches'} that approaches.txt does not describe, so ${unplaced === 1 ? 'it has' : 'they have'} no bearing to be drawn on.`,
    );
  }

  return {
    bySignal,
    agency,
    // agency.txt carries handedness for the whole agency, and it changes how
    // every turn in every diagram is drawn, so it is read rather than assumed.
    isLht: String(agency?.agency_islht ?? '').trim().toLowerCase() === 'true'
      || String(agency?.agency_islht ?? '').trim() === '1',
    signals: [...bySignal.keys()].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a < b ? -1 : a > b ? 1 : 0;
    }),
    warnings,
  };
}
