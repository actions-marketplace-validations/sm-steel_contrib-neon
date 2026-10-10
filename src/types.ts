import type { Palette } from "@sm-steel/neon-kit";

export type { Palette };

export type Level = 0 | 1 | 2 | 3 | 4;

export interface Day {
	date: string;
	/** 0 = Sunday … 6 = Saturday, i.e. the row in GitHub's graph. */
	weekday: number;
	count: number;
	level: Level;
}

export interface Calendar {
	user: string;
	total: number;
	/** Week columns, oldest first. The first week may start mid-week. */
	weeks: Day[][];
}

export interface RenderOptions {
	palette: Palette;
	hud: boolean;
	glitch: boolean;
}
