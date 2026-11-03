import { ExportProgress } from '../types/export';

// Precomputed CRC32 table for PNG chunk checksums
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  CRC_TABLE[n] = c;
}

export function crc32(buffer: Uint8Array, offset = 0, length = buffer.length): number {
  let c = 0xffffffff;
  const end = offset + length;
  for (let i = offset; i < end; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface PngChunk {
  type: string;
  data: Uint8Array;
}

export function parsePngChunks(bytes: Uint8Array): PngChunk[] {
  // Check PNG signature
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== signature[i]) {
      throw new Error('Neplatný PNG formát (chybí signatura)');
    }
  }

  const chunks: PngChunk[] = [];
  let offset = 8;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    const dataOffset = offset + 8;
    const data = bytes.subarray(dataOffset, dataOffset + length);
    chunks.push({ type, data });
    offset += 12 + length;
  }

  return chunks;
}

function writeChunk(type: string, data: Uint8Array): Uint8Array {
  const length = data.length;
  const chunk = new Uint8Array(12 + length);
  const view = new DataView(chunk.buffer);

  // Length (big endian)
  view.setUint32(0, length, false);

  // Type (4 bytes ASCII)
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i);
  }

  // Data
  chunk.set(data, 8);

  // CRC32 over type + data
  const crcVal = crc32(chunk, 4, 4 + length);
  view.setUint32(8 + length, crcVal, false);

  return chunk;
}

export interface AssembleApngOptions {
  width: number;
  height: number;
  fps: number;
  framesPngBytes: Uint8Array[];
}

export function assembleApng({ width, height, fps, framesPngBytes }: AssembleApngOptions): Uint8Array {
  if (framesPngBytes.length === 0) {
    throw new Error('Nelze vytvořit APNG bez snímků');
  }

  const numFrames = framesPngBytes.length;
  const delayNum = 1;
  const delayDen = Math.max(1, fps);

  // Parse first frame
  const firstFrameChunks = parsePngChunks(framesPngBytes[0]);
  const ihdrChunk = firstFrameChunks.find((c) => c.type === 'IHDR');
  if (!ihdrChunk) throw new Error('Chybí IHDR chunk v prvním snímku');

  // Collect result chunks
  const assembledParts: Uint8Array[] = [];

  // PNG Signature
  assembledParts.push(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // IHDR chunk
  assembledParts.push(writeChunk('IHDR', ihdrChunk.data));

  // acTL chunk (Animation Control Chunk)
  // num_frames (4 bytes), num_plays (4 bytes; 0 = infinite loop)
  const actlData = new Uint8Array(8);
  const actlView = new DataView(actlData.buffer);
  actlView.setUint32(0, numFrames, false);
  actlView.setUint32(4, 0, false); // 0 = repeat indefinitely
  assembledParts.push(writeChunk('acTL', actlData));

  let sequenceNumber = 0;

  // Process frames
  for (let frameIndex = 0; frameIndex < numFrames; frameIndex++) {
    const chunks = frameIndex === 0 ? firstFrameChunks : parsePngChunks(framesPngBytes[frameIndex]);

    // fcTL chunk (Frame Control Chunk)
    const fctlData = new Uint8Array(26);
    const fctlView = new DataView(fctlData.buffer);
    fctlView.setUint32(0, sequenceNumber++, false); // sequence_number
    fctlView.setUint32(4, width, false); // width
    fctlView.setUint32(8, height, false); // height
    fctlView.setUint32(12, 0, false); // x_offset
    fctlView.setUint32(16, 0, false); // y_offset
    fctlView.setUint16(20, delayNum, false); // delay_num
    fctlView.setUint16(22, delayDen, false); // delay_den
    fctlData[24] = 0; // dispose_op: 0 (APNG_DISPOSE_OP_NONE)
    fctlData[25] = 0; // blend_op: 0 (APNG_BLEND_OP_SOURCE)
    assembledParts.push(writeChunk('fcTL', fctlData));

    // IDAT or fdAT chunks
    const idatChunks = chunks.filter((c) => c.type === 'IDAT');
    if (idatChunks.length === 0) {
      throw new Error(`Snímek ${frameIndex} neobsahuje žádný IDAT chunk`);
    }

    if (frameIndex === 0) {
      // First frame writes standard IDAT chunk(s)
      for (const idat of idatChunks) {
        assembledParts.push(writeChunk('IDAT', idat.data));
      }
    } else {
      // Subsequent frames write fdAT chunk(s): sequence_number (4 bytes) + idat data
      for (const idat of idatChunks) {
        const fdatData = new Uint8Array(4 + idat.data.length);
        const fdatView = new DataView(fdatData.buffer);
        fdatView.setUint32(0, sequenceNumber++, false);
        fdatData.set(idat.data, 4);
        assembledParts.push(writeChunk('fdAT', fdatData));
      }
    }
  }

  // IEND chunk
  assembledParts.push(writeChunk('IEND', new Uint8Array(0)));

  // Calculate total length and concatenate
  const totalLength = assembledParts.reduce((acc, p) => acc + p.length, 0);
  const result = new Uint8Array(totalLength);
  let curOffset = 0;
  for (const part of assembledParts) {
    result.set(part, curOffset);
    curOffset += part.length;
  }

  return result;
}

export type ApngRenderFrameCallback = (timeSec: number, targetCanvas: HTMLCanvasElement) => Promise<void>;

export async function exportToApng(
  durationSeconds: number,
  renderFrame: ApngRenderFrameCallback,
  onProgress?: (progress: ExportProgress) => void,
  fps = 15,
  width = 640,
  height = 360
): Promise<Blob> {
  const totalFrames = Math.max(1, Math.ceil(durationSeconds * fps));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const framesPngBytes: Uint8Array[] = [];

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    await renderFrame(t, canvas);

    const frameBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!frameBlob) {
      throw new Error(`Nepodařilo se vygenerovat PNG pro snímek ${f}`);
    }

    const arrayBuffer = await frameBlob.arrayBuffer();
    framesPngBytes.push(new Uint8Array(arrayBuffer));

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: Math.round(((f + 1) / totalFrames) * 95),
        phase: 'rendering',
      });
    }
  }

  if (onProgress) {
    onProgress({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 98,
      phase: 'encoding',
    });
  }

  const apngBytes = assembleApng({
    width,
    height,
    fps,
    framesPngBytes,
  });

  return new Blob([apngBytes as unknown as BlobPart], { type: 'image/png' });
}
