import { BLOCK_LOGIC_SCHEMA_VERSION } from './blockLogicSchema.js';

function toMs(ts) {
  if (typeof ts === 'number') return ts > 1e12 ? ts : ts * 1000;
  const n = Number(ts);
  if (Number.isFinite(n)) return n > 1e12 ? n : n * 1000;
  const parsed = Date.parse(ts);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeHrEvents(rows) {
  return (rows || []).map((row) => ({
    t: toMs(row.timestamp ?? row.t ?? row.time),
    type: String(row.eventType ?? row.type ?? 'UNKNOWN').toUpperCase(),
    id: row.channel ?? row.id ?? row.param ?? row.phase ?? 0,
    state: row.state == null ? undefined : Number(row.state),
    value: row.value == null ? undefined : Number(row.value),
    meta: row.meta || row,
  })).filter((evt) => Number.isFinite(evt.t)).sort((a, b) => a.t - b.t);
}

function makeContext() {
  return {
    phaseState: {}, detState: {}, pedState: {}, patternState: { current: null }, coordState: { mode: 'free' },
    vars: {}, timers: {}, holdTracker: {}, sequenceTracker: {}, ruleFirings: {},
    lastEvent: null,
  };
}

function updateState(ctx, evt) {
  const id = evt.id;
  if (evt.type === 'PHASE') {
    if (!ctx.phaseState[id]) ctx.phaseState[id] = { green: 0, yellow: 0, red: 1, lastChangeT: evt.t, greenOnT: null };
    const p = ctx.phaseState[id];
    const prev = { ...p };
    const next = evt.meta.signal?.toLowerCase?.() || (evt.value === 1 ? 'green' : evt.value === 2 ? 'yellow' : evt.value === 3 ? 'red' : 'green');
    p.green = next === 'green' ? (evt.state ?? 1) : 0;
    p.yellow = next === 'yellow' ? (evt.state ?? 1) : 0;
    p.red = next === 'red' ? (evt.state ?? 1) : 0;
    if (!prev.green && p.green) p.greenOnT = evt.t;
    p.lastChangeT = evt.t;
  }
  if (evt.type === 'DETECTOR') {
    if (!ctx.detState[id]) ctx.detState[id] = { on: 0, lastOnT: null, lastOffT: null, count: 0 };
    const d = ctx.detState[id];
    const next = evt.state ?? (evt.value ? 1 : 0);
    if (!d.on && next) { d.lastOnT = evt.t; d.count += 1; }
    if (d.on && !next) d.lastOffT = evt.t;
    d.on = next;
  }
  if (evt.type === 'PED') {
    if (!ctx.pedState[id]) ctx.pedState[id] = { on: 0, lastChangeT: evt.t };
    ctx.pedState[id].on = evt.state ?? 0;
    ctx.pedState[id].lastChangeT = evt.t;
  }
  if (evt.type === 'PATTERN') ctx.patternState.current = evt.value ?? evt.id;
  if (evt.type === 'COORDINATION') ctx.coordState.mode = String(evt.value ?? evt.meta.mode ?? 'coord');
  ctx.lastEvent = evt;
}

function compare(op, left, right) {
  if (op === '>') return left > right;
  if (op === '>=') return left >= right;
  if (op === '<') return left < right;
  if (op === '<=') return left <= right;
  if (op === '==') return left === right;
  return false;
}

function metricValue(ctx, cond, evt) {
  if (cond.metric === 'timeSinceGreenOn' || cond.metric === 'greenDuration') {
    const p = ctx.phaseState[cond.phase];
    if (!p?.greenOnT) return 0;
    return (evt.t - p.greenOnT) / 1000;
  }
  if (cond.metric === 'occupancy' || cond.metric === 'count') return ctx.detState[cond.detector || cond.det || 0]?.count || 0;
  return 0;
}

function evalCondition(cond, ctx, evt, ruleId) {
  if (!cond) return false;
  if (cond.type === 'phase') {
    const p = ctx.phaseState[cond.phase] || { green: 0, yellow: 0, red: 1, lastChangeT: evt.t };
    const key = cond.signal || 'green';
    const val = p[key] ? 1 : 0;
    if (cond.mode === 'level') return val === cond.target;
    const delta = evt.t - (p.lastChangeT || evt.t);
    if (cond.mode === 'edgeRising') return val === 1 && delta === 0;
    if (cond.mode === 'edgeFalling') return val === 0 && delta === 0;
    return val === cond.target;
  }
  if (cond.type === 'detector') {
    const d = ctx.detState[cond.channel] || { on: 0, lastOnT: null, lastOffT: null };
    if (cond.mode === 'edgeRising') return d.on === 1 && d.lastOnT === evt.t;
    if (cond.mode === 'edgeFalling') return d.on === 0 && d.lastOffT === evt.t;
    return d.on === cond.target;
  }
  if (cond.type === 'ped') return (ctx.pedState[cond.phase]?.on || 0) === cond.target;
  if (cond.type === 'pattern') return Number(ctx.patternState.current) === Number(cond.value);
  if (cond.type === 'coordMode') return String(ctx.coordState.mode) === String(cond.value);
  if (cond.type === 'timeWindow') {
    const d = new Date(evt.t);
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return hm >= cond.start && hm <= cond.end;
  }
  if (cond.type === 'threshold') return compare(cond.op, metricValue(ctx, cond, evt), Number(cond.value));
  if (cond.type === 'and') return (cond.conditions || []).every((node) => evalCondition(node, ctx, evt, ruleId));
  if (cond.type === 'or') return (cond.conditions || []).some((node) => evalCondition(node, ctx, evt, ruleId));
  if (cond.type === 'not') return !evalCondition(cond.condition, ctx, evt, ruleId);
  if (cond.type === 'sequence') {
    const key = `${ruleId}:${cond.id || 'seq'}`;
    const tracker = ctx.sequenceTracker[key] || { firstT: null };
    if (evalCondition(cond.first, ctx, evt, ruleId)) tracker.firstT = evt.t;
    const okSecond = evalCondition(cond.second, ctx, evt, ruleId);
    ctx.sequenceTracker[key] = tracker;
    return okSecond && tracker.firstT != null && evt.t - tracker.firstT <= (cond.withinSec || 10) * 1000;
  }
  if (cond.type === 'hold') {
    const key = `${ruleId}:${cond.id || 'hold'}`;
    const active = evalCondition(cond.condition, ctx, evt, ruleId);
    if (!active) { ctx.holdTracker[key] = null; return false; }
    if (!ctx.holdTracker[key]) ctx.holdTracker[key] = evt.t;
    return evt.t - ctx.holdTracker[key] >= (cond.holdSec || 1) * 1000;
  }
  return false;
}

function tokenRender(message, payload) {
  return (message || '').replace(/\{\{(\w+)\}\}/g, (_, token) => payload[token] ?? '');
}

function runAction(action, payload, outputs, ctx, evt) {
  if (action.type === 'plotPoint') outputs.plots.push({ type: 'point', x: evt.t, y: action.yMode === 'phase' ? Number(action.phase) : Number(action.value || 0), style: action.style || {} });
  if (action.type === 'plotRange') outputs.plots.push({ type: 'range', startT: ctx.timers[action.key] || evt.t, endT: evt.t, y: Number(action.phase || 0), color: action.color });
  if (action.type === 'appendTableRow') outputs.table.push({ timestamp: evt.t, phase: payload.phase, detector: payload.detector, ruleName: payload.ruleName, metricValue: payload.metricValue ?? '', notes: payload.notes || '' });
  if (action.type === 'setVar') ctx.vars[action.key] = action.value;
  if (action.type === 'incrementCounter') ctx.vars[action.key] = Number(ctx.vars[action.key] || 0) + Number(action.amount || 1);
  if (action.type === 'emitFlag') outputs.diagnostics.push({ timestamp: evt.t, severity: action.severity, message: tokenRender(action.message, payload) });
  if (action.type === 'startTimer') ctx.timers[action.key] = evt.t;
  if (action.type === 'stopTimer') {
    const start = ctx.timers[action.key];
    if (start) ctx.vars[action.outputKey || `${action.key}DurationSec`] = (evt.t - start) / 1000;
  }
  if (action.type === 'captureSnapshot') outputs.table.push({ timestamp: evt.t, ruleName: payload.ruleName, notes: JSON.stringify({ phaseState: ctx.phaseState, detState: ctx.detState }) });
}

function shouldEvaluateRule(rule, evt) {
  if (!rule.enabled) return false;
  if (rule.trigger?.type === 'continuous') return true;
  if (rule.trigger?.type === 'onChange') {
    const src = rule.trigger.source || {};
    if (src.type === 'phaseGreen') return evt.type === 'PHASE' && Number(evt.id) === Number(src.phase);
    if (src.type === 'detector') return evt.type === 'DETECTOR' && Number(evt.id) === Number(src.channel);
  }
  return true;
}

export function createRuntime(schema, rows) {
  const events = normalizeHrEvents(rows);
  const ctx = makeContext();
  const outputs = { events: [], table: [], plots: [], logs: [], diagnostics: [] };
  let cursor = 0;

  function evaluateOne(evt) {
    updateState(ctx, evt);
    for (const rule of schema.rules || []) {
      if (!shouldEvaluateRule(rule, evt)) continue;
      const minuteKey = Math.floor(evt.t / 60000);
      const fKey = `${rule.id}:${minuteKey}`;
      ctx.ruleFirings[fKey] = ctx.ruleFirings[fKey] || 0;
      if (ctx.ruleFirings[fKey] >= (rule.rateLimitPerMinute || 60)) continue;

      const matched = evalCondition(rule.if, ctx, evt, rule.id);
      if (!matched) continue;
      ctx.ruleFirings[fKey] += 1;
      const payload = { phase: evt.type === 'PHASE' ? evt.id : undefined, detector: evt.type === 'DETECTOR' ? evt.id : undefined, ruleName: rule.name, metricValue: evt.value, notes: evt.type };
      outputs.events.push({ timestamp: evt.t, ruleId: rule.id, ruleName: rule.name, eventType: 'ruleFired', value: evt.value ?? evt.state ?? 1, metadata: payload });
      outputs.logs.push(`[${new Date(evt.t).toISOString()}] ${rule.name} fired on ${evt.type} ${evt.id}`);
      if (outputs.logs.length > 100) outputs.logs.shift();
      for (const action of rule.actions || []) runAction(action, payload, outputs, ctx, evt);
    }
  }

  return {
    version: BLOCK_LOGIC_SCHEMA_VERSION,
    total: events.length,
    step() {
      if (cursor >= events.length) return { done: true, cursor, outputs, context: ctx };
      evaluateOne(events[cursor]);
      cursor += 1;
      return { done: cursor >= events.length, cursor, outputs, context: ctx };
    },
    run(onProgress) {
      while (cursor < events.length) {
        evaluateOne(events[cursor]);
        cursor += 1;
        if (onProgress && cursor % 500 === 0) onProgress({ cursor, total: events.length });
      }
      return { cursor, total: events.length, outputs, context: ctx };
    },
    reset() {
      cursor = 0;
      outputs.events = []; outputs.table = []; outputs.plots = []; outputs.logs = []; outputs.diagnostics = [];
      Object.assign(ctx, makeContext());
    },
  };
}
