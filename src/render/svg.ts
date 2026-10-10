import type { Calendar, RenderOptions } from "../types.ts";
import { baseCss, filterDefs, glitchLayer, TIMING } from "./effects.ts";
import { type Cell, type Grid, layout } from "./grid.ts";

const FONT =
	"ui-monospace,'Cascadia Code','JetBrains Mono',SFMono-Regular,Menlo,Consolas,monospace";

const esc = (s: string) =>
	s.replace(
		/[<>&"']/g,
		(ch) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				'"': "&quot;",
				"'": "&apos;",
			})[ch] as string,
	);

const delay = (c: Cell) =>
	+(c.col * TIMING.colDelay + c.row * TIMING.rowDelay).toFixed(3);

function cellRect(c: Cell, size: number): string {
	return `<rect class="c" x="${c.x}" y="${c.y}" width="${size}" height="${size}" rx="2" style="animation-delay:${delay(c)}s"/>`;
}

function cells(g: Grid, opts: RenderOptions): string {
	const p = opts.palette;
	const byLevel = [0, 1, 2, 3, 4].map((l) =>
		g.cells
			.filter((c) => c.level === l)
			.map((c) => cellRect(c, g.cell))
			.join(""),
	);
	const cores = g.cells
		.filter((c) => c.level === 4)
		.map(
			(c) =>
				`<rect class="c" x="${c.x + 3}" y="${c.y + 3}" width="${g.cell - 6}" height="${g.cell - 6}" rx="1" style="animation-delay:${delay(c)}s"/>`,
		)
		.join("");
	const fills = [p.empty, ...p.levels];
	return (
		`<g id="cells">` +
		byLevel
			.map((rects, l) => `<g id="l${l}" fill="${fills[l]}">${rects}</g>`)
			.join("") +
		`<g class="k" fill="${p.core}">${cores}</g>` +
		`</g>`
	);
}

function hud(g: Grid, cal: Calendar, opts: RenderOptions): string {
	const p = opts.palette;
	const y = g.gridTop - 12;
	const right = g.gridLeft + g.gridWidth;
	const total = cal.total.toLocaleString("en-US");
	return (
		`<g class="hud" font-family="${FONT}" font-size="10" letter-spacing="1.2">` +
		`<text x="${g.gridLeft}" y="${y}" fill="${p.subtext}">` +
		`<tspan fill="${p.accent}">//</tspan> CONTRIB.LOG <tspan fill="${p.accent}">::</tspan> ` +
		`<tspan fill="${p.text}">@${esc(cal.user)}</tspan><tspan class="cur" fill="${p.accent}">▌</tspan></text>` +
		`<text x="${right}" y="${y}" text-anchor="end" fill="${p.subtext}">` +
		`<tspan fill="${p.text}">${total}</tspan> CONTRIBUTIONS <tspan fill="${p.accent}">//</tspan> LAST 365D</text>` +
		`</g>`
	);
}

function brackets(g: Grid, opts: RenderOptions): string {
	const { width: w, height: h } = g;
	const i = 4;
	const l = 10;
	const d = [
		`M${i} ${i + l}V${i}H${i + l}`,
		`M${w - i - l} ${i}H${w - i}V${i + l}`,
		`M${i} ${h - i - l}V${h - i}H${i + l}`,
		`M${w - i - l} ${h - i}H${w - i}V${h - i - l}`,
	].join("");
	return `<path d="${d}" fill="none" stroke="${opts.palette.accent}" stroke-width="1.5" stroke-opacity=".8"/>`;
}

export function renderSvg(cal: Calendar, opts: RenderOptions): string {
	const g = layout(cal, opts);
	const p = opts.palette;
	const glitch = opts.glitch
		? glitchLayer(g, p, cal.user)
		: { defs: "", css: "", svg: "" };
	const label = `${cal.user}'s GitHub contributions: ${cal.total} in the last year`;
	const glows = [1, 2, 3, 4]
		.map((l) => `<use href="#l${l}" filter="url(#g${l})" class="p${l}"/>`)
		.join("");

	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.width} ${g.height}" width="${g.width}" height="${g.height}" role="img" aria-label="${esc(label)}">` +
		`<title>${esc(label)}</title>` +
		`<style>${baseCss(g, p)}${glitch.css}</style>` +
		`<defs>${filterDefs(g, p)}${glitch.defs}</defs>` +
		`<rect x=".5" y=".5" width="${g.width - 1}" height="${g.height - 1}" fill="${p.background}" stroke="${p.border}"/>` +
		(opts.hud ? hud(g, cal, opts) : "") +
		glows +
		cells(g, opts) +
		`<rect class="hd" x="${g.gridLeft - 3}" y="${g.gridTop - 4}" width="2" height="${g.gridHeight + 8}" fill="${p.accent}" filter="url(#g4)"/>` +
		glitch.svg +
		`<rect width="${g.width}" height="${g.height}" fill="url(#sl)" pointer-events="none"/>` +
		`<rect class="bm" width="${g.width}" height="40" fill="url(#bm)" pointer-events="none"/>` +
		brackets(g, opts) +
		`</svg>`
	);
}
