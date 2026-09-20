import test from 'node:test';
import assert from 'node:assert/strict';
import {
  crc32,
  crc32Update,
  crc32Finish,
  CRC32_INIT,
  dosDateTime,
  assertZipLimits,
  buildZipParts,
  concatParts,
  toBytes,
} from '../src/utils/zipWriter.js';

test('crc32 matches the standard IEEE check vectors', () => {
  assert.equal(crc32(''), 0);
  assert.equal(crc32('a'), 0xe8b7be43);
  assert.equal(crc32('123456789'), 0xcbf43926);
  assert.equal(crc32('The quick brown fox jumps over the lazy dog'), 0x414fa339);
});

test('a chunked crc equals the one-shot crc', () => {
  const text = 'the annotator streams files so it never holds them all in memory';
  const bytes = toBytes(text);
  const split = 17;

  let state = CRC32_INIT;
  state = crc32Update(state, bytes.subarray(0, split));
  state = crc32Update(state, bytes.subarray(split));

  assert.equal(crc32Finish(state), crc32(text));
});

test('dosDateTime packs the fields and clamps pre-1980 dates', () => {
  const stamp = dosDateTime(new Date(2024, 0, 6, 15, 30, 44));
  // date: ((2024-1980) << 9) | (1 << 5) | 6 ; time: (15 << 11) | (30 << 5) | 22
  assert.equal(stamp.date, (44 << 9) | (1 << 5) | 6);
  assert.equal(stamp.time, (15 << 11) | (30 << 5) | 22);

  const old = dosDateTime(new Date(1970, 5, 1, 12, 0, 0));
  assert.equal(old.date, (1 << 5) | 1, '1970 clamps to 1980-01-01');
  assert.equal(old.time, 0);
  assert.ok(old.date > 0, 'a negative year shift would corrupt the u16');
});

const sampleEntries = [
  { name: 'data.yaml', data: 'nc: 1\n' },
  { name: 'images/train/frame-001.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]) },
  { name: 'labels/train/frame-001.txt', data: '0 0.5 0.5 0.1 0.2\n' },
  { name: 'labels/val/frame-002.txt', data: '' },
];

test('the archive is internally consistent', () => {
  const { parts, count, cdOffset, cdSize, totalSize } = buildZipParts(sampleEntries);
  const bytes = concatParts(parts);
  const view = new DataView(bytes.buffer);

  assert.equal(count, 4);
  assert.equal(bytes.length, totalSize, 'reported size matches the bytes produced');
  assert.equal(cdOffset + cdSize + 22, totalSize, 'EOCD sits right after the central directory');

  assert.equal(view.getUint32(0, true), 0x04034b50, 'starts with a local file header');
  assert.equal(view.getUint32(cdOffset, true), 0x02014b50, 'central directory at the stated offset');
  assert.equal(view.getUint32(totalSize - 22, true), 0x06054b50, 'ends with the EOCD record');
  assert.equal(view.getUint16(totalSize - 22 + 10, true), 4, 'EOCD counts every entry');
  assert.equal(view.getUint32(totalSize - 22 + 16, true), cdOffset);
});

test('local and central headers agree on every field', () => {
  const { parts, cdOffset } = buildZipParts(sampleEntries);
  const bytes = concatParts(parts);
  const view = new DataView(bytes.buffer);

  // Walk the central directory and check each record against its local header.
  let at = cdOffset;
  for (let i = 0; i < 4; i += 1) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));

    assert.equal(view.getUint32(localOffset, true), 0x04034b50, `${name} points at a local header`);
    assert.equal(view.getUint32(localOffset + 14, true), crc, `${name} crc agrees`);
    assert.equal(view.getUint32(localOffset + 18, true), size, `${name} compressed size agrees`);
    assert.equal(view.getUint32(localOffset + 22, true), size, `${name} uncompressed size agrees`);
    assert.equal(view.getUint16(localOffset + 8, true), 0, `${name} is stored, not deflated`);
    const localName = new TextDecoder().decode(
      bytes.subarray(localOffset + 30, localOffset + 30 + nameLen),
    );
    assert.equal(localName, name);

    at += 46 + nameLen;
  }
});

test('an empty entry writes a zero-length payload', () => {
  const { parts, totalSize } = buildZipParts([{ name: 'labels/val/a.txt', data: '' }]);
  const bytes = concatParts(parts);
  const view = new DataView(bytes.buffer);

  assert.equal(view.getUint32(18, true), 0, 'compressed size is zero');
  assert.equal(view.getUint32(22, true), 0, 'uncompressed size is zero');
  assert.equal(view.getUint32(14, true), 0, 'crc of nothing is zero');
  assert.equal(totalSize, 30 + 16 + 0 + 46 + 16 + 22);
});

// Exported datasets are ASCII-only (sanitizeBasename guarantees it), but the
// writer still has to encode names correctly. Verified against Python zipfile,
// which reads these names back intact; macOS Info-ZIP ignores the flag bit.
test('names are stored as UTF-8 with the flag set', () => {
  const { parts } = buildZipParts([{ name: 'señal.txt', data: 'x' }]);
  const bytes = concatParts(parts);
  const view = new DataView(bytes.buffer);

  assert.equal(view.getUint16(26, true), 10, 'name length counts bytes, not characters');
  assert.equal(view.getUint16(6, true) & 0x0800, 0x0800, 'UTF-8 flag bit 11 is set');
});

test('streamed entries supply their own size and crc', () => {
  const { parts } = buildZipParts([
    { name: 'images/train/big.jpg', blob: 'PRETEND-BLOB', size: 12, crc: crc32('PRETEND-BLOB') },
  ]);
  const view = new DataView(concatParts([parts[0]]).buffer);
  assert.equal(view.getUint32(18, true), 12);
  assert.equal(view.getUint32(14, true), crc32('PRETEND-BLOB'));
});

test('limits are reported in words the UI can show', () => {
  const tooMany = Array.from({ length: 65536 }, (unused, i) => ({ name: `f${i}.txt`, data: '' }));
  assert.throws(() => assertZipLimits(tooMany), /65,535|smaller batches/);

  assert.throws(
    () => assertZipLimits([{ name: 'huge.bin', blob: {}, size: 5 * 1024 ** 3, crc: 0 }]),
    /over 4 GB/,
  );

  const overTotal = Array.from({ length: 3 }, (unused, i) => ({
    name: `big-${i}.bin`,
    blob: {},
    size: 1.6 * 1024 ** 3,
    crc: 0,
  }));
  assert.throws(() => assertZipLimits(overTotal), /4 GB/);
});

test('unsafe entry names are refused', () => {
  assert.throws(() => buildZipParts([{ name: '../escape.txt', data: 'x' }]), /Unsafe/);
  assert.throws(() => buildZipParts([{ name: '', data: 'x' }]), /needs a name/);
});
