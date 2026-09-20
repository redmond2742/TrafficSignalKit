/**
 * Persistence for the image annotator.
 *
 * Two layers, deliberately unequal:
 *   - localStorage autosave: a write-only cache so a refresh does not cost an
 *     hour of boxes. Never the source of truth, never what the export reads.
 *   - project JSON: the durable, portable, human-editable record.
 *
 * Framework free, and `storage` is injected so `node --test` can pass a fake
 * that throws on quota.
 */

import { fnv1a32 } from './hash.js';

export const NAMESPACE = 'tsk:imageAnnotator:v1';
export const IMAGE_PREFIX = `${NAMESPACE}:img:`;
export const RECORD_VERSION = 1;

export const PROJECT_FORMAT = 'trafficsignalkit.image-annotator';
export const PROJECT_VERSION = 1;

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null; // Safari private browsing throws on access, not just on write
  }
}

/**
 * Identity for a picked file.
 *
 * Name plus byte size is a heuristic, not a content hash — two different
 * images that share a name and a byte count share annotations. That trade is
 * deliberate: hashing megabytes of pixels on every file pick would stall the
 * load, and the failure mode is visible the moment the image is shown.
 */
export function imageKey({ name, size }) {
  const safeName = String(name || '');
  return `${IMAGE_PREFIX}${Number(size) || 0}:${fnv1a32(safeName).toString(16)}:${safeName.slice(0, 80)}`;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

/**
 * Compact on-disk form. Sub-0.1 px precision is meaningless on a 20 px signal
 * head, and terse keys plus rounding roughly quarter the JSON against the
 * in-memory shape — which matters against a ~5 MB origin quota.
 */
export function encodeRecord(image) {
  return JSON.stringify({
    v: RECORD_VERSION,
    n: image.name,
    s: image.size,
    w: image.width || 0,
    h: image.height || 0,
    r: image.reviewed ? 1 : 0,
    b: (image.boxes || []).map((box) => [round1(box.x), round1(box.y), round1(box.w), round1(box.h)]),
    u: Date.now(),
  });
}

export function decodeRecord(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || parsed.v !== RECORD_VERSION || !Array.isArray(parsed.b)) return null;

  const boxes = [];
  for (const entry of parsed.b) {
    if (!Array.isArray(entry) || entry.length < 4) continue;
    const [x, y, w, h] = entry.map(Number);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue;
    boxes.push({ x, y, w, h });
  }

  return {
    name: String(parsed.n || ''),
    size: Number(parsed.s) || 0,
    width: Number(parsed.w) || 0,
    height: Number(parsed.h) || 0,
    reviewed: parsed.r === 1,
    boxes,
    updatedAt: Number(parsed.u) || 0,
  };
}

/** Reads just the timestamp without parsing the whole record. */
export function readUpdatedAt(raw) {
  const match = /"u":(\d+)/.exec(raw || '');
  return match ? Number(match[1]) : 0;
}

function isQuotaError(error) {
  if (!error) return false;
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
}

function annotatorKeys(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && key.startsWith(IMAGE_PREFIX)) keys.push(key);
  }
  return keys;
}

/** Deletes the oldest saved records, never touching `keepKeys`. */
export function pruneOldest(storage, { keepKeys = [], count = 1 } = {}) {
  const keep = new Set(keepKeys);
  const candidates = annotatorKeys(storage)
    .filter((key) => !keep.has(key))
    .map((key) => ({ key, updatedAt: readUpdatedAt(storage.getItem(key)) }))
    .sort((a, b) => a.updatedAt - b.updatedAt);

  let removed = 0;
  for (const candidate of candidates.slice(0, count)) {
    storage.removeItem(candidate.key);
    removed += 1;
  }
  return removed;
}

/**
 * Writes, evicting the least recently touched records when the origin quota is
 * hit. Never throws into the UI: a failed autosave degrades to "use Save
 * Project", it does not interrupt annotating.
 */
export function safeSet(storage, key, value, { keepKeys = [], maxEvictions = 200 } = {}) {
  const target = storage || defaultStorage();
  if (!target) return { ok: false, reason: 'unavailable', evicted: 0 };

  let evicted = 0;
  for (;;) {
    try {
      target.setItem(key, value);
      return { ok: true, evicted };
    } catch (error) {
      if (!isQuotaError(error) || evicted >= maxEvictions) {
        return { ok: false, reason: isQuotaError(error) ? 'quota' : 'error', evicted };
      }
      const removed = pruneOldest(target, { keepKeys: [...keepKeys, key], count: 10 });
      if (!removed) return { ok: false, reason: 'quota', evicted };
      evicted += removed;
    }
  }
}

