/**
 * The rules for dropping files on a box.
 *
 * A file input filters by its `accept` list and honours `multiple` for you; a
 * drop does neither, so without these a PDF dropped on a CSV box would be read
 * as text and pasted into the tool.
 *
 * Framework free, so it runs under `node --test`.
 */

/**
 * Whether a drag is carrying files. Selected text dragged into a text box, or
 * a block dragged around Block Logic's canvas, is not, and is left alone.
 */
export function dragHasFiles(dataTransfer) {
  return Array.from(dataTransfer?.types || []).includes("Files");
}

const acceptTokens = (accept) =>
  String(accept || "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

/**
 * Whether a file passes an `accept` list, as a file input would judge it: an
 * extension, a type, or a family of types such as image/*. No list, no limit.
 * Extensions are what mostly decide it, since a browser often reports no type
 * at all for a .gpx or, on Windows, a .csv.
 */
export function fileMatchesAccept(file, accept) {
  const tokens = acceptTokens(accept);
  if (!tokens.length) return true;
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/**
 * Sorts dropped files into those to read and those to refuse. Only the first
 * acceptable file is kept for a box that takes one.
 */
export function pickDroppedFiles(files, { accept = "", multiple = true } = {}) {
  const list = Array.from(files || []);
  const accepted = list.filter((file) => fileMatchesAccept(file, accept));
  return {
    accepted: multiple ? accepted : accepted.slice(0, 1),
    rejected: list.filter((file) => !accepted.includes(file)),
  };
}

/** What to say about files that were refused. */
export function rejectedMessage(rejected, accept) {
  const names = rejected.map((file) => file.name).join(", ");
  const extensions = acceptTokens(accept).filter((token) => token.startsWith("."));
  const takes = extensions.length ? ` This box takes ${extensions.join(", ")}.` : "";
  return `Not loaded: ${names}.${takes}`;
}
