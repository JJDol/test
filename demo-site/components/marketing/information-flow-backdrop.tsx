"use client";

import { IBM_Plex_Mono, Work_Sans } from "next/font/google";
import { forwardRef, useEffect, useRef, useState, type MouseEvent } from "react";

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
  bg: "#2134c4",
  base: "#e9e9e9",
  doc: "#ff6a4d",
  role: "#9a9a9a",
  ext: "#5b8dd9",
  ok: "#4cae7a",
} as const;

type HeroParams = {
  bgColor: string;
  bgOpacity: number;
  inkColor: string;
  wordColor: string;
  wordText: string;
  wordCount: number;
  wordSize: number;
  parallax: number;
  depth: number;
  speed: number;
  textScale: number;
  weight: number;
  lineSpacing: number;
  tableRate: number;
  imageRate: number;
  lineOpacity: number;
  glide: number;
  threadRate: number;
  interference: number;
  showTables: boolean;
  showImageField: boolean;
};

const DEFAULT_HERO: HeroParams = {
  bgColor: "#7697e5",
  bgOpacity: 0.28,
  inkColor: "#e9e9e9",
  wordColor: "#e9e9e9",
  wordText: "Less Fragmented, More Connected",
  wordCount: 4,
  wordSize: 220,
  parallax: 1,
  depth: 0.35,
  speed: 2.9,
  textScale: 0.75,
  weight: 400,
  lineSpacing: 0.4,
  tableRate: 1.1,
  imageRate: 0,
  lineOpacity: 1.1,
  glide: 0,
  threadRate: 1,
  interference: 1,
  showTables: true,
  showImageField: false,
};

const SOURCE_W = 1920;
const SOURCE_H = 1080;
const SLOTS = 5;
const LOOP_COLS = 10;

