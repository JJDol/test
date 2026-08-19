"use client";

import { IBM_Plex_Mono, Work_Sans } from "next/font/google";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

const PAL = {
  bg: "#0f0f0f",
  base: "#e9e9e9",
  doc: "#ff6a4d",
  role: "#9a9a9a",
  ext: "#5b8dd9",
  ok: "#4cae7a",
} as const;

const SOURCE_W = 1920;
const SOURCE_H = 1080;
const SLOTS = 5;
const LOOP_COLS = 10;
const SPEED = 2.9;
const TEXT_SCALE = 0.75;
const LINE_SPACING = 0.4;
const TABLE_RATE = 1.1;
const IMAGE_RATE = 0.5;
const LINE_OPACITY = 1.1;
const INTERFERENCE = 1;
const SHOW_IMAGE_FIELD = false;
const THREAD_RATE = 1;
const WORD_DEPTH = 0.35;
const WORD_SIZE = 78;
const WORD_COLOR = "#a36aa5";

const HERO_LINES = [
  [{ id: "w1", text: "AutoDoc", locked: true }],
  [
    { id: "w2", text: "Knowledge", locked: false },
    { id: "w3", text: "Built", locked: false },
    { id: "w4", text: "Into", locked: false },
  ],
  [
    { id: "w5", text: "Every", locked: false },
    { id: "w6", text: "Document", locked: false },
  ],
] as const;

const HERO_WORDS = HERO_LINES.flat();

const EDGE_PCT = 1.5;

type WordId = (typeof HERO_WORDS)[number]["id"];
type Positions = Partial<Record<WordId, { x: number; y: number }>>;

type TextBlock = {
  kind: "text";
  lines: string[];
  fs: number;
  lh: number;
  cw: number;
  w: number;
  h: number;
  filler: boolean;
  tint: string;
  maxA: number;
  cLen: number;
  y: number;
  cStart: number;
};

type TableBlock = {
  kind: "table";
  cols: number;
  rows: number;
  cw: number;
  rh: number;
  w: number;
  h: number;
  tint: string;
  maxA: number;
  cLen: number;
  y: number;
  cStart: number;
};

type ImageBlock = {
  kind: "image";
  w: number;
  h: number;
  tint: string;
  maxA: number;
  cLen: number;
  cap: string;
  y: number;
  cStart: number;
};

type Block = TextBlock | TableBlock | ImageBlock;
type DraftBlock =
  | Omit<TextBlock, "y" | "cStart">
  | Omit<TableBlock, "y" | "cStart">
  | Omit<ImageBlock, "y" | "cStart">;

type Column = { blocks: Block[]; chars: number };

type Link = {
  pts: { x: number; y: number }[];
  cum: number[];
  len: number;
  y1: number;
  y2: number;
  dstW: number;
  appearAt: number;
  color: string;
  a: number;
};

type AtmosTable = {
  x: number;
  y: number;
  cols: number;
  rows: number;
  cw: number;
  rh: number;
  phase: number;
  a: number;
  color: string;
};

