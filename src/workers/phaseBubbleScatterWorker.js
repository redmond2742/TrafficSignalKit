import { parseCsvRows, buildPhaseBubblePoints, parseDetectorAssignments } from '../utils/phaseBubbleScatter';

self.onmessage = (event) => {
  const { type, payload } = event.data || {};
  if (type !== 'process') return;
  try {
    const events = parseCsvRows(payload.csvText || '');
    const assignments = parseDetectorAssignments(payload.detectorText || '');
    const phase = Number(payload.phase);
    const assignedDetectors = payload.useAllDetectorsForPhase ? (assignments.get(phase) || []) : (assignments.get(phase) || []).slice(0, 1);
    const points = buildPhaseBubblePoints({
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

    self.postMessage({
      type: 'result',
      payload: {
        points,
        phases: [...new Set(events.filter((evt) => evt.param >= 1 && evt.param <= 16).map((evt) => evt.param))].sort((a, b) => a - b),
      },
    });
  } catch (error) {
    self.postMessage({ type: 'error', payload: String(error) });
  }
};
