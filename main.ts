// news-image-20261120 — "The World in One Day"
// A 1024x1024 newspaper front page for FRIDAY 20 NOVEMBER 2026,
// drawn entirely in code: hand-rolled PNG encoder + hand-rolled 5x7
// bitmap font. Node stdlib only. Fully deterministic: no clock, no
// randomness, no network, fixed zlib level, no metadata chunks.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);

const PAPER = [246, 241, 231];
const INK = [24, 24, 24];
const NAVY = [20, 33, 61];
const GOLD = [201, 162, 39];
const CARD = [255, 255, 255];
const GREY = [96, 96, 96];
const WHITE = [250, 249, 246];
const RED = [176, 32, 24];
const BLUE = [29, 78, 137];
const TEAL = [14, 124, 123];
const AMBER = [178, 115, 26];
const PURPLE = [91, 58, 142];

function fillAll(c) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function dot(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x, y, w, h, c) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function disc(cx, cy, r, c) {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) dot(xx, yy, c);
    }
  }
}

// Thick polyline: stamp small squares along the segment.
function stroke(x0, y0, x1, y1, t, c) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const half = Math.floor(t / 2);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    for (let a = -half; a <= half; a++) {
      for (let b = -half; b <= half; b++) dot(x + a, y + b, c);
    }
  }
}