export function loadRecord(storage, key) {
  const target = storage || defaultStorage();
  if (!target) return null;
  try {
    return decodeRecord(target.getItem(key));
  } catch {
    return null;
  }
}

/** Bytes, counting UTF-16 the way browsers charge for it. */
export function estimateUsage(storage) {
  const target = storage || defaultStorage();
  if (!target) return 0;
  let total = 0;
  for (const key of annotatorKeys(target)) {
    total += (key.length + (target.getItem(key) || '').length) * 2;
  }
  return total;
}

export function clearStoredAnnotations(storage) {
  const target = storage || defaultStorage();
  if (!target) return 0;
  const keys = annotatorKeys(target);
  for (const key of keys) target.removeItem(key);
  return keys.length;
}

/** True when this browser actually lets us write (catches private browsing). */
export function storageAvailable(storage) {
  const target = storage || defaultStorage();
  if (!target) return false;
  const probe = `${NAMESPACE}:probe`;
  try {
    target.setItem(probe, '1');
    target.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function buildProject({ className, settings, images, createdAt = new Date() }) {
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    createdAt: createdAt.toISOString(),
    className,
    settings: { ...settings },
    images: (images || []).map((image) => ({
      name: image.name,
      size: image.size,
      width: image.width || 0,
      height: image.height || 0,
      reviewed: Boolean(image.reviewed),
      boxes: (image.boxes || []).map((box) => ({
        x: round1(box.x),
        y: round1(box.y),
        w: round1(box.w),
        h: round1(box.h),
      })),
    })),
  };
}

/**
 * Parses a project file, dropping invalid entries into `warnings` rather than
 * throwing: one corrupt row must not cost the user the other 239.
 */
export function parseProject(raw) {
  const warnings = [];
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { project: null, warnings: ['That file is not valid JSON.'] };
  }

  if (!parsed || parsed.format !== PROJECT_FORMAT) {
    return { project: null, warnings: ['That file is not an image annotator project.'] };
  }
  if (Number(parsed.version) > PROJECT_VERSION) {
    return {
      project: null,
      warnings: [`That project was saved by a newer version (v${parsed.version}).`],
    };
  }

  const images = [];
  for (const entry of Array.isArray(parsed.images) ? parsed.images : []) {
    if (!entry || typeof entry.name !== 'string' || !entry.name) {
      warnings.push('Skipped an image entry with no filename.');
      continue;
    }
    const width = Number(entry.width) || 0;
    const height = Number(entry.height) || 0;
    const boxes = [];
    for (const box of Array.isArray(entry.boxes) ? entry.boxes : []) {
      const x = Number(box?.x);
      const y = Number(box?.y);
      const w = Number(box?.w);
      const h = Number(box?.h);
      if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
        warnings.push(`Skipped an invalid box on ${entry.name}.`);
        continue;
      }
      boxes.push({ x, y, w, h });
    }
    images.push({
      name: entry.name,
      size: Number(entry.size) || 0,
      width,
      height,
      reviewed: Boolean(entry.reviewed),
      boxes,
    });
  }

  return {
    project: {
      className: typeof parsed.className === 'string' ? parsed.className : '',
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
      images,
    },
    warnings,
  };
}

/**
 * Lines a project's entries up against the files the user has picked.
 *
 * A project carries no image bytes, so unmatched entries are handed back
 * rather than discarded — a user who loads the project before picking files
 * would otherwise silently destroy their work.
 */
export function matchProjectToFiles(project, files) {
  const byKey = new Map();
  for (const entry of project?.images || []) {
    byKey.set(`${entry.name}:${entry.size}`, entry);
  }

  const matched = [];
  const unmatchedFiles = [];
  const used = new Set();

  for (const file of files || []) {
    const key = `${file.name}:${file.size}`;
    const entry = byKey.get(key);
    if (entry) {
      used.add(key);
      matched.push({ file, entry });
    } else {
      unmatchedFiles.push(file);
    }
  }

  const unmatchedProject = [...byKey.entries()]
    .filter(([key]) => !used.has(key))
    .map(([, entry]) => entry);

  return { matched, unmatchedProject, unmatchedFiles };
}
