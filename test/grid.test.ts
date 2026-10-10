import { describe, expect, it } from "vitest";
import { layout } from "../src/render/grid.ts";
import type { Calendar } from "../src/types.ts";

const cal: Calendar = {
	user: "octo",
	total: 6,
	weeks: [
		// first week starts mid-week (Thursday), like the real API
		[
			{ date: "2025-10-09", weekday: 4, count: 0, level: 0 },
			{ date: "2025-10-10", weekday: 5, count: 1, level: 1 },
			{ date: "2025-10-11", weekday: 6, count: 5, level: 4 },
		],
		[{ date: "2025-10-12", weekday: 0, count: 0, level: 0 }],
	],
};

describe("layout", () => {
	it("places cells by week column and weekday row", () => {
		const g = layout(cal, { hud: false });
		const sat = g.cells.find((c) => c.date === "2025-10-11");
		const sun = g.cells.find((c) => c.date === "2025-10-12");
		expect(sat).toMatchObject({ col: 0, row: 6, level: 4 });
		expect(sun).toMatchObject({ col: 1, row: 0 });
		expect(sun?.x).toBeGreaterThan(sat?.x ?? Infinity);
		expect(sat?.y).toBeGreaterThan(sun?.y ?? Infinity);
	});

	it("reserves header space only when the hud is on", () => {
		const plain = layout(cal, { hud: false });
		const hud = layout(cal, { hud: true });
		expect(hud.height).toBeGreaterThan(plain.height);
		expect(hud.gridTop).toBeGreaterThan(plain.gridTop);
		expect(hud.width).toBe(plain.width);
	});

	it("sizes the canvas to the number of weeks", () => {
		const g = layout(cal, { hud: false });
		expect(g.cols).toBe(2);
		expect(g.width).toBe(g.gridLeft * 2 + 2 * g.cell + g.gap);
	});
});
