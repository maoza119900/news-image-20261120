// news-image-20261120 — draws a 1024x1024 newspaper front page for 20 Nov 2026.
// Plain functions over a flat RGB pixel buffer. Node 22 stdlib only.
// No network, no clock, no randomness: two runs write identical bytes.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: [number, number, number] = [246, 241, 231];
const CARD: [number, number, number] = [255, 252, 246];
const NAVY: [number, number, number] = [20, 33, 61];
const GOLD: [number, number, number] = [201, 162, 39];
const INK: [number, number, number] = [26, 26, 26];
const GREY: [number, number, number] = [88, 84, 76];
const RED: [number, number, number] = [172, 38, 32];
const TEAL: [number, number, number] = [12, 118, 110];
const BLUE: [number, number, number] = [32, 92, 158];
const PLUM: [number, number, number] = [108, 62, 152];
const LEAF: [number, number, number] = [46, 116, 62];
const RUST: [number, number, number] = [196, 104, 22];

// ---------------------------------------------------------------- pixels
const buf = new Uint8Array(W * H * 3);

function fillAll(c: [number, number, number]): void {
  for (let i = 0; i < W * H; i++) {
    buf[i * 3] = c[0];
    buf[i * 3 + 1] = c[1];
    buf[i * 3 + 2] = c[2];
  }
}

function dot(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function block(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    }
  }
}

function hbar(x: number, y: number, len: number, thick: number, c: [number, number, number]): void {
  block(x, y, len, thick, c);
}

// Circle outline by angular sweep; thick plotted as small squares.
function ring(cx: number, cy: number, r: number, c: [number, number, number]): void {
  const steps = 720;
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 2;
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    block(x - 1, y - 1, 3, 3, c);
  }
}

// Cyclone spiral: radius grows with angle over two and a half turns.
function spiral(cx: number, cy: number, c: [number, number, number]): void {
  const steps = 900;
  for (let s = 0; s < steps; s++) {
    const a = (s / steps) * Math.PI * 5;
    const r = 6 + (s / steps) * 84;
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    block(x - 1, y - 1, 3, 3, c);
  }
  block(cx - 5, cy - 5, 10, 10, RED);
}

// ------------------------------------------------------- bitmap type
// Each glyph is 7 characters. Character k of the string is one row of the
// 5-pixel glyph, packed as a base-32 digit (alphabet below), bit 4 = left
// column, bit 0 = right column. Space is "0000000".
const DIGITS = "0123456789abcdefghijklmnopqrstuv";
const GLYPHS: Record<string, string> = {
  "A": "ehhvhhh", "B": "uhhuhhu", "C": "ehggghe", "D": "uhhhhhu",
  "E": "vgguggv", "F": "vgguggg", "G": "ehgnhhf", "H": "hhhvhhh",
  "I": "e44444e", "J": "72222ic", "K": "hikokih", "L": "ggggggv",
  "M": "hrllhhh", "N": "hpljhhh", "O": "ehhhhhe", "P": "uhhuggg",
  "Q": "ehhhlid", "R": "uhhukih", "S": "fgge11u", "T": "v444444",
  "U": "hhhhhhe", "V": "hhhhha4", "W": "hhhllrh", "X": "hha4ahh",
  "Y": "hha4444", "Z": "v1248gv",
  "0": "ehjlphe", "1": "4c4444e", "2": "eh168gv", "3": "u11e11u",
  "4": "26aiv22", "5": "vgu11he", "6": "egguhhe", "7": "v124888",
  "8": "ehhehhe", "9": "ehhf11e",
  " ": "0000000", ".": "00000cc", ",": "0000c48", ":": "0cc0cc0",
  ";": "0cc0c48", "'": "4480000", "-": "000e000", "/": "122488g",
  "%": "pq248bj", "$": "4fke5u4", "(": "2488842", ")": "8422248",
  "&": "cik8lid", "!": "4444404", "?": "eh16404", "+": "044v440",
  "=": "00v0v00",
};

function glyphPixel(ch: string, col: number, row: number): boolean {
  const packed = GLYPHS[ch] ?? GLYPHS["?"];
  const v = DIGITS.indexOf(packed[row]);
  return ((v >> (4 - col)) & 1) === 1;
}

