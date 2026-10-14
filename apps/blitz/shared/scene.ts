// Painted photo-style backgrounds (dusk forests, city nights, golden hour...).
// Used whenever a slide has no photo, so every slide always has a scene behind
// the caption, even offline or without an image API key. Pure Canvas 2D, so it
// runs the same in the browser and in the server renderer (@napi-rs/canvas).

export type Mood = "dusk-forest" | "city-night" | "golden-hour" | "ocean" | "interior" | "mountains" | "court";

export const MOODS: Mood[] = ["dusk-forest", "city-night", "golden-hour", "ocean", "interior", "mountains", "court"];

/** Minimal slice of CanvasRenderingContext2D shared by DOM and @napi-rs/canvas. */
export interface Ctx2D {
  fillStyle: unknown;
  strokeStyle: unknown;
  globalAlpha: number;
  lineWidth: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  fill(): void;
  stroke(): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(o: number, c: string): void };
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(o: number, c: string): void };
}

const KEYWORDS: [RegExp, Mood][] = [
  [/court|basketball|sport|gym|run|track|soccer|skate/i, "court"],
  [/night|city|neon|street|urban|lights|drive|rooftop|red/i, "city-night"],
  [/beach|ocean|sea|surf|wave|summer|lake/i, "ocean"],
  [/desk|office|room|interior|cozy|coffee|bed|home|kitchen|journal|notebook|laptop|window|table/i, "interior"],
  [/mountain|hike|hiking|peak|snow|trail|adventure/i, "mountains"],
  [/golden|sunset|sunrise|sun|field|walk|morning|hills/i, "golden-hour"],
  [/forest|tree|park|nature|outdoor|dusk|camp|garden/i, "dusk-forest"],
];

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function moodFor(query: string, seed: string): Mood {
  for (const [re, mood] of KEYWORDS) if (re.test(query)) return mood;
  return MOODS[hashSeed(seed) % MOODS.length];
}

function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

