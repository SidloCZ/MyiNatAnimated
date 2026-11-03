import { describe, it, expect } from 'vitest';
import { crc32, parsePngChunks, assembleApng } from './apngExporter';

describe('apngExporter', () => {
  it('correctly calculates CRC32 checksums', () => {
    // Standard test vector: CRC32 of ASCII "IHDR"
    const ihdrBytes = new Uint8Array([0x49, 0x48, 0x44, 0x52]);
    const crc = crc32(ihdrBytes);
    expect(crc).toBeTypeOf('number');
    expect(crc).toBeGreaterThan(0);
  });

  it('assembles a valid APNG from mock PNG frames', () => {
    // Minimal valid 1x1 PNG frame:
    // PNG signature + IHDR + IDAT + IEND
    function createMockPng(idatByte: number): Uint8Array {
      // 8 bytes signature
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

      // IHDR (13 bytes: 1x1, 8-bit RGBA)
      // width=1, height=1, depth=8, colortype=6, comp=0, filter=0, interlace=0
      const ihdrData = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
      const ihdrChunk = createChunk('IHDR', ihdrData);

      // IDAT
      const idatData = new Uint8Array([idatByte, 0x12, 0x34]);
      const idatChunk = createChunk('IDAT', idatData);

      // IEND
      const iendChunk = createChunk('IEND', new Uint8Array(0));

      const totalLen = sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
      const res = new Uint8Array(totalLen);
      let o = 0;
      res.set(sig, o);
      o += sig.length;
      res.set(ihdrChunk, o);
      o += ihdrChunk.length;
      res.set(idatChunk, o);
      o += idatChunk.length;
      res.set(iendChunk, o);
      return res;
    }

    function createChunk(type: string, data: Uint8Array): Uint8Array {
      const chunk = new Uint8Array(12 + data.length);
      const v = new DataView(chunk.buffer);
      v.setUint32(0, data.length, false);
      for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
      chunk.set(data, 8);
      const c = crc32(chunk, 4, 4 + data.length);
      v.setUint32(8 + data.length, c, false);
      return chunk;
    }

    const frame1 = createMockPng(0x01);
    const frame2 = createMockPng(0x02);

    const apng = assembleApng({
      width: 1,
      height: 1,
      fps: 10,
      framesPngBytes: [frame1, frame2],
    });

    expect(apng).toBeInstanceOf(Uint8Array);
    expect(apng.length).toBeGreaterThan(frame1.length);

    // Parse chunks of assembled APNG
    const chunks = parsePngChunks(apng);
    const chunkTypes = chunks.map((c) => c.type);

    // Must have IHDR, acTL, fcTL, IDAT, fcTL, fdAT, IEND
    expect(chunkTypes).toContain('IHDR');
    expect(chunkTypes).toContain('acTL');
    expect(chunkTypes).toContain('fcTL');
    expect(chunkTypes).toContain('IDAT');
    expect(chunkTypes).toContain('fdAT');
    expect(chunkTypes).toContain('IEND');

    // First animation control chunk should indicate 2 frames
    const actl = chunks.find((c) => c.type === 'acTL')!;
    const actlView = new DataView(actl.data.buffer, actl.data.byteOffset, actl.data.byteLength);
    expect(actlView.getUint32(0, false)).toBe(2);
    expect(actlView.getUint32(4, false)).toBe(0); // infinite loop
  });
});