type ColorField = {
  canvas: HTMLCanvasElement;
  dx: number;
  dy: number;
  ph: number;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function corpus() {
  return [
    {
      w: 0.12,
      c: PAL.doc,
      items: [
        "AutoDoc_ProjectC40_A1_Konstruktionsgrundlag_001",
        "AutoDoc_ProjectC40_A2_StatiskeBeregninger_002",
        "Document_HOV-0302_SendtTilKS_Rev.A_008",
        "Drawing_ARK-001_Facadeopstalt_Rev.C_014",
        "Report_ST-0091_StatiskAnalyse_v2.3_018",
      ],
    },
    {
      w: 0.17,
      c: PAL.doc,
      items: [
        "A1_Konstruktionsgrundlag_001",
        "K1_Konstruktionstegning_003",
        "B4_Brandstrategi_016",
        "V1_VVSTegning_015",
        "T1_Tagkonstruktion_024",
      ],
    },
    {
      w: 0.1,
      c: PAL.role,
      items: [
        "Status_Deadline_22-03-2024_InProgress_002",
        "Progress_ProjectC40_75Percent_Complete_008",
      ],
    },
    { w: 0.08, c: PAL.ok, items: ["Approval_Document_A1_Godkendt_KRS_012"] },
    { w: 0.08, c: PAL.ext, items: ["Timestamp_14-06-2024_11:23:07_ModtagetFraKS_005"] },
    {
      w: 0.15,
      c: PAL.ext,
      items: [
        "§82-158_Brand_5",
        "§340-357_Konstruktioner_15",
        "§494-505_DokumentationAfBærendeKonstruktioner_28",
        "§523-528_KontrolAfDokumentationForOgUdførelseAfBærendeKonstruktionerOgBrandforhold_30",
      ],
    },
    {
      w: 0.2,
      c: PAL.base,
      filler: true,
      items: [
        "482_019_337_104_558_226_390_072_614_215847",
        "104_558_226_390_072_614_215_847_093_661204",
        "573_128_640_826_305_197_142_679_053_957284",
      ],
    },
  ];
}

function ease(u: number) {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function fontFamily() {
  return plexMono.style.fontFamily;
}

class FlowEngine {
  W = 0;
  H = 0;
  colW = 232;
  gutter = 120;
  startX = 0;
  pitch = 0;
  colCache = new Map<number, Column>();
  links = new Map<string, Link[]>();
  tables: AtmosTable[] = [];
  fields: ColorField[] = [];
  _itf = INTERFERENCE;
  _itfT = 0;

  layout(width: number, height: number) {
    this.W = width;
    this.H = height;
    this.colW = 232;
    this.gutter = 120;
    const total = SLOTS * this.colW + (SLOTS - 1) * this.gutter;
    this.startX = (this.W - total) / 2;
    this.pitch = this.colW + this.gutter;
    this.colCache.clear();
    this.links.clear();
    this.buildAtmos();
    if (!SHOW_IMAGE_FIELD) this.fields = [];
  }

  slotX(slot: number) {
    return this.startX + (SLOTS - slot) * this.pitch;
  }

  buildAtmos() {
    const R = rng(4242);
    this.tables = [];
    for (let i = 0; i < 7; i++) {
      this.tables.push({
        x: 50 + R() * Math.max(80, this.W - 320),
        y: 60 + R() * Math.max(80, this.H - 250),
        cols: 2 + Math.floor(R() * 4),
        rows: 2 + Math.floor(R() * 5),
        cw: 46 + R() * 70,
        rh: 15 + R() * 11,
        phase: R(),
        a: 0.028 + R() * 0.04,
        color: R() < 0.25 ? PAL.ext : PAL.base,
      });
    }

    this.fields = [0, 1].map((k) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, this.W);
      c.height = Math.max(1, this.H);
      const g = c.getContext("2d");
      if (!g) return { canvas: c, dx: k ? -1 : 1, dy: k ? 0.6 : -0.8, ph: k * 0.5 };
      g.filter = "blur(70px)";
      const cols = [PAL.doc, PAL.ext, PAL.ok, PAL.role];
      for (let i = 0; i < 9; i++) {
        const cx = R() * this.W;
        const cy = R() * this.H;
        const rw = 150 + R() * 460;
        const rh = 100 + R() * 320;
        const col = cols[Math.floor(R() * cols.length)];
        const grd = g.createLinearGradient(cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2);
        grd.addColorStop(0, col);
        grd.addColorStop(1, PAL.bg);
        g.fillStyle = grd;
        g.globalAlpha = 0.35 + R() * 0.5;
        if (R() < 0.45) {
          g.beginPath();
          g.ellipse(cx, cy, rw / 2, rh / 2, R() * Math.PI, 0, Math.PI * 2);
          g.fill();
        } else {
          g.fillRect(cx - rw / 2, cy - rh / 2, rw, rh);
        }
      }
      g.filter = "none";
      g.globalAlpha = 0.05;
      g.fillStyle = PAL.base;
      for (let y = 0; y < this.H; y += 6) g.fillRect(0, y, this.W, 1.4);
      return { canvas: c, dx: k ? -1 : 1, dy: k ? 0.6 : -0.8, ph: k * 0.5 };
    });
  }

  column(idx: number, ctx: CanvasRenderingContext2D) {
    const key = ((idx % LOOP_COLS) + LOOP_COLS) % LOOP_COLS;
    const cached = this.colCache.get(key);
    if (cached) return cached;

    const R = rng(7717 + key * 9973);
    const groups = corpus();
    const pick = () => {
      let r = R();
      let acc = 0;
      for (const g of groups) {
        acc += g.w;
        if (r <= acc) return g;
      }
      return groups[groups.length - 1];
    };

    const marginY = 68;
    const bottom = this.H - marginY;
    let y = marginY + R() * 36;
    const blocks: Block[] = [];
    let chars = 0;
    const family = fontFamily();

    while (y < bottom) {
      const roll = R();
      const tRate = 0.08 * TABLE_RATE;
      const iRate = 0.07 * IMAGE_RATE;
      let b: DraftBlock | null = null;

      if (roll < tRate) {
        const cols = 2 + Math.floor(R() * 3);
        const rows = 2 + Math.floor(R() * 4);
        const cw = (this.colW * (0.55 + R() * 0.45)) / cols;
        const rh = 13 + R() * 6;
        b = {
          kind: "table",
          cols,
          rows,
          cw,
          rh,
          w: cols * cw,
          h: rows * rh,
          tint: R() < 0.3 ? PAL.ext : PAL.base,
          maxA: 0.28 + R() * 0.3,
          cLen: 26 + Math.floor(R() * 20),
        };
      } else if (roll < tRate + iRate) {
        const w = this.colW * (0.5 + R() * 0.5);
        const h = 54 + R() * 74;
        const tints = [PAL.doc, PAL.ext, PAL.ok, PAL.role];
        b = {
          kind: "image",
          w,
          h,
          tint: tints[Math.floor(R() * tints.length)],
          maxA: 0.5 + R() * 0.4,
          cLen: 30 + Math.floor(R() * 24),
          cap: `IMG_${100 + Math.floor(R() * 890)}_frag`,
        };
      } else {
        const g = pick();
        const s = g.items[Math.floor(R() * g.items.length)];
        const fs = (g.filler ? 10 + R() * 1.5 : 10.5 + R() * 3.5) * TEXT_SCALE;
        const lh = fs * (1.15 + 0.45 * LINE_SPACING);
        ctx.font = `400 ${fs}px ${family}`;
        const cw = ctx.measureText("0").width || fs * 0.6;
        const maxChars = Math.max(10, Math.floor(this.colW / cw));
        const lines: string[] = [];
        for (let i = 0; i < s.length; i += maxChars) lines.push(s.slice(i, i + maxChars));
        let widest = 0;
        for (const ln of lines) widest = Math.max(widest, ln.length * cw);
        b = {
          kind: "text",
          lines,
          fs,
          lh,
          cw,
          w: Math.min(this.colW, widest),
          h: lines.length * lh,
          filler: !!g.filler,
          tint: g.c,
          maxA: g.filler ? 0.24 + R() * 0.26 : 0.45 + Math.pow(R(), 1.3) * 0.55,
          cLen: s.length,
        };
      }

      if (y + b.h > bottom) break;
      const placed = { ...b, y, cStart: chars } as Block;
      chars += placed.cLen;
      blocks.push(placed);
      y +=
        placed.h +
        (placed.kind === "text"
          ? placed.lh * (0.5 + R() * 1.9) * LINE_SPACING
          : (16 + R() * 26) * LINE_SPACING);
    }

    const col = { blocks, chars };
    this.colCache.set(key, col);
    return col;
  }

  buildLinks(newer: Column, older: Column, seed: number, span: number) {
    const R = rng(seed);
    const targets = older.blocks;
    const out: Link[] = [];
    if (!targets.length) return out;

    for (const src of newer.blocks) {
      if (span === 2 && R() > 0.22 * THREAD_RATE) continue;
      const filler = src.kind === "text" && src.filler;
      if (span === 1 && R() > Math.min(1, (filler ? 0.6 : 1) * THREAD_RATE)) continue;
      const fan = Math.max(1, Math.floor(THREAD_RATE) + (R() < THREAD_RATE % 1 ? 1 : 0));
      for (let fi = 0; fi < fan; fi++) {
      const dst = targets[Math.floor(R() * targets.length)];
      if (!dst) continue;
      const y1 = dst.y + (dst.kind === "text" ? dst.h - dst.lh * 0.5 : dst.h * 0.5);
      const y2 = src.y + (src.kind === "text" ? src.lh * 0.5 : src.h * 0.5);
      const dx = span * this.pitch - dst.w - 14;
      const dy = y2 - y1;
      const sag = (R() - 0.5) * Math.min(120, 40 + Math.abs(dy) * 0.35);
      const c1x = dx * (0.18 + R() * 0.22);
      const c2x = dx * (0.62 + R() * 0.22);
      const c1y = sag * 0.6;
      const c2y = dy + sag * 0.35;
      const pts: { x: number; y: number }[] = [];
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        pts.push({
          x: 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * dx,
          y: 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * dy,
        });
      }
      let len = 0;
      const cum = [0];
      for (let i = 1; i < pts.length; i++) {
        len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        cum.push(len);
      }
      const colored = R() < 0.38;
      out.push({
        pts,
        cum,
        len,
        y1,
        y2,
        dstW: dst.w,
        appearAt: (src.cStart + src.cLen) / Math.max(1, newer.chars),
        color: colored ? (R() < 0.5 ? src.tint : dst.tint) : PAL.base,
        a: (span === 1 ? 0.14 + R() * 0.2 : 0.08 + R() * 0.09) * (filler ? 0.55 : 1),
      });
      }
    }
    return out;
  }

  drawThread(ctx: CanvasRenderingContext2D, l: Link, x1: number, y1: number, p: number) {
    const want = l.len * p;
    ctx.beginPath();
    ctx.moveTo(x1 + l.pts[0].x, y1 + l.pts[0].y);
    for (let i = 1; i < l.pts.length; i++) {
      if (l.cum[i] <= want) {
        ctx.lineTo(x1 + l.pts[i].x, y1 + l.pts[i].y);
        continue;
      }
      const seg = l.cum[i] - l.cum[i - 1];
      const f = seg > 0 ? (want - l.cum[i - 1]) / seg : 0;
      ctx.lineTo(
        x1 + l.pts[i - 1].x + (l.pts[i].x - l.pts[i - 1].x) * f,
        y1 + l.pts[i - 1].y + (l.pts[i].y - l.pts[i - 1].y) * f,
      );
      break;
    }
    ctx.stroke();
  }

  drawBlock(ctx: CanvasRenderingContext2D, b: Block, x: number, alpha: number, shown: number) {
    const f = Math.max(0, Math.min(1, shown / b.cLen));
    if (f <= 0) return;
    const family = fontFamily();

    if (b.kind === "text") {
      const perLine = Math.max(1, b.lines[0].length);
      const chars = f * b.cLen;
      ctx.font = `${b.filler ? "300" : "400"} ${b.fs}px ${family}`;
      ctx.fillStyle = PAL.base;
      ctx.globalAlpha = b.maxA * alpha;
      for (let li = 0; li < b.lines.length; li++) {
        const from = li * perLine;
        if (chars <= from) break;
        const n = Math.min(b.lines[li].length, Math.floor(chars - from));
        if (n <= 0) break;
        const txt = b.lines[li].slice(0, n);
        const ly = b.y + li * b.lh;
        const itf = this._itf || 0;
        if (itf > 0) {
          const seed = b.y * 13.7 + li * 91.3 + b.fs * 7.1;
          const w1 = Math.sin(seed + this._itfT * 2.1);
          const w2 = Math.sin(seed * 1.7 + this._itfT * 5.3);
          const burst = Math.max(0, Math.sin(seed * 0.7 + this._itfT * 0.9) - (1 - itf * 0.95));
          const dx = (w1 * 2.2 + w2 * 1.1) * itf + burst * 26 * itf;
          const split = (0.6 + Math.abs(w2)) * 2.4 * itf;
          ctx.globalAlpha = b.maxA * alpha * 0.4 * Math.min(1, itf * 1.6);
          ctx.fillStyle = PAL.doc;
          ctx.fillText(txt, x + dx - split, ly);
          ctx.fillStyle = PAL.ext;
          ctx.fillText(txt, x + dx + split, ly);
          const drop = burst > 0.02 && ((seed | 0) % 5 === 0);
          ctx.globalAlpha = b.maxA * alpha * (drop ? 0.18 : 1);
          ctx.fillStyle = PAL.base;
          ctx.fillText(txt, x + dx, ly);
          ctx.globalAlpha = b.maxA * alpha;
        } else {
          ctx.fillText(txt, x, ly);
        }
        if (f < 1 && n < b.lines[li].length) {
          ctx.globalAlpha = 0.5 * alpha;
          ctx.fillRect(x + n * b.cw, b.y + li * b.lh + b.fs * 0.15, b.cw * 0.85, b.fs);
          ctx.globalAlpha = b.maxA * alpha;
        }
      }
      return;
    }

    if (b.kind === "table") {
      ctx.strokeStyle = b.tint;
      ctx.globalAlpha = b.maxA * alpha * 0.5;
      ctx.lineWidth = 0.8;
      const rows = Math.max(1, Math.ceil(b.rows * f));
      ctx.beginPath();
      for (let c = 0; c <= b.cols; c++) {
        ctx.moveTo(x + c * b.cw, b.y);
        ctx.lineTo(x + c * b.cw, b.y + rows * b.rh);
      }
      for (let r = 0; r <= rows; r++) {
        ctx.moveTo(x, b.y + r * b.rh);
        ctx.lineTo(x + b.w, b.y + r * b.rh);
      }
      ctx.stroke();
      ctx.globalAlpha = b.maxA * alpha * 0.8;
      ctx.fillStyle = PAL.base;
      ctx.font = `300 8.5px ${family}`;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillText(String(((r * 7 + c * 13) % 90) + 10), x + c * b.cw + 4, b.y + r * b.rh + b.rh * 0.28);
          }
        }
      }
      return;
    }

    const h = b.h * f;
    const grd = ctx.createLinearGradient(x, b.y, x + b.w, b.y + b.h);
    grd.addColorStop(0, b.tint);
    grd.addColorStop(1, PAL.bg);
    ctx.globalAlpha = 0.2 * b.maxA * alpha;
    ctx.fillStyle = grd;
    ctx.fillRect(x, b.y, b.w, h);
    ctx.globalAlpha = 0.06 * alpha;
    ctx.fillStyle = PAL.base;
    for (let yy = 0; yy < h; yy += 5) ctx.fillRect(x, b.y + yy, b.w, 1.2);
    ctx.globalAlpha = b.maxA * alpha * 0.55;
    ctx.strokeStyle = PAL.base;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 0.5, b.y + 0.5, b.w - 1, h - 1);
    if (f > 0.85) {
      ctx.globalAlpha = b.maxA * alpha * 0.8;
      ctx.fillStyle = PAL.base;
      ctx.font = `300 8.5px ${family}`;
      ctx.fillText(b.cap, x + 3, b.y + b.h + 4);
    }
  }

  paint(ctx: CanvasRenderingContext2D, tGlobal: number, reduced: boolean, nowMs: number) {
    ctx.clearRect(0, 0, this.W, this.H);
    this._itf = reduced ? 0 : INTERFERENCE;
    this._itfT = nowMs / 1000;

    const typeFrac = 0.78;
    const k = reduced ? 4 : Math.floor(tGlobal);
    const frac = reduced ? typeFrac : tGlobal - Math.floor(tGlobal);
    const shift = reduced || frac < typeFrac ? 0 : ease((frac - typeFrac) / (1 - typeFrac));
    const loopT = (tGlobal / LOOP_COLS) % 1;

    if (SHOW_IMAGE_FIELD) {
      for (const f of this.fields) {
        ctx.globalAlpha = 0.1 + 0.05 * Math.sin(2 * Math.PI * (loopT + f.ph));
        ctx.drawImage(
          f.canvas,
          Math.sin(2 * Math.PI * (loopT + f.ph)) * 26 * f.dx,
          Math.cos(2 * Math.PI * (loopT + f.ph)) * 18 * f.dy,
          this.W,
          this.H,
        );
      }
    }

    for (const tb of this.tables) {
      const u = (loopT + tb.phase) % 1;
      ctx.globalAlpha = tb.a * (0.5 + 0.5 * Math.sin(2 * Math.PI * u));
      ctx.strokeStyle = tb.color;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let c = 0; c <= tb.cols; c++) {
        ctx.moveTo(tb.x + c * tb.cw, tb.y);
        ctx.lineTo(tb.x + c * tb.cw, tb.y + tb.rows * tb.rh);
      }
      for (let r = 0; r <= tb.rows; r++) {
        ctx.moveTo(tb.x, tb.y + r * tb.rh);
        ctx.lineTo(tb.x + tb.cols * tb.cw, tb.y + r * tb.rh);
      }
      ctx.stroke();
    }

    const live = [];
    for (let i = k; i >= k - SLOTS; i--) {
      const col = this.column(i, ctx);
      const slot = 1 + (k - i) + shift;
      const typed = reduced || i < k ? 1 : Math.min(1, frac / typeFrac);
      let alpha = 1;
      if (slot > SLOTS) alpha = Math.max(0, 1 - (slot - SLOTS));
      live.push({ i, col, slot, x: this.slotX(slot), typed, alpha });
    }

    ctx.lineWidth = 0.9;
    ctx.lineJoin = "round";
    for (let span = 2; span >= 1; span--) {
      for (let n = 0; n + span < live.length; n++) {
        const newer = live[n];
        const older = live[n + span];
        const key = `${span}:${((newer.i % LOOP_COLS) + LOOP_COLS) % LOOP_COLS}`;
        let links = this.links.get(key);
        if (!links) {
          links = this.buildLinks(
            newer.col,
            older.col,
            31337 + span * 4241 + (((newer.i % LOOP_COLS) + LOOP_COLS) % LOOP_COLS) * 7717,
            span,
          );
          this.links.set(key, links);
        }
        const a0 = Math.min(newer.alpha, older.alpha);
        if (a0 <= 0) continue;
        for (const l of links) {
          const p = Math.max(0, Math.min(1, (newer.typed - l.appearAt) / 0.14));
          if (p <= 0) continue;
          const x1 = older.x + l.dstW + 7;
          ctx.globalAlpha = l.a * a0 * LINE_OPACITY;
          ctx.strokeStyle = l.color;
          this.drawThread(ctx, l, x1, l.y1, p);
          ctx.globalAlpha = Math.min(1, l.a * a0 * LINE_OPACITY * 2.4);
          ctx.fillStyle = l.color;
          ctx.fillRect(x1 - 1.5, l.y1 - 1.5, 3, 3);
          if (p >= 1) ctx.fillRect(newer.x - 8.5, l.y2 - 1.5, 3, 3);
        }
      }
    }

    ctx.textBaseline = "top";
    for (const c of live) {
      if (c.alpha <= 0) continue;
      const revealed = c.typed * c.col.chars;
      for (const b of c.col.blocks) {
        if (b.cStart > revealed) break;
        this.drawBlock(ctx, b, c.x, c.alpha, revealed - b.cStart);
      }
    }
    ctx.globalAlpha = 1;
  }
}

