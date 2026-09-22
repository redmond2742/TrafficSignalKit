/**
 * Marking search matches in text that is then rendered with v-html.
 *
 * The implementations this replaces did `text.replace(re, m => `<strong>${m}</strong>`)`
 * and handed the result straight to v-html. Only the matched span was wrapped;
 * everything around it went through unescaped. A high-resolution CSV containing
 * `<img src=x onerror=...>` in any cell therefore executed on render, and the
 * CSV is whatever file the user was handed.
 *
 * Escaping has to happen before the markup is inserted, and the match offsets
 * have to be computed on the escaped string, or the tags land in the wrong
 * place once `&` becomes `&amp;`.
 *
 * Framework free so it runs under `node --test`.
 */

const ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

/** Makes a literal string safe to compile into a RegExp. */
export function escapeRegExp(value) {
  return String(value == null ? "" : value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escaped `text` with every case-insensitive occurrence of `needle` wrapped in
 * `tag`. Returns escaped text unchanged when there is nothing to mark, so the
 * result is always safe for v-html.
 *
 * Defaults to <strong> because that is what the call sites already rendered;
 * this change is a security fix and should not also restyle the tables. Pass
 * tag: "mark" if a highlight is wanted later.
 */
export function highlightMatches(text, needle, { tag = "strong" } = {}) {
  const haystack = String(text == null ? "" : text);
  const term = String(needle == null ? "" : needle);
  if (!term) return escapeHtml(haystack);

  const lowerHay = haystack.toLowerCase();
  const lowerTerm = term.toLowerCase();
  if (!lowerHay.includes(lowerTerm)) return escapeHtml(haystack);

  let out = "";
  let cursor = 0;
  for (;;) {
    const at = lowerHay.indexOf(lowerTerm, cursor);
    if (at === -1) break;
    // Escape each slice separately, so the tags cannot be split by an entity.
    out += escapeHtml(haystack.slice(cursor, at));
    out += `<${tag}>${escapeHtml(haystack.slice(at, at + term.length))}</${tag}>`;
    cursor = at + term.length;
  }
  out += escapeHtml(haystack.slice(cursor));
  return out;
}
