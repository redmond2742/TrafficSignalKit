import { parseCsvRows, buildPhaseBubblePoints, parseDetectorAssignments } from '../utils/phaseBubbleScatter';

self.onmessage = (event) => {
  const { type, payload } = event.data || {};
  if (type !== 'process') return;
  try {
    const events = parseCsvRows(payload.csvText || '');
    const assignments = parseDetectorAssignments(payload.detectorText || '');
    const serviceCodes = new Set([1, 7, 8, 9, 10, 11, 12]);
    const phases = [...new Set(events.filter((evt) => serviceCodes.has(evt.code) && evt.param >= 1 && evt.param <= 16).map((evt) => evt.param))].sort((a, b) => a - b);
    const points = phases.flatMap((phase) => {
      const assignedDetectors = assignments.get(phase) || [];
      return buildPhaseBubblePoints({
        events,
        selectedPhase: phase,
        assignedDetectors,
        cycleHandling: payload.cycleHandling,
        includeFirst: payload.includeFirst,
        minAlpha: payload.minAlpha,
        maxAlpha: payload.maxAlpha,
        startTs: payload.startTs,
        endTs: payload.endTs,
        ignoreFirstMinutes: payload.ignoreFirstMinutes,
      });
    }).sort((a, b) => (a.phase - b.phase) || (a.cycle_index - b.cycle_index) || (a.service_start_ts - b.service_start_ts));

    self.postMessage({
      type: 'result',
      payload: {
        points,
        phases,
      },
    });
  } catch (error) {
    self.postMessage({ type: 'error', payload: String(error) });
  }
};