function fmt(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

const EDGE_PCT = 1.5;

type WordId = `w${number}`;
type HeroWordSpec = { id: WordId; text: string; locked: boolean };
type Positions = Partial<Record<WordId, { x: number; y: number }>>;

const DEFAULT_POSITIONS: Positions = {
  w1: { x: 4, y: 50 },
  w2: { x: 4, y: 75 },
  w3: { x: 62, y: 56 },
  w4: { x: 3, y: 76 },
  w5: { x: 46, y: 6 },
  w6: { x: 66, y: 26 },
  w7: { x: 14, y: 54 },
  w8: { x: 40, y: 72 },
  w9: { x: 70, y: 78 },
  w10: { x: 26, y: 90 },
};

function getHeroWords(ui: HeroParams): HeroWordSpec[] {
  const words = ui.wordText
    .split(/[,\n]/)
    .map((word) => word.trim())
    .filter(Boolean);
  const count = Math.max(0, Math.min(words.length, Math.round(ui.wordCount)));
  return words.slice(0, count).map((text, index) => ({
    id: `w${index + 1}` as WordId,
    text,
    locked: false,
  }));
}

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
  _itf = DEFAULT_HERO.interference;
  _itfT = 0;
  params: HeroParams = { ...DEFAULT_HERO };
  _cacheKey = "";

  ink() {
    return this.params.inkColor;
  }

  bg() {
    return this.params.bgColor;
  }

  wt(base: number) {
    const step = Math.round(this.params.weight / 100) * 100 - 400;
    return Math.max(300, Math.min(700, base + step));
  }

  syncFrom(params: HeroParams) {
    this.params = params;
    const key = [
      params.textScale,
      params.lineSpacing,
      params.tableRate,
      params.imageRate,
      params.threadRate,
      params.weight,
      params.inkColor,
      params.bgColor,
      params.showImageField,
    ].join("|");
    if (key === this._cacheKey) return;
    this._cacheKey = key;
    this.colCache.clear();
    this.links.clear();
    this.buildAtmos();
  }

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
        color: this.ink(),
      });
    }

    this.fields = [0, 1].map((k) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, this.W);
      c.height = Math.max(1, this.H);
      const g = c.getContext("2d");
      if (!g) return { canvas: c, dx: k ? -1 : 1, dy: k ? 0.6 : -0.8, ph: k * 0.5 };
      g.filter = "blur(70px)";
      const cols = [this.ink()];
      for (let i = 0; i < 9; i++) {
        const cx = R() * this.W;
        const cy = R() * this.H;
        const rw = 150 + R() * 460;
        const rh = 100 + R() * 320;
        const col = cols[Math.floor(R() * cols.length)];
        const grd = g.createLinearGradient(cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2);
        grd.addColorStop(0, col);
        grd.addColorStop(1, this.bg());
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
      g.fillStyle = this.ink();
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
      const tRate = 0.08 * this.params.tableRate;
      const iRate = 0.07 * this.params.imageRate;
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
        const fs = (g.filler ? 10 + R() * 1.5 : 10.5 + R() * 3.5) * this.params.textScale;
        const lh = fs * (1.15 + 0.45 * this.params.lineSpacing);
        ctx.font = `${this.wt(400)} ${fs}px ${family}`;
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
          ? placed.lh * (0.5 + R() * 1.9) * this.params.lineSpacing
          : (16 + R() * 26) * this.params.lineSpacing);
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
      if (span === 2 && R() > 0.22 * this.params.threadRate) continue;
      const filler = src.kind === "text" && src.filler;
      if (span === 1 && R() > Math.min(1, (filler ? 0.6 : 1) * this.params.threadRate)) continue;
      const fan =
        Math.max(1, Math.floor(this.params.threadRate) + (R() < this.params.threadRate % 1 ? 1 : 0));
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
      out.push({
        pts,
        cum,
        len,
        y1,
        y2,
        dstW: dst.w,
        appearAt: (src.cStart + src.cLen) / Math.max(1, newer.chars),
        color: this.ink(),
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
      ctx.font = `${this.wt(b.filler ? 300 : 400)} ${b.fs}px ${family}`;
      ctx.fillStyle = this.ink();
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
          ctx.fillStyle = this.ink();
          ctx.fillText(txt, x + dx - split, ly);
          ctx.fillStyle = this.ink();
          ctx.fillText(txt, x + dx + split, ly);
          const drop = burst > 0.02 && ((seed | 0) % 5 === 0);
          ctx.globalAlpha = b.maxA * alpha * (drop ? 0.18 : 1);
          ctx.fillStyle = this.ink();
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
      ctx.strokeStyle = this.ink();
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
      ctx.fillStyle = this.ink();
      ctx.font = `${this.wt(300)} 8.5px ${family}`;
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
    grd.addColorStop(0, this.ink());
    grd.addColorStop(1, this.bg());
    ctx.globalAlpha = 0.2 * b.maxA * alpha;
    ctx.fillStyle = grd;
    ctx.fillRect(x, b.y, b.w, h);
    ctx.globalAlpha = 0.06 * alpha;
    ctx.fillStyle = this.ink();
    for (let yy = 0; yy < h; yy += 5) ctx.fillRect(x, b.y + yy, b.w, 1.2);
    ctx.globalAlpha = b.maxA * alpha * 0.55;
    ctx.strokeStyle = this.ink();
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 0.5, b.y + 0.5, b.w - 1, h - 1);
    if (f > 0.85) {
      ctx.globalAlpha = b.maxA * alpha * 0.8;
      ctx.fillStyle = this.ink();
      ctx.font = `${this.wt(300)} 8.5px ${family}`;
      ctx.fillText(b.cap, x + 3, b.y + b.h + 4);
    }
  }

  paint(ctx: CanvasRenderingContext2D, tGlobal: number, reduced: boolean, nowMs: number) {
    ctx.clearRect(0, 0, this.W, this.H);
    this._itf = reduced ? 0 : this.params.interference;
    this._itfT = nowMs / 1000;
    const ink = this.ink();
    const lo = this.params.lineOpacity;

    const typeFrac = 0.78;
    const k = reduced ? 4 : Math.floor(tGlobal);
    const frac = reduced ? typeFrac : tGlobal - Math.floor(tGlobal);
    const staged = reduced || frac < typeFrac ? 0 : ease((frac - typeFrac) / (1 - typeFrac));
    const shift = staged + (frac - staged) * this.params.glide;
    const loopT = (tGlobal / LOOP_COLS) % 1;

    if (this.params.showImageField) {
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

    if (this.params.showTables) {
      for (const tb of this.tables) {
        const u = (loopT + tb.phase) % 1;
        ctx.globalAlpha = tb.a * (0.5 + 0.5 * Math.sin(2 * Math.PI * u));
        ctx.strokeStyle = ink;
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
          ctx.globalAlpha = l.a * a0 * lo;
          ctx.strokeStyle = ink;
          this.drawThread(ctx, l, x1, l.y1, p);
          ctx.globalAlpha = Math.min(1, l.a * a0 * lo * 2.4);
          ctx.fillStyle = ink;
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
  const photoRef = useRef<HTMLImageElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);
  const backWordsRef = useRef<HTMLDivElement>(null);
  const frontWordsRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Positions>({ ...DEFAULT_POSITIONS });
  const [ui, setUi] = useState<HeroParams>({ ...DEFAULT_HERO });
  const [panelOpen, setPanelOpen] = useState(false);
  const posRef = useRef(pos);
  const uiRef = useRef(ui);
  posRef.current = pos;
  uiRef.current = ui;
  const words = getHeroWords(ui);

  const startDrag = (id: WordId, event: MouseEvent<HTMLDivElement>) => {
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
      const params = uiRef.current;
      engine.syncFrom(params);
      const cycle = 5200 / Math.max(0.3, params.speed);
      const sy = window.scrollY || 0;
      const px = params.parallax;
      const vh = window.innerHeight || 1;
      const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
      const bgFade = clamp01(sy / (vh * 0.95));
      const inkFade = clamp01((sy - vh * 0.65) / (vh * 0.3));
      const move = (el: HTMLElement | null, k: number) => {
        if (el) el.style.transform = `translate3d(0, ${-sy * k * px}px, 0)`;
      };
      move(backWordsRef.current, 0.42);
      move(frontWordsRef.current, 0.42);
      move(canvas, 0.14);
      if (photoRef.current) photoRef.current.style.opacity = String(1 - bgFade);
      if (creamRef.current) creamRef.current.style.opacity = String(bgFade);
      if (scrimRef.current) {
        scrimRef.current.style.background = params.bgColor;
        scrimRef.current.style.opacity = String(params.bgOpacity * (1 - bgFade));
      }
      canvas.style.opacity = String(1 - inkFade);
      if (backWordsRef.current) backWordsRef.current.style.opacity = String(1 - inkFade);
      if (frontWordsRef.current) frontWordsRef.current.style.opacity = String(1 - inkFade);
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
      if (reduced) {
        engine.syncFrom(uiRef.current);
        engine.paint(ctx, 4, true, 0);
      }
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
      className={`${plexMono.className} pointer-events-none absolute inset-0 overflow-hidden bg-[#F5F2EB] [container-type:inline-size]`}
    >
      <div
        ref={creamRef}
        className="pointer-events-none absolute inset-0 z-0 bg-[#F5F2EB] opacity-0"
      />
      <img
        ref={photoRef}
        src="/images/marketing/hero-site.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
      />
      <div
        ref={scrimRef}
        className="absolute inset-0 z-[1]"
        style={{ background: ui.bgColor, opacity: ui.bgOpacity }}
      />
      <HeroWords
        ref={backWordsRef}
        layer="back"
        words={words}
        pos={pos}
        wordColor={ui.wordColor}
        wordSize={ui.wordSize}
        depth={ui.depth}
        onDragStart={startDrag}
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[3] h-full w-full object-cover"
      />
      <HeroWords
        ref={frontWordsRef}
        layer="front"
        words={words}
        pos={pos}
        wordColor={ui.wordColor}
        wordSize={ui.wordSize}
        depth={ui.depth}
        onDragStart={startDrag}
      />
      <HeroControls ui={ui} setUi={setUi} open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} />
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

function wordChars(id: string, text: string, depth: number) {
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
    back: n > 0 && rank[i] / n < depth,
  }));
}

