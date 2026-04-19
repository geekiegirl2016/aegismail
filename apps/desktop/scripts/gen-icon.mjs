#!/usr/bin/env node
/**
 * Generates a placeholder source PNG for the Tauri icon pipeline.
 *
 * Produces a 1024x1024 RGBA PNG at apps/desktop/src-tauri/icons/source.png
 * with a soft blue shield-ish circle on a dark background. No external
 * dependencies — uses only Node's built-in zlib/crc32.
 *
 * Replace the generated image with a real brand asset any time and re-run
 * `pnpm --filter @aegismail/desktop tauri icon <path>` to regenerate the
 * full icon set.
 */
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Buffer } from 'node:buffer';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'src-tauri', 'icons', 'source.png');

const SIZE = 1024;

const BG = [0x0b, 0x12, 0x24, 0xff];       // deep navy
const FG_OUTER = [0x3b, 0x64, 0xc7, 0xff]; // blue ring
const FG_INNER = [0x7c, 0xa8, 0xff, 0xff]; // lighter blue fill
const FG_BAR   = [0xf5, 0xf7, 0xfa, 0xff]; // near-white horizontal bar

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;

const rows = Buffer.alloc(SIZE * (1 + SIZE * 4));

const cx = SIZE / 2;
const cy = SIZE / 2;
const ringOuter = 460;
const ringInner = 380;
const barHalfH = 36;
const barHalfW = 260;

for (let y = 0; y < SIZE; y++) {
  const rowOffset = y * (1 + SIZE * 4);
  rows[rowOffset] = 0; // filter: None
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);

    let px;
    if (d < ringInner) {
      if (Math.abs(dy) < barHalfH && Math.abs(dx) < barHalfW) {
        px = FG_BAR;
      } else {
        px = FG_INNER;
      }
    } else if (d < ringOuter) {
      px = FG_OUTER;
    } else {
      px = BG;
    }

    const off = rowOffset + 1 + x * 4;
    rows[off + 0] = px[0];
    rows[off + 1] = px[1];
    rows[off + 2] = px[2];
    rows[off + 3] = px[3];
  }
}

const idat = deflateSync(rows, { level: 9 });
const png = Buffer.concat([
  PNG_SIGNATURE,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
