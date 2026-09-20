/**
 * FNV-1a, 32 bit.
 *
 * Shared by the annotator's deterministic train/val split and its localStorage
 * key derivation. Both need a small, fast, dependency-free string hash whose
 * output never changes between releases — if this function changed, saved
 * annotations would orphan and existing datasets would reshuffle.
 */
export function fnv1a32(text) {
  let hash = 0x811c9dc5;
  const value = String(text == null ? '' : text);
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    // hash *= 16777619, kept in 32-bit range without Math.imul overflow surprises
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }

  // MurmurHash3's fmix32 finalizer. FNV-1a alone avalanches poorly in its HIGH
  // bits for short strings that share a prefix, and both callers here feed it
  // exactly that: "seed|frame-001", "seed|frame-002". The split compares the
  // top bits as a fraction, so without this the fractions for a whole image set
  // cluster inside a narrow band and a requested 20% val share comes out at 36%.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
