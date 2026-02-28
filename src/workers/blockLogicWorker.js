import { createRuntime } from '../utils/blockLogicEngine.js';

self.onmessage = (event) => {
  const { type, payload } = event.data || {};
  if (type !== 'run') return;
  const runtime = createRuntime(payload.schema, payload.events);
  const result = runtime.run((progress) => {
    self.postMessage({ type: 'progress', payload: progress });
  });
  self.postMessage({ type: 'done', payload: result.outputs });
};
