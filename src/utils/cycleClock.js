/**
 * Cycle lengths for split rows that arrive one phase at a time.
 *
 * Split History builds its table as each phase finishes, and used to give
 * every row a "cycle length" that was the running sum of the phase durations
 * so far. On a two-ring controller the rings time side by side, so that sum
 * counted every second twice: a 100-second cycle read 55, 110, 140, 170 down
 * its four phases.
 *
 * A cycle's length is the time from its first green to the next cycle's
 * first green. Until the next cycle begins that is not known, so the rows of
 * the cycle still in progress carry the span so far -- first green to the
 * latest end of red clearance -- and are corrected when it closes.
 *
 * Rows are updated in place, so a table already showing them updates too.
 *
 * Framework free, so it runs under `node --test`.
 */

const round1 = (seconds) => Math.round(seconds * 10) / 10;

export function createCycleClock() {
  let rows = [];
  let startMs = null;
  let endMs = null;

  return {
    /**
     * Add a finished phase's row. `newCycle` says this phase was already
     * served in the current cycle, so it opens the next one -- and its green
     * start is where the previous cycle ended.
     */
    add(row, { greenStartMs, durationSeconds, newCycle = false }) {
      if (newCycle && rows.length) {
        const length = round1((greenStartMs - startMs) / 1000);
        for (const r of rows) r.cycleLength = length;
        rows = [];
        startMs = null;
        endMs = null;
      }
      startMs = startMs === null ? greenStartMs : Math.min(startMs, greenStartMs);
      endMs = Math.max(endMs ?? -Infinity, greenStartMs + durationSeconds * 1000);
      rows.push(row);
      const soFar = round1((endMs - startMs) / 1000);
      for (const r of rows) r.cycleLength = soFar;
    },
  };
}
