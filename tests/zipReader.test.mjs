import test from 'node:test';
import assert from 'node:assert/strict';
import { readZipEntries, readZipText } from '../src/utils/zipReader.js';
import { buildZipParts, concatParts } from '../src/utils/zipWriter.js';

const encoder = new TextEncoder();

/** Builds a real archive with this repo's own writer, so the test is a round trip. */
function storedZip(files) {
  const entries = Object.entries(files).map(([name, text]) => ({ name, data: encoder.encode(text) }));
  // buildZipParts returns { parts, ... }, not the parts array itself.
  return concatParts(buildZipParts(entries).parts);
}

/** A DEFLATE archive, assembled by hand since the writer only stores. */
async function deflatedZip(name, text) {
  const raw = encoder.encode(text);
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const deflated = new Uint8Array(await new Response(stream).arrayBuffer());

  // crc32 of the *uncompressed* bytes, per the spec
  let crc = 0xffffffff;
  for (const byte of raw) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  crc = (crc ^ 0xffffffff) >>> 0;

  const nameBytes = encoder.encode(name);
  const local = new Uint8Array(30 + nameBytes.length + deflated.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(4, 20, true);
  lv.setUint16(8, 8, true); // deflate
  lv.setUint32(14, crc, true);
  lv.setUint32(18, deflated.length, true);
  lv.setUint32(22, raw.length, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(deflated, 30 + nameBytes.length);

  const central = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(6, 20, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(16, crc, true);
  cv.setUint32(20, deflated.length, true);
  cv.setUint32(24, raw.length, true);
  cv.setUint16(28, nameBytes.length, true);
  cv.setUint32(42, 0, true);
  central.set(nameBytes, 46);

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);

  const out = new Uint8Array(local.length + central.length + eocd.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(eocd, local.length + central.length);
  return out;
}

test('reads stored entries written by this repo\'s own zip writer', async () => {
  const zip = storedZip({ 'a.txt': 'alpha', 'b.txt': 'beta' });
  const entries = await readZipEntries(zip);
  assert.deepEqual(entries.map((e) => e.name), ['a.txt', 'b.txt']);
  assert.equal(new TextDecoder().decode(entries[0].bytes), 'alpha');
  assert.equal(new TextDecoder().decode(entries[1].bytes), 'beta');
});

test('reads deflated entries through the platform decompressor', async () => {
  // Compressible enough that the deflated bytes really differ from the input.
  const text = 'signal_id,phase\n'.repeat(200);
  const entries = await readZipEntries(await deflatedZip('phases.txt', text));
  assert.equal(entries.length, 1);
  assert.equal(new TextDecoder().decode(entries[0].bytes), text);
});

test('readZipText keys by base name, dropping any directory', async () => {
  const zip = storedZip({ 'export/phases.txt': 'phase,signal_id\n1,1' });
  const files = await readZipText(zip);
  assert.deepEqual(Object.keys(files), ['phases.txt']);
  assert.match(files['phases.txt'], /^phase,signal_id/);
});

test('an empty file round-trips rather than being dropped', async () => {
  const files = await readZipText(storedZip({ 'empty.txt': '', 'full.txt': 'x' }));
  assert.equal(files['empty.txt'], '');
  assert.equal(files['full.txt'], 'x');
});

test('something that is not a zip is refused with a clear message', async () => {
  await assert.rejects(
    () => readZipEntries(new TextEncoder().encode('preempt_channel,signalID\n3,1')),
    /not a zip file/i,
  );
});

test('a truncated archive is refused rather than half-read', async () => {
  const zip = storedZip({ 'a.txt': 'alpha' });
  // Keep the end-of-central-directory record but corrupt where it points.
  const damaged = zip.slice();
  new DataView(damaged.buffer).setUint32(damaged.length - 6, 999999, true);
  await assert.rejects(() => readZipEntries(damaged));
});

test('it accepts an ArrayBuffer as well as a Uint8Array', async () => {
  const zip = storedZip({ 'a.txt': 'alpha' });
  const copy = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
  const entries = await readZipEntries(copy);
  assert.equal(entries.length, 1);
});