function sky(ctx: Ctx2D, w: number, h: number, stops: string[]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Soft radial light. `rgb` is "r,g,b"; it fades to the same color at zero alpha (no grey ring). */
function glow(ctx: Ctx2D, x: number, y: number, r: number, rgb: string, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.5, `rgba(${rgb},0.35)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function ridge(ctx: Ctx2D, w: number, h: number, base: number, amp: number, color: string, r: Rand, jag = 6) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  let y = base - r() * amp;
  ctx.lineTo(0, y);
  const step = w / jag;
  for (let x = step; x <= w + step; x += step) {
    const ny = base - r() * amp;
    ctx.quadraticCurveTo(x - step / 2, Math.min(y, ny) - r() * amp * 0.6, x, ny);
    y = ny;
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function spruce(ctx: Ctx2D, x: number, groundY: number, height: number, width: number) {
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const top = groundY - height + (height * i) / tiers;
    const bottom = top + (height / tiers) * 1.9;
    const half = (width / 2) * ((i + 1.5) / tiers);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - half, bottom);
    ctx.lineTo(x + half, bottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x - width * 0.04, groundY - height * 0.1, width * 0.08, height * 0.12);
}

function treeLine(ctx: Ctx2D, w: number, groundY: number, color: string, r: Rand, minH: number, maxH: number, density: number) {
  ctx.fillStyle = color;
  let x = -20;
  while (x < w + 40) {
    const th = minH + r() * (maxH - minH);
    spruce(ctx, x, groundY + r() * 10, th, th * (0.32 + r() * 0.12));
    x += (w / density) * (0.4 + r() * 0.8);
  }
  ctx.fillRect(0, groundY, w, 2000);
}

function bokeh(ctx: Ctx2D, w: number, h: number, r: Rand, colors: string[], n: number, yMin = 0, yMax = 1) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = h * (yMin + r() * (yMax - yMin));
    const rad = w * (0.015 + r() * 0.05);
    glow(ctx, x, y, rad, colors[Math.floor(r() * colors.length)], 0.25 + r() * 0.45);
  }
}

function stars(ctx: Ctx2D, w: number, h: number, r: Rand, n: number) {
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.2 + r() * 0.7;
    const s = r() < 0.9 ? w * 0.002 : w * 0.004;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

function grainAndVignette(ctx: Ctx2D, w: number, h: number, r: Rand) {
  const n = Math.round((w * h) / 900);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.035 + r() * 0.05;
    ctx.fillStyle = r() < 0.5 ? "#000000" : "#ffffff";
    ctx.fillRect(r() * w, r() * h, w / 540, w / 540);
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

const PAINTERS: Record<Mood, (ctx: Ctx2D, w: number, h: number, r: Rand) => void> = {
  "dusk-forest": (ctx, w, h, r) => {
    sky(ctx, w, h, ["#6f86c6", "#a99bd0", "#e7a9c0", "#f6c6b0"]);
    glow(ctx, w * (0.3 + r() * 0.4), h * 0.55, w * 0.7, "255,214,190", 0.6);
    ridge(ctx, w, h, h * 0.62, h * 0.05, "#5a5a86", r, 5);
    treeLine(ctx, w, h * 0.7, "#2d3a3a", r, h * 0.12, h * 0.26, 9);
    treeLine(ctx, w, h * 0.78, "#16211f", r, h * 0.2, h * 0.42, 6);
  },
  "city-night": (ctx, w, h, r) => {
    sky(ctx, w, h, ["#090b1f", "#1d1846", "#4a2463", "#c1477a"]);
    stars(ctx, w, h * 0.45, r, 140);
    glow(ctx, w * 0.5, h * 0.75, w * 0.9, "255,120,150", 0.7);
    for (const [base, color, lit] of [
      [0.72, "#1e1838", 0.2],
      [0.8, "#0e0b1d", 0.45],
    ] as const) {
      let x = -10;
      while (x < w) {
        const bw = w * (0.07 + r() * 0.12);
        const bh = h * (0.12 + r() * 0.3);
        const top = h * base - bh;
        ctx.fillStyle = color;
        ctx.fillRect(x, top, bw, h - top);
        for (let wy = top + w * 0.02; wy < h * base + h * 0.2; wy += w * 0.03) {
          for (let wx = x + w * 0.012; wx < x + bw - w * 0.015; wx += w * 0.025) {
            if (r() < lit) {
              ctx.fillStyle = r() < 0.7 ? "#ffd58a" : "#9fd3ff";
              ctx.globalAlpha = 0.5 + r() * 0.5;
              ctx.fillRect(wx, wy, w * 0.01, w * 0.014);
            }
          }
        }
        ctx.globalAlpha = 1;
        x += bw + w * 0.004;
      }
    }
    bokeh(ctx, w, h, r, ["255,90,120", "255,200,120", "120,180,255"], 16, 0.8, 1);
  },
  "golden-hour": (ctx, w, h, r) => {
    sky(ctx, w, h, ["#3f6fb5", "#f3b26b", "#ff8b4d", "#f7d08a"]);
    const sx = w * (0.25 + r() * 0.5);
    glow(ctx, sx, h * 0.58, w * 0.9, "255,226,160", 0.8);
    glow(ctx, sx, h * 0.58, w * 0.08, "255,250,230", 1);
    ridge(ctx, w, h, h * 0.66, h * 0.05, "#b6603f", r, 4);
    ridge(ctx, w, h, h * 0.74, h * 0.06, "#6e3a2c", r, 5);
    ridge(ctx, w, h, h * 0.84, h * 0.05, "#2e1d1a", r, 3);
  },
  ocean: (ctx, w, h, r) => {
    sky(ctx, w, h * 0.62, ["#5b9fd6", "#a7cbe6", "#f6d1b5"]);
    const sx = w * (0.3 + r() * 0.4);
    glow(ctx, sx, h * 0.6, w * 0.6, "255,236,200", 0.8);
    const sea = ctx.createLinearGradient(0, h * 0.6, 0, h);
    sea.addColorStop(0, "#5f8fb2");
    sea.addColorStop(1, "#173a57");
    ctx.fillStyle = sea;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.fillStyle = "#fff6e0";
    for (let i = 0; i < 160; i++) {
      const y = h * 0.6 + Math.pow(r(), 1.6) * h * 0.38;
      const spread = (y - h * 0.6) / (h * 0.4);
      ctx.globalAlpha = 0.15 + r() * 0.5 * (1 - spread);
      ctx.fillRect(sx + (r() - 0.5) * w * (0.15 + spread * 0.9), y, w * (0.02 + r() * 0.05), w * 0.003);
    }
    ctx.globalAlpha = 1;
    ridge(ctx, w, h, h * 0.9, h * 0.02, "#d9c09a", r, 3);
  },
  interior: (ctx, w, h, r) => {
    sky(ctx, w, h, ["#2a1b14", "#4d3122", "#7a4e33", "#3b261b"]);
    // window light
    const wx = w * (0.15 + r() * 0.35);
    const g = ctx.createLinearGradient(wx, 0, wx + w * 0.5, h);
    g.addColorStop(0, "rgba(255,226,180,0.55)");
    g.addColorStop(1, "rgba(255,226,180,0)");
    ctx.fillStyle = g;
    ctx.fillRect(wx, h * 0.05, w * 0.45, h * 0.5);
    ctx.fillStyle = "#24160f";
    ctx.fillRect(wx + w * 0.215, h * 0.05, w * 0.02, h * 0.5);
    ctx.fillRect(wx, h * 0.29, w * 0.45, w * 0.02);
    bokeh(ctx, w, h, r, ["255,200,130", "255,170,90"], 22, 0, 0.6);
    // table + mug silhouette
    ctx.fillStyle = "#1a0f0a";
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.fillStyle = "#120a06";
    const mx = w * (0.55 + r() * 0.2);
    ctx.fillRect(mx, h * 0.72, w * 0.1, h * 0.08);
    ctx.lineWidth = w * 0.012;
    ctx.strokeStyle = "#120a06";
    ctx.beginPath();
    ctx.arc(mx + w * 0.11, h * 0.755, w * 0.025, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  },
  mountains: (ctx, w, h, r) => {
    sky(ctx, w, h, ["#7aa7d9", "#c7dcef", "#f3e3d3"]);
    glow(ctx, w * (0.2 + r() * 0.6), h * 0.3, w * 0.5, "255,255,240", 0.6);
    ridge(ctx, w, h, h * 0.52, h * 0.16, "#9eb1cc", r, 4);
    ridge(ctx, w, h, h * 0.6, h * 0.14, "#6d84a6", r, 5);
    ridge(ctx, w, h, h * 0.7, h * 0.1, "#3f5473", r, 6);
    treeLine(ctx, w, h * 0.84, "#1d2a35", r, h * 0.08, h * 0.18, 12);
  },
  court: (ctx, w, h, r) => {
    sky(ctx, w, h * 0.6, ["#7f9fd8", "#b7b5de", "#e8b6c4"]);
    treeLine(ctx, w, h * 0.6, "#24332c", r, h * 0.2, h * 0.38, 8);
    const g = ctx.createLinearGradient(0, h * 0.58, 0, h);
    g.addColorStop(0, "#5d6a72");
    g.addColorStop(1, "#3b444a");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = w * 0.006;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.72);
    ctx.lineTo(w, h * 0.68);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.98, w * 0.35, Math.PI, Math.PI * 2);
    ctx.stroke();
    // hoop
    const hx = w * (0.68 + r() * 0.12);
    ctx.fillStyle = "#c9ccd0";
    ctx.fillRect(hx, h * 0.38, w * 0.018, h * 0.32);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(hx - w * 0.12, h * 0.33, w * 0.17, h * 0.07);
    ctx.strokeStyle = "#e0663a";
    ctx.beginPath();
    ctx.moveTo(hx - w * 0.08, h * 0.395);
    ctx.lineTo(hx - w * 0.01, h * 0.395);
    ctx.stroke();
  },
};

/** Paint a full-bleed scene. Deterministic for a given seed. */
export function paintScene(ctx: Ctx2D, w: number, h: number, mood: Mood, seed: string) {
  const r = rng(hashSeed(seed));
  PAINTERS[mood](ctx, w, h, r);
  grainAndVignette(ctx, w, h, r);
}
