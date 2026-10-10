import type { Calendar, Level } from "../types.ts";

export interface Cell {
	date: string;
	count: number;
	level: Level;
	col: number;
	row: number;
	x: number;
	y: number;
}

export interface Grid {
	cells: Cell[];
	cols: number;
	cell: number;
	gap: number;
	gridLeft: number;
	gridTop: number;
	gridWidth: number;
	gridHeight: number;
	width: number;
	height: number;
}

const CELL = 11;
const GAP = 3;
const PAD = 16;
const HUD_HEIGHT = 22;

export function layout(cal: Calendar, opts: { hud: boolean }): Grid {
	const step = CELL + GAP;
	const gridTop = PAD + (opts.hud ? HUD_HEIGHT : 0);
	const cells = cal.weeks.flatMap((week, col) =>
		week.map((day) => ({
			date: day.date,
			count: day.count,
			level: day.level,
			col,
			row: day.weekday,
			x: PAD + col * step,
			y: gridTop + day.weekday * step,
		})),
	);
	const cols = cal.weeks.length;
	const gridWidth = cols * step - GAP;
	const gridHeight = 7 * step - GAP;
	return {
		cells,
		cols,
		cell: CELL,
		gap: GAP,
		gridLeft: PAD,
		gridTop,
		gridWidth,
		gridHeight,
		width: PAD * 2 + gridWidth,
		height: gridTop + gridHeight + PAD,
	};
}
