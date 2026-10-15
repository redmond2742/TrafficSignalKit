import test from 'node:test';
import assert from 'node:assert/strict';
import { createCycleClock } from '../src/utils/cycleClock.js';

const S = 1000;

/** Two rings, 100 s cycles: 2 and 6 together for 55 s, then 4 and 8 for 45 s. */
function twoRingDay(cycles) {
  const clock = createCycleClock();
  const rows = [];
  for (let c = 0; c < cycles; c += 1) {
    const base = c * 100 * S;
    [[2, base, 55], [6, base, 55], [4, base + 55 * S, 45], [8, base + 55 * S, 45]].forEach(([phase, start, dur], i) => {
      const row = { phase, cycle: c + 1 };
      clock.add(row, { greenStartMs: start, durationSeconds: dur, newCycle: c > 0 && i === 0 });
      rows.push(row);
    });
  }
  return rows;
}

test('concurrent rings are not counted twice: a 100 s cycle reads 100 s', () => {
  const rows = twoRingDay(3);
  for (const row of rows.filter((r) => r.cycle < 3)) {
    assert.equal(row.cycleLength, 100, `cycle ${row.cycle} phase ${row.phase}`);
  }
});

test('every row of a closed cycle carries the same length', () => {
  const rows = twoRingDay(4);
  for (const cycle of [1, 2, 3]) {
    assert.equal(new Set(rows.filter((r) => r.cycle === cycle).map((r) => r.cycleLength)).size, 1);
  }
});

test('the cycle still in progress shows its span so far', () => {
  const clock = createCycleClock();
  const a = {};
  const b = {};
  clock.add(a, { greenStartMs: 0, durationSeconds: 55 });
  assert.equal(a.cycleLength, 55);
  clock.add(b, { greenStartMs: 55 * S, durationSeconds: 45 });
  assert.equal(a.cycleLength, 100, 'first green to the latest end of red');
  assert.equal(b.cycleLength, 100);
});

test('a gap between cycles belongs to the cycle before it', () => {
  // Free running with a 20 s rest in red: start to start is 120 s, not the 100 s of phases.
  const clock = createCycleClock();
  const first = {};
  clock.add(first, { greenStartMs: 0, durationSeconds: 100 });
  clock.add({}, { greenStartMs: 120 * S, durationSeconds: 60, newCycle: true });
  assert.equal(first.cycleLength, 120);
});

test('a phase that started earlier than the first to finish sets the start', () => {
  const clock = createCycleClock();
  const late = {};
  const early = {};
  clock.add(late, { greenStartMs: 10 * S, durationSeconds: 20 });
  clock.add(early, { greenStartMs: 0, durationSeconds: 40 });
  assert.equal(early.cycleLength, 40);
  assert.equal(late.cycleLength, 40);
});

test('lengths are to a tenth of a second', () => {
  const clock = createCycleClock();
  const row = {};
  clock.add(row, { greenStartMs: 0, durationSeconds: 99.96 });
  assert.equal(row.cycleLength, 100);
  const next = createCycleClock();
  const r = {};
  next.add(r, { greenStartMs: 0, durationSeconds: 10 });
  next.add({}, { greenStartMs: 98.44 * S, durationSeconds: 10, newCycle: true });
  assert.equal(r.cycleLength, 98.4);
});

test('the first row opening a "new" cycle has nothing to close', () => {
  const clock = createCycleClock();
  const row = {};
  clock.add(row, { greenStartMs: 5 * S, durationSeconds: 30, newCycle: true });
  assert.equal(row.cycleLength, 30);
});