// ------------------------------------------------------- 5x7 bitmap font
// Each glyph: 7 rows of 5 bits, written as strings, left bit = column 0.
// Only the glyphs this page needs are defined.
const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "·": ["00000", "00000", "01100", "01100", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "’": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const ADVANCE = 6; // glyph width + 1 column gap

function glyphOf(ch) {
  const up = ch.toUpperCase();
  return GLYPHS[up] || GLYPHS["?"];
}

function textWidth(s, scale) {
  return s.length * ADVANCE * scale - scale;
}

function drawText(x, y, s, scale, c) {
  let cx = x;
  for (const ch of s) {
    const g = glyphOf(ch);
    for (let r = 0; r < GLYPH_H; r++) {
      const row = g[r];
      for (let col = 0; col < GLYPH_W; col++) {
        if (row[col] === "1") {
          rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += ADVANCE * scale;
  }
  return cx - x;
}

function drawCentred(y, s, scale, c) {
  const w = textWidth(s, scale);
  drawText(Math.round((W - w) / 2), y, s, scale, c);
}

// Greedy word wrap into lines no wider than maxW px.
function wrap(s, scale, maxW) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawBlock(x, y, s, scale, maxW, lineGap, c) {
  const lines = wrap(s, scale, maxW);
  const step = GLYPH_H * scale + lineGap;
  lines.forEach((ln, i) => drawText(x, y + i * step, ln, scale, c));
  return lines.length;
}

// ------------------------------------------------------------ PNG encoder
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG() {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------- cyclone pictogram
// Archimedean spiral: radius grows with angle, drawn as a thick navy
// polyline with a gold eye. Rain slashes lean in from the edges.
function drawCyclone(cx, cy) {
  const turns = 3.1;
  const maxR = 96;
  const steps = 340;
  let px0 = cx;
  let py0 = cy;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * turns * Math.PI * 2;
    const r = (i / steps) * maxR;
    const x = Math.round(cx + Math.cos(a + 0.6) * r);
    const y = Math.round(cy + Math.sin(a + 0.6) * r * 0.92);
    stroke(px0, py0, x, y, 4, NAVY);
    px0 = x;
    py0 = y;
  }
  disc(cx, cy, 13, GOLD);
  disc(cx, cy, 7, PAPER);
  // Wind streaks around the spiral.
  stroke(cx - 118, cy - 74, cx - 82, cy - 62, 3, GOLD);
  stroke(cx + 84, cy - 88, cx + 118, cy - 76, 3, GOLD);
  stroke(cx - 116, cy + 84, cx - 80, cy + 72, 3, GOLD);
  stroke(cx + 82, cy + 78, cx + 116, cy + 90, 3, GOLD);
}

// ------------------------------------------------------------------- page
function drawPage() {
  fillAll(PAPER);

  // Masthead band.
  rect(0, 0, W, 128, NAVY);
  drawCentred(22, "THE WORLD IN ONE DAY", 5, WHITE);
  drawCentred(84, "FRIDAY · 20 NOVEMBER 2026", 3, GOLD);
  rect(0, 128, W, 6, GOLD);

  // ---- Lead story -------------------------------------------------------
  drawCyclone(150, 268);
  drawText(300, 158, "INDIA · CYCLONE", 2, RED);
  drawText(300, 190, "CYCLONE AKVAN HITS INDIA", 4, NAVY);
  drawText(300, 226, "300,000 FLEE THE COAST", 4, NAVY);
  rect(300, 262, 120, 4, GOLD);
  drawBlock(
    300,
    282,
    "Landfall at Gopalpur in Odisha this morning, winds to 90 kmph; red alerts in two districts as rains lash the east coast.",
    2,
    660,
    5,
    INK
  );
  rect(36, 398, W - 72, 3, GOLD);

  // ---- Six story cards --------------------------------------------------
  const cards = [
    {
      kicker: "MARKETS",
      colour: RED,
      head: "NIKKEI -4.7% IN AI ROUT",
      body: "Tokyo and Seoul plunge; Asia heads for its worst week since 2020.",
    },
    {
      kicker: "USA",
      colour: NAVY,
      head: "TRUMP BRIEFS PRESS NOON",
      body: "White House news conference today; trade deals on agenda.",
    },
    {
      kicker: "EUROPE",
      colour: BLUE,
      head: "EU-UK SUMMIT IN BRUSSELS",
      body: "EU-UK summit today; youth scheme and food deal on the table.",
    },
    {
      kicker: "TAIWAN",
      colour: TEAL,
      head: "TAIPEI CURBS SHORTING",
      body: "New curbs take effect today after Taiex fell 4.4%.",
    },
    {
      kicker: "MIDDLE EAST",
      colour: AMBER,
      head: "HORMUZ ATTACKS GO ON",
      body: "Tanker mine strikes continue into Friday; two supertankers ablaze.",
    },
    {
      kicker: "JUSTICE",
      colour: PURPLE,
      head: "ROHINGYA RULING ECHOES",
      body: "A day after the verdict, survivors hail the world court ruling.",
    },
  ];
  const gridX = 36;
  const gridY = 420;
  const colW = 464;
  const colGap = 24;
  const rowH = 136;
  const rowGap = 14;
  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridX + col * (colW + colGap);
    const y = gridY + row * (rowH + rowGap);
    rect(x, y, colW, rowH, CARD);
    rect(x, y, colW, 3, card.colour);
    rect(x, y, 10, rowH, card.colour);
    drawText(x + 26, y + 16, card.kicker, 2, card.colour);
    drawText(x + 26, y + 44, card.head, 3, NAVY);
    drawBlock(x + 26, y + 76, card.body, 2, colW - 52, 5, GREY);
  });

  // ---- Also today strip -------------------------------------------------
  // Moved up 12 px: the two-line strip body previously ran into the
  // footer band and its second line was clipped.
  const stripY = 866;
  rect(36, stripY, W - 72, 2, GOLD);
  drawText(36, stripY + 16, "ALSO TODAY", 2, RED);
  drawBlock(
    36,
    stripY + 44,
    "Akvan rains lash Andhra, Odisha · Asia shares: worst week since 2020 · Rohingya survivors hail verdict",
    2,
    W - 72,
    5,
    INK
  );

  // ---- Footer band ------------------------------------------------------
  // Footer starts at y=960 (was 952) so the strip's second line clears it.
  rect(0, 960, W, H - 960, NAVY);
  drawCentred(982, "ONE DAY · ONE IMAGE · 20 NOVEMBER 2026", 3, GOLD);
}

// -------------------------------------------------------------------- main
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
drawPage();
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG());
