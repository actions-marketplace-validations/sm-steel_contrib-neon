import {
	beam,
	brackets,
	cursorAfter,
	cursorRect,
	esc,
	FONT_STACK,
	fontFace,
	HUD,
	panel,
	scanlines,
} from "@sm-steel/neon-kit";
import type { Calendar, RenderOptions } from "../types.ts";
import {
	baseCss,
	filterDefs,
	glitchLayer,
	REDUCED_MOTION_CSS,
	TIMING,
} from "./effects.ts";
import { type Cell, type Grid, layout } from "./grid.ts";

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
	const left = `// CONTRIB.LOG :: @${cal.user}`;
	return (
		`<g class="hud" font-family="${FONT_STACK}" font-size="${HUD.size}" letter-spacing="${HUD.spacing}">` +
		`<text x="${g.gridLeft}" y="${y}" fill="${p.subtext}">` +
		`<tspan fill="${p.accent}">//</tspan> CONTRIB.LOG <tspan fill="${p.accent}">::</tspan> ` +
		`<tspan fill="${p.text}">@${esc(cal.user)}</tspan></text>` +
		cursorRect(cursorAfter(left, g.gridLeft), y, p) +
		`<text x="${right}" y="${y}" text-anchor="end" fill="${p.subtext}">` +
		`<tspan fill="${p.text}">${total}</tspan> CONTRIBUTIONS <tspan fill="${p.accent}">//</tspan> LAST 365D</text>` +
		`</g>`
	);
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
		`<style>${opts.hud ? fontFace("hud") : ""}${baseCss(g, p)}${glitch.css}${REDUCED_MOTION_CSS}</style>` +
		`<defs>${filterDefs(g, p)}${glitch.defs}</defs>` +
		panel(g.width, g.height, p) +
		(opts.hud ? hud(g, cal, opts) : "") +
		glows +
		cells(g, opts) +
		`<rect class="hd" x="${g.gridLeft - 3}" y="${g.gridTop - 4}" width="2" height="${g.gridHeight + 8}" fill="${p.accent}" filter="url(#g4)"/>` +
		glitch.svg +
		scanlines(g) +
		beam(g) +
		brackets(g.width, g.height, p) +
		`</svg>`
	);
}
