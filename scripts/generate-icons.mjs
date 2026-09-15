// Generates PWA PNG icons (192/512, maskable) without external tooling:
// minimal PNG encoder (zlib from node core) + a pixel-drawn gamepad on the
// brand gradient. Run: node scripts/generate-icons.mjs
// Output: public/icons/icon-192.png, public/icons/icon-512.png
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// --- minimal PNG writer (8-bit RGBA, no interlace) ---
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// --- art: vertical brand gradient (#0a0712 -> #2a1650) + white gamepad ---
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function draw(size) {
  const px = Buffer.alloc(size * size * 4);
  const top = [10, 7, 18];
  const bot = [42, 22, 80];
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      px[i] = lerp(top[0], bot[0], t);
      px[i + 1] = lerp(top[1], bot[1], t);
      px[i + 2] = lerp(top[2], bot[2], t);
      px[i + 3] = 255;
    }
  }
  const dot = (cx, cy, r, c) => {
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(size, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(size, Math.ceil(cx + r)); x++) {
        const dx = (x + 0.5 - cx) / r;
        const dy = (y + 0.5 - cy) / r;
        if (dx * dx + dy * dy <= 1) {
          const i = (y * size + x) * 4;
          px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
        }
      }
    }
  };
  const bar = (x0, y0, x1, y1, c) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(size, Math.ceil(y1)); y++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(size, Math.ceil(x1)); x++) {
        const i = (y * size + x) * 4;
        px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
      }
    }
  };
  const u = size / 512; // unit
  const W = [255, 255, 255];
  const A = [192, 132, 252]; // accent
  // pad body
  bar(106 * u, 226 * u, 406 * u, 330 * u, W);
  dot(106 * u, 278 * u, 52 * u, W);
  dot(406 * u, 278 * u, 52 * u, W);
  // d-pad (left)
  bar(168 * u, 258 * u, 204 * u, 306 * u, A);
  bar(180 * u, 246 * u, 192 * u, 318 * u, A);
  // buttons (right)
  dot(318 * u, 262 * u, 11 * u, A);
  dot(344 * u, 288 * u, 11 * u, A);
  dot(292 * u, 288 * u, 11 * u, A);
  dot(318 * u, 314 * u, 11 * u, A);
  return px;
}

for (const size of [192, 512]) {
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, encodePNG(size, size, draw(size)));
  console.log(`wrote ${file}`);
}
