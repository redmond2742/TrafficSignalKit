export const BLOCK_LOGIC_SCHEMA_VERSION = '1.0';

const uid = () => `blk-${Math.random().toString(36).slice(2, 10)}`;

export const triggerModes = [
  { title: 'Continuous (every event)', value: 'continuous' },
  { title: 'On signal state change', value: 'onChange' },
];

export const conditionPalette = [
  { type: 'phase', label: 'IF GREEN/YELLOW/RED (Phase)' },
  { type: 'detector', label: 'IF DETECTOR (Channel)' },
  { type: 'ped', label: 'IF PED CALL (Phase)' },
  { type: 'pattern', label: 'IF PATTERN equals' },
  { type: 'coordMode', label: 'IF COORD MODE equals' },
  { type: 'timeWindow', label: 'TIME WINDOW' },
  { type: 'threshold', label: 'THRESHOLD COMPARISON' },
  { type: 'and', label: 'AND' },
  { type: 'or', label: 'OR' },
  { type: 'not', label: 'NOT' },
  { type: 'sequence', label: 'FOLLOWED BY within X sec' },
  { type: 'hold', label: 'HOLD TRUE for X sec' },
];

export const actionPalette = [
  { type: 'plotPoint', label: 'PLOT POINT' },
  { type: 'plotRange', label: 'PLOT LINE / RANGE' },
  { type: 'appendTableRow', label: 'APPEND TABLE ROW' },
  { type: 'setVar', label: 'SET VARIABLE' },
  { type: 'incrementCounter', label: 'INCREMENT COUNTER' },
  { type: 'emitFlag', label: 'EMIT DIAGNOSTIC FLAG' },
  { type: 'startTimer', label: 'START TIMER' },
  { type: 'stopTimer', label: 'STOP TIMER' },
  { type: 'captureSnapshot', label: 'CAPTURE SNAPSHOT' },
];

export function createCondition(type = 'phase') {
  const base = { id: uid(), type };
  if (type === 'phase') return { ...base, signal: 'green', phase: 2, target: 1, mode: 'edgeRising' };
  if (type === 'detector') return { ...base, channel: 1, target: 1, mode: 'level' };
  if (type === 'ped') return { ...base, phase: 2, target: 1, mode: 'edgeRising' };
  if (type === 'pattern') return { ...base, value: 1 };
  if (type === 'coordMode') return { ...base, value: 'coord' };
  if (type === 'timeWindow') return { ...base, start: '06:00', end: '09:00' };
  if (type === 'threshold') return { ...base, metric: 'greenDuration', phase: 2, op: '>', value: 30 };
  if (type === 'and' || type === 'or') return { ...base, conditions: [createCondition('phase'), createCondition('detector')] };
  if (type === 'not') return { ...base, condition: createCondition('phase') };
  if (type === 'sequence') return { ...base, first: createCondition('phase'), second: createCondition('detector'), withinSec: 10 };
  if (type === 'hold') return { ...base, condition: createCondition('detector'), holdSec: 5 };
  return base;
}

export function createAction(type = 'appendTableRow') {
  const base = { id: uid(), type };
  if (type === 'plotPoint') return { ...base, yMode: 'phase', phase: 2, style: { shape: 'circle', size: 6, color: '#42A5F5' } };
  if (type === 'plotRange') return { ...base, yMode: 'phase', phase: 2, color: '#8E24AA', alpha: 0.25 };
  if (type === 'appendTableRow') return { ...base, mapping: ['timestamp', 'phase', 'ruleName', 'metricValue', 'notes'] };
  if (type === 'setVar') return { ...base, key: 'servedDemandHigh', value: 1 };
  if (type === 'incrementCounter') return { ...base, key: 'counter', amount: 1 };
  if (type === 'emitFlag') return { ...base, severity: 'warn', message: 'Rule fired for phase {{phase}}' };
  if (type === 'startTimer') return { ...base, key: 'timerA' };
  if (type === 'stopTimer') return { ...base, key: 'timerA', outputKey: 'durationSec' };
  if (type === 'captureSnapshot') return { ...base, includeDetectors: true };
  return base;
}

export function createRule(name = 'New Rule') {
  return {
    id: uid(),
    name,
    enabled: true,
    color: '#1976D2',
    trigger: { type: 'continuous' },
    filter: { phases: [], detectors: [], timeWindow: null },
    rateLimitPerMinute: 60,
    if: createCondition('phase'),
    actions: [createAction('appendTableRow')],
  };
}

export function createEmptySchema() {
  return { version: BLOCK_LOGIC_SCHEMA_VERSION, rules: [createRule('Green Phase 2 Marker')] };
}

export function validateSchema(schema) {
  const errors = [];
  if (!schema || schema.version !== BLOCK_LOGIC_SCHEMA_VERSION) errors.push('Schema version must be 1.0.');
  for (const rule of schema?.rules || []) {
    if (!rule.name) errors.push(`Rule ${rule.id} is missing name.`);
    if (!rule.if) errors.push(`Rule ${rule.name} is missing IF condition.`);
    if (!Array.isArray(rule.actions) || !rule.actions.length) errors.push(`Rule ${rule.name} needs at least one action.`);
  }
  return errors;
}

export function builtInTemplates() {
  return [
    {
      name: 'Detector Stuck On',
      schema: {
        version: BLOCK_LOGIC_SCHEMA_VERSION,
        rules: [{
          ...createRule('Detector Stuck On >120s'),
          if: { type: 'hold', condition: { type: 'detector', channel: 1, target: 1, mode: 'level' }, holdSec: 120 },
          actions: [createAction('emitFlag'), createAction('appendTableRow')],
        }],
      },
    },
    {
      name: 'Green Extension Marker',
      schema: {
        version: BLOCK_LOGIC_SCHEMA_VERSION,
        rules: [{
          ...createRule('Green Phase 2 Rising Edge Marker'),
          if: { type: 'phase', signal: 'green', phase: 2, target: 1, mode: 'edgeRising' },
          actions: [createAction('plotPoint')],
        }],
      },
    },
    {
      name: 'Split Failure Proxy',
      schema: {
        version: BLOCK_LOGIC_SCHEMA_VERSION,
        rules: [{
          ...createRule('Split Failure Proxy'),
          if: {
            type: 'and',
            conditions: [
              { type: 'threshold', metric: 'greenDuration', phase: 2, op: '<', value: 15 },
              { type: 'threshold', metric: 'count', detector: 1, op: '>', value: 5 },
            ],
          },
          actions: [createAction('emitFlag')],
        }],
      },
    },
  ];
}