const HeroWords = forwardRef<
  HTMLDivElement,
  {
    layer: "back" | "front";
    words: HeroWordSpec[];
    pos: Positions;
    wordColor: string;
    wordSize: number;
    depth: number;
    onDragStart: (id: WordId, event: MouseEvent<HTMLDivElement>) => void;
  }
>(function HeroWords({ layer, words, pos, wordColor, wordSize, depth, onDragStart }, ref) {
  const wordStyle = {
    font: `500 ${wordSize / 19.2}cqw/0.92 ${workSans.style.fontFamily}, sans-serif`,
    letterSpacing: "-0.03em",
    color: wordColor,
  } as const;

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${layer === "back" ? "z-[2]" : "z-[4]"} ${workSans.className}`}
    >
      {words.map((word) => {
        const place = pos[word.id] ?? DEFAULT_POSITIONS[word.id] ?? { x: 10, y: 10 };
        return (
          <HeroWord
            key={`${layer}-free-${word.id}`}
            word={word}
            layer={layer}
            style={wordStyle}
            depth={depth}
            onDragStart={onDragStart}
            place={place}
          />
        );
      })}
    </div>
  );
});

function HeroWord({
  word,
  layer,
  style,
  depth,
  onDragStart,
  place,
}: {
  word: HeroWordSpec;
  layer: "back" | "front";
  style: { font: string; letterSpacing: string; color: string };
  depth: number;
  onDragStart: (id: WordId, event: MouseEvent<HTMLDivElement>) => void;
  place?: { x: number; y: number };
}) {
  const chars = wordChars(word.id, word.text, depth);
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

function HeroControls({
  ui,
  setUi,
  open,
  onToggle,
}: {
  ui: HeroParams;
  setUi: (update: HeroParams | ((prev: HeroParams) => HeroParams)) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const setNum =
    (name: keyof HeroParams) => (event: { target: { value: string } }) => {
      setUi({ ...ui, [name]: parseFloat(event.target.value) });
    };
  const setColor =
    (name: "bgColor" | "inkColor" | "wordColor") =>
    (event: { target: { value: string } }) => {
      setUi({ ...ui, [name]: event.target.value });
    };
  const setText =
    (name: "wordText") => (event: { target: { value: string } }) => {
      setUi({ ...ui, [name]: event.target.value });
    };

  const row = "flex items-center gap-2 text-[10px] font-light tracking-[0.06em] text-white/80";
  const swatch =
    "h-[22px] w-[34px] cursor-pointer border border-white/25 bg-transparent p-0";
  const slider = "w-[118px] bg-transparent";
  const hex = "w-[66px] uppercase text-[#e9e9e9]";
  const val = "w-[30px] text-right text-[#e9e9e9]";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[72px] z-30 flex flex-col items-start gap-2 p-3.5 md:p-[14px_18px]">
      <button
        type="button"
        onClick={onToggle}
        className="pointer-events-auto border border-white/20 bg-black/70 px-[9px] py-1.5 text-[10px] font-normal uppercase tracking-[0.08em] text-[#e9e9e9]"
      >
        {open ? "controls −" : "controls +"}
      </button>
      {open ? (
        <div className="pointer-events-auto flex max-w-[620px] flex-wrap items-center gap-x-[22px] gap-y-2 border border-white/15 bg-black/70 px-3.5 py-2.5">
          <label className={row}>
            <span className="w-[88px]">background</span>
            <input type="color" value={ui.bgColor} onChange={setColor("bgColor")} className={swatch} />
            <span className={hex}>{ui.bgColor}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">bg opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={ui.bgOpacity}
              onChange={setNum("bgOpacity")}
              className={slider}
              style={{ accentColor: "#5b8dd9" }}
            />
            <span className={val}>{fmt(ui.bgOpacity)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">text / threads</span>
            <input type="color" value={ui.inkColor} onChange={setColor("inkColor")} className={swatch} />
            <span className={hex}>{ui.inkColor}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">word color</span>
            <input type="color" value={ui.wordColor} onChange={setColor("wordColor")} className={swatch} />
            <span className={hex}>{ui.wordColor}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">large text</span>
            <input
              type="text"
              placeholder="Project, Knowledge, Made"
              value={ui.wordText}
              onChange={setText("wordText")}
              className="w-[258px] border border-white/20 bg-white/[0.06] px-[7px] py-[5px] text-[10px] font-light tracking-[0.04em] text-[#e9e9e9]"
            />
          </label>
          <label className={row}>
            <span className="w-[88px]">word count</span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={ui.wordCount}
              onChange={setNum("wordCount")}
              className={slider}
              style={{ accentColor: "#e9e9e9" }}
            />
            <span className={val}>{String(ui.wordCount)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">word size</span>
            <input
              type="range"
              min={40}
              max={400}
              step={2}
              value={ui.wordSize}
              onChange={setNum("wordSize")}
              className={slider}
              style={{ accentColor: "#e9e9e9" }}
            />
            <span className={val}>{String(ui.wordSize)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">parallax</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={ui.parallax}
              onChange={setNum("parallax")}
              className={slider}
              style={{ accentColor: "#4cae7a" }}
            />
            <span className={val}>{fmt(ui.parallax)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">word depth</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={ui.depth}
              onChange={setNum("depth")}
              className={slider}
              style={{ accentColor: "#4cae7a" }}
            />
            <span className={val}>{fmt(ui.depth)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">speed</span>
            <input
              type="range"
              min={0.3}
              max={6}
              step={0.05}
              value={ui.speed}
              onChange={setNum("speed")}
              className={slider}
              style={{ accentColor: "#ff6a4d" }}
            />
            <span className={val}>{fmt(ui.speed)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">text size</span>
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.05}
              value={ui.textScale}
              onChange={setNum("textScale")}
              className={slider}
              style={{ accentColor: "#ff6a4d" }}
            />
            <span className={val}>{fmt(ui.textScale)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">weight</span>
            <input
              type="range"
              min={300}
              max={700}
              step={100}
              value={ui.weight}
              onChange={setNum("weight")}
              className={slider}
              style={{ accentColor: "#ff6a4d" }}
            />
            <span className={val}>{String(ui.weight)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">line spacing</span>
            <input
              type="range"
              min={0.4}
              max={2.2}
              step={0.05}
              value={ui.lineSpacing}
              onChange={setNum("lineSpacing")}
              className={slider}
              style={{ accentColor: "#ff6a4d" }}
            />
            <span className={val}>{fmt(ui.lineSpacing)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">tables</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={ui.tableRate}
              onChange={setNum("tableRate")}
              className={slider}
              style={{ accentColor: "#5b8dd9" }}
            />
            <span className={val}>{fmt(ui.tableRate)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">images</span>
            <input
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={ui.imageRate}
              onChange={setNum("imageRate")}
              className={slider}
              style={{ accentColor: "#4cae7a" }}
            />
            <span className={val}>{fmt(ui.imageRate)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">threads</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={ui.lineOpacity}
              onChange={setNum("lineOpacity")}
              className={slider}
              style={{ accentColor: "#ff6a4d" }}
            />
            <span className={val}>{fmt(ui.lineOpacity)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">glide</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={ui.glide}
              onChange={setNum("glide")}
              className={slider}
              style={{ accentColor: "#4cae7a" }}
            />
            <span className={val}>{fmt(ui.glide)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">thread count</span>
            <input
              type="range"
              min={0}
              max={6}
              step={0.05}
              value={ui.threadRate}
              onChange={setNum("threadRate")}
              className={slider}
              style={{ accentColor: "#ff6a4d" }}
            />
            <span className={val}>{fmt(ui.threadRate)}</span>
          </label>
          <label className={row}>
            <span className="w-[88px]">interference</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={ui.interference}
              onChange={setNum("interference")}
              className={slider}
              style={{ accentColor: "#4cae7a" }}
            />
            <span className={val}>{fmt(ui.interference)}</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUi({ ...ui, showTables: !ui.showTables })}
              className="border border-white/20 bg-transparent px-2 py-1.5 text-[10px] font-light tracking-[0.06em] text-white/80"
            >
              {ui.showTables ? "table field  ON" : "table field  OFF"}
            </button>
            <button
              type="button"
              onClick={() => setUi({ ...ui, showImageField: !ui.showImageField })}
              className="border border-white/20 bg-transparent px-2 py-1.5 text-[10px] font-light tracking-[0.06em] text-white/80"
            >
              {ui.showImageField ? "image field  ON" : "image field  OFF"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
