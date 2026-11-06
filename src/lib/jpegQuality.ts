/**
 * Estimate the quality setting a JPEG was encoded with, by comparing its
 * quantization tables (DQT) against the libjpeg/IJG standard tables scaled
 * for every possible quality value. Same approach as ImageMagick's `%Q`.
 * Returns null when no DQT can be parsed.
 */

// JPEG Annex K standard luminance table, natural (row) order.
const STD_LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113,
  92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

// Natural-order index visited at each zigzag position (DQT stores zigzag order).
const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52,
  45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

interface QuantTable {
  id: number;
  values: number[];
}

function parseQuantTables(jpeg: Uint8Array): QuantTable[] | null {
  // Markers without a length payload.
  const noLength = (m: number) =>
    m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xd8 || m === 0xd9;
  const tables: QuantTable[] = [];
  let i = 2; // skip SOI
  while (i < jpeg.length - 1) {
    if (jpeg[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = jpeg[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (noLength(marker)) {
      i += 2;
      continue;
    }
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (marker === 0xda) break; // SOS — quant tables must precede scan data
    if (marker === 0xdb && len >= 3) {
      let p = i + 4;
      const end = i + 2 + len;
      while (p + 1 <= end - 1 && p < end) {
        const pq = jpeg[p] >> 4; // 0 = 8-bit values, 1 = 16-bit values
        const id = jpeg[p] & 0x0f;
        p++;
        const values: number[] = [];
        if (pq === 0) {
          for (let k = 0; k < 64 && p < end; k++, p++) values.push(jpeg[p]);
        } else {
          for (let k = 0; k < 64 && p + 1 < end; k++, p += 2)
            values.push((jpeg[p] << 8) | jpeg[p + 1]);
        }
        if (values.length === 64) tables.push({ id, values });
      }
    }
    i += 2 + len;
  }
  return tables.length > 0 ? tables : null;
}

function scaledTable(quality: number): number[] {
  const scale = quality < 50 ? 5000 / quality : 200 - quality * 2;
  return STD_LUMA.map((v) => Math.min(255, Math.max(1, Math.floor((v * scale + 50) / 100))));
}

export function estimateJpegQuality(jpeg: Uint8Array): number | null {
  const tables = parseQuantTables(jpeg);
  if (!tables) return null;
  const luma = tables.find((t) => t.id === 0) ?? tables[0];
  let best = 90;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let q = 1; q <= 100; q++) {
    const scaled = scaledTable(q);
    let score = 0;
    for (let k = 0; k < 64; k++) {
      score += Math.abs(luma.values[k] - scaled[ZIGZAG[k]]);
      if (score >= bestScore) break;
    }
    if (score < bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}