function drawGlyph(x: number, y: number, scale: number, c: [number, number, number], ch: string): void {
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (glyphPixel(ch, col, r)) {
        block(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function textW(s: string, scale: number): number {
  return s.length * 6 * scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  for (let i = 0; i < s.length; i++) {
    drawGlyph(x + i * 6 * scale, y, scale, c, s[i]);
  }
}

function drawCentred(y: number, s: string, scale: number, c: [number, number, number]): void {
  drawText(Math.round((W - textW(s, scale)) / 2), y, s, scale, c);
}

// Greedy word wrap; returns at most maxLines lines.
function wrap(s: string, maxW: number, scale: number, maxLines: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textW(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines.slice(0, maxLines);
}

// ------------------------------------------------------------------ PNG
function crcTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const CRC_T = crcTable();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_T[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(kind: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(kind, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  const crcIn = Buffer.concat([Buffer.from(kind, "ascii"), Buffer.from(data)]);
  out.writeUInt32BE(crc32(crcIn), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const end = pngChunk("IEND", new Uint8Array(0));
  return Buffer.concat([header, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), end]);
}

// ------------------------------------------------------------- content
type Story = {
  accent: [number, number, number];
  kicker: string;
  headline: string;
  summary: string;
};

const STORIES: Story[] = [
  {
    accent: RED,
    kicker: "MARKETS",
    headline: "NIKKEI -4.7% IN AI ROUT",
    summary: "TOKYO AND SEOUL PLUNGE; ASIA HEADS FOR ITS WORST WEEK SINCE 2020.",
  },
  {
    accent: BLUE,
    kicker: "USA",
    headline: "TRUMP BRIEFS PRESS NOON",
    summary: "WHITE HOUSE NEWS CONFERENCE TODAY; TRADE DEALS ON AGENDA.",
  },
  {
    accent: TEAL,
    kicker: "EUROPE",
    headline: "EU-UK SUMMIT IN BRUSSELS",
    summary: "EU-UK SUMMIT TODAY; YOUTH SCHEME AND FOOD DEAL ON THE TABLE.",
  },
  {
    accent: PLUM,
    kicker: "TAIWAN",
    headline: "TAIPEI CURBS SHORTING",
    summary: "NEW CURBS TAKE EFFECT TODAY AFTER TAIEX FELL 4.4%.",
  },
  {
    accent: RUST,
    kicker: "MIDDLE EAST",
    headline: "HORMUZ ATTACKS GO ON",
    summary: "TANKER MINE STRIKES CONTINUE INTO FRIDAY; TWO SUPERTANKERS ABLAZE.",
  },
  {
    accent: LEAF,
    kicker: "JUSTICE",
    headline: "ROHINGYA RULING ECHOES",
    summary: "A DAY AFTER THE VERDICT, SURVIVORS HAIL THE WORLD COURT RULING.",
  },
];

const STRIP_ITEMS: string[] = [
  "AKVAN RAINS LASH ANDHRA, ODISHA",
  "ASIA SHARES: WORST WEEK SINCE 2020",
  "ROHINGYA SURVIVORS HAIL VERDICT",
];

// -------------------------------------------------------------- paint
function paintMasthead(): void {
  block(0, 0, W, 148, NAVY);
  hbar(0, 148, W, 4, GOLD);
  drawCentred(26, "THE WORLD IN ONE DAY", 5, PAPER);
  drawCentred(100, "FRIDAY - 20 NOVEMBER 2026", 3, GOLD);
}

function paintCyclone(cx: number, cy: number): void {
  ring(cx, cy, 96, NAVY);
  ring(cx, cy, 90, GOLD);
  spiral(cx, cy, TEAL);
}

function paintLead(): void {
  const y0 = 164;
  drawText(36, y0, "INDIA - CYCLONE", 2, RUST);
  drawText(36, y0 + 30, "CYCLONE AKVAN HITS INDIA", 4, NAVY);
  drawText(36, y0 + 62, "300,000 FLEE THE COAST", 4, NAVY);
  hbar(36, y0 + 100, 220, 4, GOLD);
  const lines = wrap(
    "LANDFALL AT GOPALPUR IN ODISHA THIS MORNING, WINDS TO 90 KMPH; RED ALERTS IN TWO DISTRICTS AS RAINS LASH THE EAST COAST.",
    640,
    3,
    4,
  );
  lines.forEach((ln, i) => drawText(36, y0 + 122 + i * 27, ln, 3, INK));
  paintCyclone(862, 288);
}

function paintCard(x: number, y: number, w: number, h: number, s: Story): void {
  block(x, y, w, h, CARD);
  block(x, y, w, 2, GOLD);
  block(x, y, 10, h, s.accent);
  drawText(x + 24, y + 14, s.kicker, 2, s.accent);
  const head = wrap(s.headline, w - 48, 3, 2);
  head.forEach((ln, i) => drawText(x + 24, y + 42 + i * 26, ln, 3, NAVY));
  const body = wrap(s.summary, w - 48, 2, 2);
  body.forEach((ln, i) => drawText(x + 24, y + 98 + i * 18, ln, 2, GREY));
}

function paintGrid(): void {
  const cw = 476;
  const ch = 136;
  const gap = 12;
  const x0 = 24;
  const y0 = 424;
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    paintCard(x0 + col * (cw + gap), y0 + row * (ch + gap), cw, ch, STORIES[i]);
  }
}

function paintStrip(): void {
  const y0 = 872;
  block(0, y0, W, 80, NAVY);
  drawText(36, y0 + 12, "ALSO TODAY", 2, GOLD);
  // Flow the three items as whole units: a gold square separates items,
  // and a separator never lands at the start of a wrapped line.
  const scale = 2;
  const lineH = 19;
  const left = 36;
  const right = W - 36;
  let cx = left;
  let cy = y0 + 38;
  let firstOnLine = true;
  for (const item of STRIP_ITEMS) {
    const iw = textW(item, scale);
    if (!firstOnLine && cx + 22 + iw > right) {
      cx = left;
      cy += lineH;
      firstOnLine = true;
    }
    if (!firstOnLine) {
      block(cx + 2, cy + 3, 8, 8, GOLD);
      cx += 22;
    }
    drawText(cx, cy, item, scale, PAPER);
    cx += iw;
    firstOnLine = false;
  }
}

function paintFooter(): void {
  hbar(0, 966, W, 3, GOLD);
  drawCentred(984, "ONE DAY - ONE IMAGE - 20 NOVEMBER 2026", 2, NAVY);
}

function main(): void {
  fillAll(PAPER);
  paintMasthead();
  paintLead();
  paintGrid();
  paintStrip();
  paintFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePng());
}

main();
