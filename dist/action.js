// src/fetch.ts
var QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date weekday contributionCount contributionLevel }
        }
      }
    }
  }
}`;
var LEVELS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4
};
function toLevel(name) {
  return LEVELS[name] ?? 0;
}
async function fetchCalendar(user, token, fetchFn = fetch) {
  const res = await fetchFn("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "contrib-neon"
    },
    body: JSON.stringify({ query: QUERY, variables: { login: user } })
  });
  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  const account = json.data?.user;
  if (!account) throw new Error(`GitHub user "${user}" not found`);
  const cal = account.contributionsCollection.contributionCalendar;
  return {
    user,
    total: cal.totalContributions,
    weeks: cal.weeks.map(
      (w) => w.contributionDays.map((d) => ({
        date: d.date,
        weekday: d.weekday,
        count: d.contributionCount,
        level: toLevel(d.contributionLevel)
      }))
    )
  };
}

// src/generate.ts
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// src/palette.ts
var catppuccin = {
  latte: {
    base: "#eff1f5",
    crust: "#dce0e8",
    surface0: "#ccd0da",
    overlay0: "#9ca0b0",
    text: "#4c4f69",
    subtext0: "#6c6f85",
    blue: "#1e66f5",
    lavender: "#7287fd",
    mauve: "#8839ef",
    pink: "#ea76cb",
    red: "#d20f39",
    sky: "#04a5e5"
  },
  frappe: {
    base: "#303446",
    crust: "#232634",
    surface0: "#414559",
    overlay0: "#737994",
    text: "#c6d0f5",
    subtext0: "#a5adce",
    blue: "#8caaee",
    lavender: "#babbf1",
    mauve: "#ca9ee6",
    pink: "#f4b8e4",
    red: "#e78284",
    sky: "#99d1db"
  },
  macchiato: {
    base: "#24273a",
    crust: "#181926",
    surface0: "#363a4f",
    overlay0: "#6e738d",
    text: "#cad3f5",
    subtext0: "#a5adcb",
    blue: "#8aadf4",
    lavender: "#b7bdf8",
    mauve: "#c6a0f6",
    pink: "#f5bde6",
    red: "#ed8796",
    sky: "#91d7e3"
  },
  mocha: {
    base: "#1e1e2e",
    crust: "#11111b",
    surface0: "#313244",
    overlay0: "#6c7086",
    text: "#cdd6f4",
    subtext0: "#a6adc8",
    blue: "#89b4fa",
    lavender: "#b4befe",
    mauve: "#cba6f7",
    pink: "#f5c2e7",
    red: "#f38ba8",
    sky: "#89dceb"
  }
};
function fromFlavor(name) {
  const c = catppuccin[name];
  const dark = name !== "latte";
  return {
    dark,
    background: dark ? c.crust : c.base,
    border: c.surface0,
    empty: c.surface0,
    levels: [c.blue, c.lavender, c.mauve, c.pink],
    core: dark ? "#ffffff" : c.base,
    text: c.text,
    subtext: c.subtext0,
    accent: c.mauve,
    glitchA: c.red,
    glitchB: c.sky
  };
}
var FLAVORS = {
  latte: fromFlavor("latte"),
  frappe: fromFlavor("frappe"),
  macchiato: fromFlavor("macchiato"),
  mocha: fromFlavor("mocha")
};
function isFlavor(name) {
  return Object.hasOwn(FLAVORS, name);
}

// src/options.ts
var HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
function color(value, key) {
  const v = value.trim();
  if (!HEX.test(v)) throw new Error(`Invalid color for ${key}: "${value}"`);
  return v.startsWith("#") ? v : `#${v}`;
}
function bool(value, fallback) {
  if (value === null) return fallback;
  return !["false", "0", "no", "off"].includes(value.toLowerCase());
}
function parseOutput(line) {
  const [path, query = ""] = line.trim().split("?", 2);
  const params = new URLSearchParams(query);
  const flavor = params.get("flavor") ?? "mocha";
  if (!isFlavor(flavor)) {
    throw new Error(
      `Unknown flavor "${flavor}" (expected ${Object.keys(FLAVORS).join(", ")})`
    );
  }
  const palette = { ...FLAVORS[flavor] };
  const levels = params.get("color_levels");
  if (levels !== null) {
    const list = levels.split(",").map((c) => color(c, "color_levels"));
    if (list.length !== 4) {
      throw new Error("color_levels needs exactly 4 colors (levels 1-4)");
    }
    palette.levels = list;
  }
  const bg = params.get("color_background");
  if (bg !== null) palette.background = color(bg, "color_background");
  const empty = params.get("color_empty");
  if (empty !== null) palette.empty = color(empty, "color_empty");
  return {
    path,
    palette,
    hud: bool(params.get("hud"), true),
    glitch: bool(params.get("glitch"), true)
  };
}