export function InformationFlowBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Positions>({});
  const posRef = useRef(pos);
  posRef.current = pos;

  const startDrag = (id: WordId, event: MouseEvent<HTMLDivElement>) => {
    const word = HERO_WORDS.find((item) => item.id === id);
    if (!word || word.locked) return;
    event.preventDefault();
    const host = wrapRef.current;
    if (!host) return;
    const el = event.currentTarget;
    const r0 = host.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const origin = posRef.current[id] ?? {
      x: ((box.left - r0.left) / r0.width) * 100,
      y: ((box.top - r0.top) / r0.height) * 100,
    };
    const ox = event.clientX - r0.left - (origin.x / 100) * r0.width;
    const oy = event.clientY - r0.top - (origin.y / 100) * r0.height;
    setPos((prev) => ({ ...prev, [id]: origin }));

    const onMove = (ev: globalThis.MouseEvent) => {
      const r = host.getBoundingClientRect();
      const x = ((ev.clientX - r.left - ox) / r.width) * 100;
      const y = ((ev.clientY - r.top - oy) / r.height) * 100;
      setPos((prev) => ({
        ...prev,
        [id]: clampWord(el, r, x, y),
      }));
    };

    const up = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", up);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const engine = new FlowEngine();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t0 = 0;
    let running = true;

    const sizeCanvas = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = SOURCE_W * dpr;
      canvas.height = SOURCE_H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.layout(SOURCE_W, SOURCE_H);
    };

    const frame = (now: number) => {
      if (!running) return;
      if (!t0) t0 = now;
      const cycle = 5200 / SPEED;
      engine.paint(ctx, (now - t0) / cycle, reduced, now - t0);
      if (!reduced) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      sizeCanvas();
      cancelAnimationFrame(raf);
      t0 = 0;
      raf = requestAnimationFrame(frame);
    };

    start();
    document.fonts?.ready.then(() => {
      if (!running) return;
      engine.colCache.clear();
      engine.links.clear();
      start();
    });

    const ro = new ResizeObserver(() => {
      if (reduced) engine.paint(ctx, 4, true, 0);
    });
    ro.observe(wrap);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={`${plexMono.className} pointer-events-none absolute inset-0 overflow-hidden bg-[#0f0f0f] [container-type:inline-size]`}
    >
      <HeroWords layer="back" pos={pos} onDragStart={startDrag} />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover"
      />
      <HeroWords layer="front" pos={pos} onDragStart={startDrag} />
    </div>
  );
}

