const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 64;
const SCALE = 4;
const CANVAS = SIZE * SCALE;
const outputDir = path.resolve(__dirname, '../miniprogram/images/detail');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(pixels) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const row = y * (SIZE * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function createCanvas() {
  return new Uint8Array(CANVAS * CANVAS);
}

function drawLine(canvas, x1, y1, x2, y2, width) {
  const ax = x1 * SCALE;
  const ay = y1 * SCALE;
  const bx = x2 * SCALE;
  const by = y2 * SCALE;
  const radius = width * SCALE / 2;
  const minX = Math.max(0, Math.floor(Math.min(ax, bx) - radius));
  const maxX = Math.min(CANVAS - 1, Math.ceil(Math.max(ax, bx) + radius));
  const minY = Math.max(0, Math.floor(Math.min(ay, by) - radius));
  const maxY = Math.min(CANVAS - 1, Math.ceil(Math.max(ay, by) + radius));
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
      const distance = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
      if (distance <= radius) canvas[y * CANVAS + x] = 255;
    }
  }
}

function heartPoints() {
  const points = [];
  for (let index = 0; index <= 180; index += 1) {
    const t = Math.PI * 2 * index / 180;
    const x = 32 + Math.pow(Math.sin(t), 3) * 20;
    const y = 30 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    points.push([x, y]);
  }
  return points;
}

function fillPolygon(canvas, points) {
  const scaled = points.map(([x, y]) => [x * SCALE, y * SCALE]);
  for (let y = 0; y < CANVAS; y += 1) {
    const intersections = [];
    for (let i = 0, j = scaled.length - 1; i < scaled.length; j = i, i += 1) {
      const [xi, yi] = scaled[i];
      const [xj, yj] = scaled[j];
      if ((yi > y) !== (yj > y)) intersections.push(xi + (y - yi) * (xj - xi) / (yj - yi));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      const from = Math.max(0, Math.ceil(intersections[i]));
      const to = Math.min(CANVAS - 1, Math.floor(intersections[i + 1]));
      for (let x = from; x <= to; x += 1) canvas[y * CANVAS + x] = 255;
    }
  }
}

function render(canvas, color) {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let alpha = 0;
      for (let sy = 0; sy < SCALE; sy += 1) {
        for (let sx = 0; sx < SCALE; sx += 1) alpha += canvas[(y * SCALE + sy) * CANVAS + x * SCALE + sx];
      }
      const offset = (y * SIZE + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = Math.round(alpha / (SCALE * SCALE));
    }
  }
  return pixels;
}

function save(name, canvas, color) {
  fs.writeFileSync(path.join(outputDir, name), encodePng(render(canvas, color)));
}

fs.mkdirSync(outputDir, { recursive: true });

const share = createCanvas();
drawLine(share, 15, 28, 15, 51, 4);
drawLine(share, 15, 51, 49, 51, 4);
drawLine(share, 49, 51, 49, 28, 4);
drawLine(share, 32, 10, 32, 39, 4);
drawLine(share, 32, 10, 21, 21, 4);
drawLine(share, 32, 10, 43, 21, 4);
save('share.png', share, [85, 98, 115]);

const outlineHeart = createCanvas();
const points = heartPoints();
for (let index = 1; index < points.length; index += 1) {
  drawLine(outlineHeart, ...points[index - 1], ...points[index], 3.5);
}
save('favorite.png', outlineHeart, [85, 98, 115]);

const filledHeart = createCanvas();
fillPolygon(filledHeart, points);
save('favorite-active.png', filledHeart, [225, 102, 49]);
