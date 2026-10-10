import { seeded } from "../rng.ts";
import type { Palette } from "../types.ts";
import type { Grid } from "./grid.ts";

/** Seconds. Boot sweep runs once; everything else loops afterwards. */
export const TIMING = {
	colDelay: 0.022,
	rowDelay: 0.012,
	cellBoot: 0.4,
	glowIn: 0.9,
	scanPeriod: 6,
	glitchPeriod: 7,
};

export const bootEnd = (cols: number) =>
	cols * TIMING.colDelay + 6 * TIMING.rowDelay;

/** Per-level glow: blur radius, pulse opacity range, pulse period. Index = level. */
const GLOW = [
	null,
	{ blur: 2, lo: 0.55, hi: 0.85, period: 4 },
	{ blur: 2.6, lo: 0.65, hi: 0.95, period: 3.2 },
	{ blur: 3.2, lo: 0.75, hi: 1, period: 2.4 },
	{ blur: 4, lo: 0.85, hi: 1, period: 1.6 },
] as const;

/** Glow reads weaker on light backgrounds; scale it down to "lit ink". */
const glowScale = (p: Palette) => (p.dark ? 1 : 0.7);

const r = (n: number) => +n.toFixed(3);

export function filterDefs(g: Grid, p: Palette): string {
	const region = `filterUnits="userSpaceOnUse" x="0" y="0" width="${g.width}" height="${g.height}"`;
	const glows = [1, 2, 3, 4]
		.map((l) => {
			const { blur } = GLOW[l] as NonNullable<(typeof GLOW)[number]>;
			return `<filter id="g${l}" ${region}><feGaussianBlur stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/></feMerge></filter>`;
		})
		.join("");
	const tint = (id: string, c: string) =>
		`<filter id="${id}" ${region}><feFlood flood-color="${c}"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
	const lineColor = p.dark ? "#000000" : p.text;
	const lineOpacity = p.dark ? 0.28 : 0.05;
	return (
		glows +
		tint("ta", p.glitchA) +
		tint("tb", p.glitchB) +
		`<pattern id="sl" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1" fill="${lineColor}" fill-opacity="${lineOpacity}"/></pattern>` +
		`<linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${p.accent}" stop-opacity="${p.dark ? 0.09 : 0.06}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>`
	);
}

export function baseCss(g: Grid, p: Palette): string {
	const end = bootEnd(g.cols);
	const s = glowScale(p);
	const levels = [1, 2, 3, 4]
		.map((l) => {
			const { lo, hi, period } = GLOW[l] as NonNullable<(typeof GLOW)[number]>;
			const [a, b] = [r(lo * s), r(hi * s)];
			const ignite = r(Math.min(1, hi * s * 1.25));
			return (
				`.p${l}{opacity:${a};animation:i${l} ${TIMING.glowIn}s ${r(end)}s ease-out both,p${l} ${period}s ${r(end + TIMING.glowIn)}s ease-in-out infinite}` +
				`@keyframes i${l}{0%{opacity:0}55%{opacity:${ignite}}100%{opacity:${a}}}` +
				`@keyframes p${l}{0%,100%{opacity:${a}}50%{opacity:${b}}}`
			);
		})
		.join("");
	const core = GLOW[4] as NonNullable<(typeof GLOW)[4]>;
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
		"@media (prefers-reduced-motion:reduce){*{animation:none!important}}",
	].join("");
}

interface Slice {
	row: number;
	rows: number;
	at: number;
	dx: number;
}

/** 3 horizontal tears at seeded rows/times, each showing a red/cyan channel split. */
export function glitchSlices(user: string): Slice[] {
	const rand = seeded(`glitch:${user}`);
	return [0, 1, 2].map((i) => {
		const rows = rand() < 0.5 ? 1 : 2;
		return {
			row: Math.floor(rand() * (8 - rows)),
			rows,
			// spread the three slices across the cycle so they don't stack
			at: r(10 + i * 27 + rand() * 15),
			dx: r((rand() < 0.5 ? -1 : 1) * (3 + rand() * 6)),
		};
	});
}

export function glitchLayer(
	g: Grid,
	p: Palette,
	user: string,
): { defs: string; css: string; svg: string } {
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
		css +=
			`.gk${i}{opacity:0;animation:gk${i} ${TIMING.glitchPeriod}s ${start}s steps(1,end) infinite}` +
			`@keyframes gk${i}{0%,${t}%{opacity:0;transform:none}` +
			`${r(t + 0.1)}%{opacity:1;transform:translateX(${s.dx}px)}` +
			`${r(t + 0.7)}%{opacity:1;transform:translateX(${r(-s.dx / 2)}px)}` +
			`${r(t + 1.3)}%{opacity:1;transform:translateX(${r(s.dx / 3)}px)}` +
			`${r(t + 1.8)}%,100%{opacity:0;transform:none}}`;
		svg +=
			`<g clip-path="url(#k${i})"><g class="gk${i}">` +
			`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.background}"/>` +
			`<use href="#cells" filter="url(#ta)" x="-2" opacity=".85"/>` +
			`<use href="#cells" filter="url(#tb)" x="2" opacity=".85"/>` +
			`<use href="#cells"/></g></g>`;
	});
	return { defs, css, svg };
}