function clampWord(
  el: HTMLElement,
  host: DOMRect,
  xPct: number,
  yPct: number,
) {
  const widthPct = host.width > 0 ? (el.offsetWidth / host.width) * 100 : 0;
  const heightPct = host.height > 0 ? (el.offsetHeight / host.height) * 100 : 0;
  const maxX = Math.max(EDGE_PCT, 100 - widthPct - EDGE_PCT);
  const maxY = Math.max(EDGE_PCT, 100 - heightPct - EDGE_PCT);
  return {
    x: Math.min(maxX, Math.max(EDGE_PCT, xPct)),
    y: Math.min(maxY, Math.max(EDGE_PCT, yPct)),
  };
}

function wordChars(id: string, text: string) {
  const n = text.length;
  const order = Array.from({ length: n }, (_, i) => i);
  let a = (id.charCodeAt(1) * 2654435761) >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  const rank = new Array<number>(n);
  for (let k = 0; k < n; k++) rank[order[k]] = k;
  return [...text].map((c, i) => ({
    c,
    back: n > 0 && rank[i] / n < WORD_DEPTH,
  }));
}

function HeroWords({
  layer,
  pos,
  onDragStart,
}: {
  layer: "back" | "front";
  pos: Positions;
  onDragStart: (id: WordId, event: MouseEvent<HTMLDivElement>) => void;
}) {
  const wordStyle = {
    font: `500 ${WORD_SIZE / 19.2}cqw/0.95 ${workSans.style.fontFamily}, sans-serif`,
    letterSpacing: "-0.03em",
    color: WORD_COLOR,
  } as const;

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${layer === "back" ? "z-[1]" : "z-[3]"} ${workSans.className}`}
    >
      <div
        className="absolute inset-x-0 top-[18%] mx-auto flex w-full max-w-6xl flex-col items-start px-4 md:px-6"
        style={{ ...wordStyle, gap: "0.14em" }}
      >
        {HERO_LINES.map((line, lineIdx) => (
          <div
            key={lineIdx}
            className="flex items-baseline justify-start"
            style={{
              ...wordStyle,
              gap: "0.32em",
            }}
          >
            {line.map((word) => {
              if (pos[word.id]) return null;
              return (
                <HeroWord
                  key={`${layer}-${word.id}`}
                  word={word}
                  layer={layer}
                  style={wordStyle}
                  onDragStart={onDragStart}
                />
              );
            })}
          </div>
        ))}
      </div>
      {HERO_WORDS.map((word) => {
        const place = pos[word.id];
        if (!place) return null;
        return (
          <HeroWord
            key={`${layer}-free-${word.id}`}
            word={word}
            layer={layer}
            style={wordStyle}
            onDragStart={onDragStart}
            place={place}
          />
        );
      })}
    </div>
  );
}

function HeroWord({
  word,
  layer,
  style,
  onDragStart,
  place,
}: {
  word: (typeof HERO_WORDS)[number];
  layer: "back" | "front";
  style: { font: string; letterSpacing: string; color: string };
  onDragStart: (id: WordId, event: MouseEvent<HTMLDivElement>) => void;
  place?: { x: number; y: number };
}) {
  const chars = wordChars(word.id, word.text);
  return (
    <div
      className={`m-0 whitespace-pre select-none ${word.locked ? "cursor-default" : "cursor-move"} ${
        place ? "absolute" : "relative"
      }`}
      style={{
        ...style,
        left: place ? `${place.x}%` : undefined,
        top: place ? `${place.y}%` : undefined,
        pointerEvents: word.locked ? "none" : "auto",
      }}
      onMouseDown={word.locked ? undefined : (event) => onDragStart(word.id, event)}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            visibility: (layer === "back" ? ch.back : !ch.back) ? "visible" : "hidden",
          }}
        >
          {ch.c}
        </span>
      ))}
    </div>
  );
}