// src/rng.ts
function seeded(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  let a = h >>> 0;
  return () => {
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// src/render/effects.ts
var TIMING = {
  colDelay: 0.022,
  rowDelay: 0.012,
  cellBoot: 0.4,
  glowIn: 0.9,
  scanPeriod: 6,
  glitchPeriod: 7
};
var bootEnd = (cols) => cols * TIMING.colDelay + 6 * TIMING.rowDelay;
var GLOW = [
  null,
  { blur: 2, lo: 0.55, hi: 0.85, period: 4 },
  { blur: 2.6, lo: 0.65, hi: 0.95, period: 3.2 },
  { blur: 3.2, lo: 0.75, hi: 1, period: 2.4 },
  { blur: 4, lo: 0.85, hi: 1, period: 1.6 }
];
var glowScale = (p) => p.dark ? 1 : 0.7;
var r = (n) => +n.toFixed(3);
function filterDefs(g, p) {
  const region = `filterUnits="userSpaceOnUse" x="0" y="0" width="${g.width}" height="${g.height}"`;
  const glows = [1, 2, 3, 4].map((l) => {
    const { blur } = GLOW[l];
    return `<filter id="g${l}" ${region}><feGaussianBlur stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/></feMerge></filter>`;
  }).join("");
  const tint = (id, c) => `<filter id="${id}" ${region}><feFlood flood-color="${c}"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
  const lineColor = p.dark ? "#000000" : p.text;
  const lineOpacity = p.dark ? 0.28 : 0.05;
  return glows + tint("ta", p.glitchA) + tint("tb", p.glitchB) + `<pattern id="sl" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="${lineColor}" fill-opacity="${lineOpacity}"/></pattern><linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${p.accent}" stop-opacity="${p.dark ? 0.09 : 0.06}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>`;
}
function baseCss(g, p) {
  const end = bootEnd(g.cols);
  const s = glowScale(p);
  const levels = [1, 2, 3, 4].map((l) => {
    const { lo, hi, period } = GLOW[l];
    const [a, b] = [r(lo * s), r(hi * s)];
    const ignite = r(Math.min(1, hi * s * 1.25));
    return `.p${l}{opacity:${a};animation:i${l} ${TIMING.glowIn}s ${r(end)}s ease-out both,p${l} ${period}s ${r(end + TIMING.glowIn)}s ease-in-out infinite}@keyframes i${l}{0%{opacity:0}55%{opacity:${ignite}}100%{opacity:${a}}}@keyframes p${l}{0%,100%{opacity:${a}}50%{opacity:${b}}}`;
  }).join("");
  const core = GLOW[4];
  return [
    `.c{animation:boot ${TIMING.cellBoot}s ease-out both}`,
    "@keyframes boot{0%{opacity:0}35%{opacity:1}50%{opacity:.15}65%{opacity:1}80%{opacity:.55}100%{opacity:1}}",
    levels,
    `.k{opacity:.55;animation:i4 ${TIMING.glowIn}s ${r(end)}s ease-out both,k ${core.period}s ${r(end + TIMING.glowIn)}s ease-in-out infinite}`,
    "@keyframes k{0%,100%{opacity:.55}50%{opacity:.95}}",
    `.hd{opacity:0;animation:hd ${r(end)}s linear both}`,
    `@keyframes hd{0%{opacity:1;transform:translateX(0)}90%{opacity:1}100%{opacity:0;transform:translateX(${g.gridWidth}px)}}`,
    `.bm{opacity:0;animation:bm ${TIMING.scanPeriod}s ${r(end)}s linear infinite}`,
    `@keyframes bm{0%{opacity:1;transform:translateY(-40px)}100%{opacity:1;transform:translateY(${g.height}px)}}`,
    ".cur{animation:blink 1.1s steps(1,end) infinite}@keyframes blink{50%{opacity:0}}",
    `.hud{animation:flick ${TIMING.glitchPeriod}s ${r(end)}s steps(1,end) infinite}`,
    "@keyframes flick{0%,100%{opacity:1}61%{opacity:.35}62%{opacity:1}63%{opacity:.6}64%{opacity:1}}",
    "@media (prefers-reduced-motion:reduce){*{animation:none!important}}"
  ].join("");
}
function glitchSlices(user) {
  const rand = seeded(`glitch:${user}`);
  return [0, 1, 2].map((i) => {
    const rows = rand() < 0.5 ? 1 : 2;
    return {
      row: Math.floor(rand() * (8 - rows)),
      rows,
      // spread the three slices across the cycle so they don't stack
      at: r(10 + i * 27 + rand() * 15),
      dx: r((rand() < 0.5 ? -1 : 1) * (3 + rand() * 6))
    };
  });
}
function glitchLayer(g, p, user) {
  const step = g.cell + g.gap;
  const start = r(bootEnd(g.cols) + TIMING.glowIn);
  const slices = glitchSlices(user);
  let defs = "";
  let css = "";
  let svg = "";
  slices.forEach((s, i) => {
    const y = g.gridTop + s.row * step - g.gap / 2;
    const h = s.rows * step;
    const x = g.gridLeft - 12;
    const w = g.gridWidth + 24;
    defs += `<clipPath id="k${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
    const t = s.at;
    css += `.gk${i}{opacity:0;animation:gk${i} ${TIMING.glitchPeriod}s ${start}s steps(1,end) infinite}@keyframes gk${i}{0%,${t}%{opacity:0;transform:none}${r(t + 0.1)}%{opacity:1;transform:translateX(${s.dx}px)}${r(t + 0.7)}%{opacity:1;transform:translateX(${r(-s.dx / 2)}px)}${r(t + 1.3)}%{opacity:1;transform:translateX(${r(s.dx / 3)}px)}${r(t + 1.8)}%,100%{opacity:0;transform:none}}`;
    svg += `<g clip-path="url(#k${i})"><g class="gk${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.background}"/><use href="#cells" filter="url(#ta)" x="-2" opacity=".85"/><use href="#cells" filter="url(#tb)" x="2" opacity=".85"/><use href="#cells"/></g></g>`;
  });
  return { defs, css, svg };
}

