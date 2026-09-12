import { parseHighResEvents, summarizeEvents, correlateAll } from '../utils/pedConflictCorrelator';

// Parsed events stay inside the worker so large high-resolution files are only
// cloned across the thread boundary once (as a small summary, not as rows).
let cachedEvents = [];

self.onmessage = (event) => {
  const { type, payload } = event.data || {};

  try {
    if (type === 'parse') {
      const { events, skipped, signalIds } = parseHighResEvents(payload.text || '');
      cachedEvents = events;
      self.postMessage({
        type: 'parsed',
        payload: { summary: summarizeEvents(events), skipped, signalIds },
      });
      return;
    }

    if (type === 'correlate') {
      const results = correlateAll({
        events: cachedEvents,
        rules: payload.rules || [],
        binSec: payload.binSec,
        contextSec: payload.contextSec,
      });
      self.postMessage({ type: 'results', payload: { results } });
      return;
    }

    if (type === 'reset') {
      cachedEvents = [];
    }
  } catch (error) {
    self.postMessage({ type: 'error', payload: String(error && error.message ? error.message : error) });
  }
};
