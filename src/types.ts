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

export interface Palette {
	dark: boolean;
	background: string;
	border: string;
	empty: string;
	/** Colors for levels 1-4. */
	levels: [string, string, string, string];
	/** Hot center drawn on level-4 cells. */
	core: string;
	text: string;
	subtext: string;
	accent: string;
	/** Chromatic-aberration channel colors for glitch frames. */
	glitchA: string;
	glitchB: string;
}

export interface RenderOptions {
	palette: Palette;
	hud: boolean;
	glitch: boolean;
}