// src/render/font.ts
var FONT_FAMILY = "ContribNeon Mono";
var FONT_WOFF2 = "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";

// src/render/grid.ts
var CELL = 11;
var GAP = 3;
var PAD = 16;
var HUD_HEIGHT = 22;
function layout(cal, opts) {
  const step = CELL + GAP;
  const gridTop = PAD + (opts.hud ? HUD_HEIGHT : 0);
  const cells2 = cal.weeks.flatMap(
    (week, col) => week.map((day) => ({
      date: day.date,
      count: day.count,
      level: day.level,
      col,
      row: day.weekday,
      x: PAD + col * step,
      y: gridTop + day.weekday * step
    }))
  );
  const cols = cal.weeks.length;
  const gridWidth = cols * step - GAP;
  const gridHeight = 7 * step - GAP;
  return {
    cells: cells2,
    cols,
    cell: CELL,
    gap: GAP,
    gridLeft: PAD,
    gridTop,
    gridWidth,
    gridHeight,
    width: PAD * 2 + gridWidth,
    height: gridTop + gridHeight + PAD
  };
}

// src/render/svg.ts
var FONT = `'${FONT_FAMILY}',ui-monospace,'Cascadia Code',SFMono-Regular,Menlo,Consolas,monospace`;
var FONT_SIZE = 10;
var LETTER_SPACING = 1.2;
var CHAR_WIDTH = FONT_SIZE * 0.62 + LETTER_SPACING;
var fontFace = `@font-face{font-family:'${FONT_FAMILY}';src:url(data:font/woff2;base64,${FONT_WOFF2}) format('woff2')}`;
var esc = (s) => s.replace(
  /[<>&"']/g,
  (ch) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;"
  })[ch]
);
var delay = (c) => +(c.col * TIMING.colDelay + c.row * TIMING.rowDelay).toFixed(3);
function cellRect(c, size) {
  return `<rect class="c" x="${c.x}" y="${c.y}" width="${size}" height="${size}" rx="2" style="animation-delay:${delay(c)}s"/>`;
}
function cells(g, opts) {
  const p = opts.palette;
  const byLevel = [0, 1, 2, 3, 4].map(
    (l) => g.cells.filter((c) => c.level === l).map((c) => cellRect(c, g.cell)).join("")
  );
  const cores = g.cells.filter((c) => c.level === 4).map(
    (c) => `<rect class="c" x="${c.x + 3}" y="${c.y + 3}" width="${g.cell - 6}" height="${g.cell - 6}" rx="1" style="animation-delay:${delay(c)}s"/>`
  ).join("");
  const fills = [p.empty, ...p.levels];
  return `<g id="cells">` + byLevel.map((rects, l) => `<g id="l${l}" fill="${fills[l]}">${rects}</g>`).join("") + `<g class="k" fill="${p.core}">${cores}</g></g>`;
}
function hud(g, cal, opts) {
  const p = opts.palette;
  const y = g.gridTop - 12;
  const right = g.gridLeft + g.gridWidth;
  const total = cal.total.toLocaleString("en-US");
  const left = `// CONTRIB.LOG :: @${cal.user}`;
  const cursorX = +(g.gridLeft + left.length * CHAR_WIDTH + 2).toFixed(1);
  return `<g class="hud" font-family="${FONT}" font-size="${FONT_SIZE}" letter-spacing="${LETTER_SPACING}"><text x="${g.gridLeft}" y="${y}" fill="${p.subtext}"><tspan fill="${p.accent}">//</tspan> CONTRIB.LOG <tspan fill="${p.accent}">::</tspan> <tspan fill="${p.text}">@${esc(cal.user)}</tspan></text><rect class="cur" x="${cursorX}" y="${y - 7.5}" width="5" height="9" fill="${p.accent}"/><text x="${right}" y="${y}" text-anchor="end" fill="${p.subtext}"><tspan fill="${p.text}">${total}</tspan> CONTRIBUTIONS <tspan fill="${p.accent}">//</tspan> LAST 365D</text></g>`;
}
function brackets(g, opts) {
  const { width: w, height: h } = g;
  const i = 4;
  const l = 10;
  const d = [
    `M${i} ${i + l}V${i}H${i + l}`,
    `M${w - i - l} ${i}H${w - i}V${i + l}`,
    `M${i} ${h - i - l}V${h - i}H${i + l}`,
    `M${w - i - l} ${h - i}H${w - i}V${h - i - l}`
  ].join("");
  return `<path d="${d}" fill="none" stroke="${opts.palette.accent}" stroke-width="1.5" stroke-opacity=".8"/>`;
}
function renderSvg(cal, opts) {
  const g = layout(cal, opts);
  const p = opts.palette;
  const glitch = opts.glitch ? glitchLayer(g, p, cal.user) : { defs: "", css: "", svg: "" };
  const label = `${cal.user}'s GitHub contributions: ${cal.total} in the last year`;
  const glows = [1, 2, 3, 4].map((l) => `<use href="#l${l}" filter="url(#g${l})" class="p${l}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" width="${g.width}" height="${g.height}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><style>${opts.hud ? fontFace : ""}${baseCss(g, p)}${glitch.css}</style><defs>${filterDefs(g, p)}${glitch.defs}</defs><rect x=".5" y=".5" width="${g.width - 1}" height="${g.height - 1}" fill="${p.background}" stroke="${p.border}"/>` + (opts.hud ? hud(g, cal, opts) : "") + glows + cells(g, opts) + `<rect class="hd" x="${g.gridLeft - 3}" y="${g.gridTop - 4}" width="2" height="${g.gridHeight + 8}" fill="${p.accent}" filter="url(#g4)"/>` + glitch.svg + `<rect width="${g.width}" height="${g.height}" fill="url(#sl)" pointer-events="none"/><rect class="bm" width="${g.width}" height="40" fill="url(#bm)" pointer-events="none"/>` + brackets(g, opts) + `</svg>`;
}

// src/generate.ts
async function generate(cal, outputs) {
  const specs = outputs.filter((l) => l.trim()).map(parseOutput);
  if (specs.length === 0) throw new Error("No outputs given");
  for (const spec of specs) {
    await mkdir(dirname(spec.path), { recursive: true });
    await writeFile(spec.path, renderSvg(cal, spec));
  }
  return specs.map((s) => s.path);
}

// src/action.ts
function input(name, required = false) {
  const value = (process.env[`INPUT_${name.toUpperCase()}`] ?? "").trim();
  if (required && !value) throw new Error(`Input required: ${name}`);
  return value;
}
async function main() {
  const user = input("github_user_name", true);
  const token = input("github_token", true);
  const outputs = input("outputs", true).split("\n");
  const cal = await fetchCalendar(user, token);
  console.log(
    `${user}: ${cal.total} contributions over ${cal.weeks.length} weeks`
  );
  for (const path of await generate(cal, outputs)) console.log(`wrote ${path}`);
}
main().catch((err) => {
  console.log(`::error::${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
