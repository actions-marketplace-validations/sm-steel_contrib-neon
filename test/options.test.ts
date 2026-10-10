import { describe, expect, it } from "vitest";
import { parseOutput } from "../src/options.ts";
import { FLAVORS } from "../src/palette.ts";

describe("parseOutput", () => {
	it("defaults to mocha with hud and glitch on", () => {
		const o = parseOutput("dist/neon.svg");
		expect(o.path).toBe("dist/neon.svg");
		expect(o.hud).toBe(true);
		expect(o.glitch).toBe(true);
		expect(o.palette).toEqual(FLAVORS.mocha);
	});

	it("picks a flavor preset", () => {
		expect(parseOutput("a.svg?flavor=latte").palette).toEqual(FLAVORS.latte);
	});

	it("rejects unknown flavors", () => {
		expect(() => parseOutput("a.svg?flavor=espresso")).toThrow(/flavor/);
	});

	it("parses boolean toggles", () => {
		const o = parseOutput("a.svg?hud=false&glitch=0");
		expect(o.hud).toBe(false);
		expect(o.glitch).toBe(false);
	});

	it("overrides colors, accepting encoded # or bare hex", () => {
		const o = parseOutput(
			"a.svg?flavor=latte&color_levels=%23111111,222222,%23333333,444444&color_background=000000&color_empty=%23abc",
		);
		expect(o.palette.levels).toEqual([
			"#111111",
			"#222222",
			"#333333",
			"#444444",
		]);
		expect(o.palette.background).toBe("#000000");
		expect(o.palette.empty).toBe("#abc");
		expect(o.palette.dark).toBe(false);
	});

	it("rejects malformed colors and wrong level counts", () => {
		expect(() => parseOutput("a.svg?color_background=nothex")).toThrow(/color/);
		expect(() => parseOutput("a.svg?color_levels=111111,222222")).toThrow(
			/4 colors/,
		);
	});

	it("ignores surrounding whitespace", () => {
		expect(parseOutput("  a.svg?flavor=frappe  ").path).toBe("a.svg");
	});
});
