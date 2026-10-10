import {
	beamCss,
	beamDefs,
	CURSOR_CSS,
	glitchLayer as kitGlitch,
	type Palette,
	REDUCED_MOTION_CSS,
	r3,
	scanlineDefs,
	seeded,
	type Tear,
	tintDefs,
} from "@sm-steel/neon-kit";
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

export function filterDefs(g: Grid, p: Palette): string {
	const region = `filterUnits="userSpaceOnUse" x="0" y="0" width="${g.width}" height="${g.height}"`;
	const glows = [1, 2, 3, 4]
		.map((l) => {
			const { blur } = GLOW[l] as NonNullable<(typeof GLOW)[number]>;
			return `<filter id="g${l}" ${region}><feGaussianBlur stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/></feMerge></filter>`;
		})
		.join("");
	return glows + tintDefs(p, g) + scanlineDefs(p) + beamDefs(p);
}

export function baseCss(g: Grid, p: Palette): string {
	const end = bootEnd(g.cols);
	const s = glowScale(p);
	const levels = [1, 2, 3, 4]
		.map((l) => {
			const { lo, hi, period } = GLOW[l] as NonNullable<(typeof GLOW)[number]>;
			const [a, b] = [r3(lo * s), r3(hi * s)];
			const ignite = r3(Math.min(1, hi * s * 1.25));
			return (
				`.p${l}{opacity:${a};animation:i${l} ${TIMING.glowIn}s ${r3(end)}s ease-out both,p${l} ${period}s ${r3(end + TIMING.glowIn)}s ease-in-out infinite}` +
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
		`.k{opacity:.55;animation:i4 ${TIMING.glowIn}s ${r3(end)}s ease-out both,k ${core.period}s ${r3(end + TIMING.glowIn)}s ease-in-out infinite}`,
		"@keyframes k{0%,100%{opacity:.55}50%{opacity:.95}}",
		`.hd{opacity:0;animation:hd ${r3(end)}s linear both}`,
		`@keyframes hd{0%{opacity:1;transform:translateX(0)}90%{opacity:1}100%{opacity:0;transform:translateX(${g.gridWidth}px)}}`,
		beamCss(g, { period: TIMING.scanPeriod, delay: end }),
		CURSOR_CSS,
		`.hud{animation:flick ${TIMING.glitchPeriod}s ${r3(end)}s steps(1,end) infinite}`,
		"@keyframes flick{0%,100%{opacity:1}61%{opacity:.35}62%{opacity:1}63%{opacity:.6}64%{opacity:1}}",
	].join("");
}

/** 3 horizontal tears at seeded grid rows/times, each showing a red/cyan channel split. */
export function glitchTears(g: Grid, user: string): Tear[] {
	const rand = seeded(`glitch:${user}`);
	const step = g.cell + g.gap;
	return [0, 1, 2].map((i) => {
		const rows = rand() < 0.5 ? 1 : 2;
		const row = Math.floor(rand() * (8 - rows));
		return {
			y: g.gridTop + row * step - g.gap / 2,
			h: rows * step,
			// spread the three tears across the cycle so they don't stack
			at: r3(10 + i * 27 + rand() * 15),
			dx: r3((rand() < 0.5 ? -1 : 1) * (3 + rand() * 6)),
		};
	});
}

export function glitchLayer(g: Grid, p: Palette, user: string) {
	return kitGlitch({
		target: "cells",
		tears: glitchTears(g, user),
		band: { x: g.gridLeft - 12, width: g.gridWidth + 24 },
		period: TIMING.glitchPeriod,
		start: r3(bootEnd(g.cols) + TIMING.glowIn),
		background: p.background,
	});
}

/** Must be the very last CSS rule: it overrides every animation above by order. */
export { REDUCED_MOTION_CSS };
