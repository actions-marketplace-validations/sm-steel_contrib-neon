import { describe, expect, it } from "vitest";
import { parseOutput } from "../src/options.ts";
import { renderSvg } from "../src/render/svg.ts";
import { syntheticCalendar } from "../src/synthetic.ts";

const cal = syntheticCalendar("octo", 0.7);
const mocha = parseOutput("x.svg?flavor=mocha");

describe("renderSvg", () => {
	it("is deterministic for the same input", () => {
		expect(renderSvg(cal, mocha)).toBe(renderSvg(cal, mocha));
	});

	it("draws one cell per day plus a glow layer per active level", () => {
		const svg = renderSvg(cal, mocha);
		const days = cal.weeks.flat().length;
		expect(svg.match(/<rect class="c"[^>]*width="11"/g)?.length).toBe(days);
		for (const l of [1, 2, 3, 4]) {
			expect(svg).toContain(`<filter id="g${l}"`);
			expect(svg).toContain(`href="#l${l}" filter="url(#g${l})"`);
		}
	});

	it("toggles the hud and glitch layers", () => {
		const off = renderSvg(cal, parseOutput("x.svg?hud=false&glitch=false"));
		expect(off).not.toContain("CONTRIB.LOG");
		expect(off).not.toContain("@font-face");
		expect(off).not.toContain('class="nk-gk');
		const on = renderSvg(cal, mocha);
		expect(on).toContain("CONTRIB.LOG");
		expect(on).toContain("@font-face{font-family:'ContribNeon Mono'");
		expect(on).toContain('class="nk-gk');
	});

	it("escapes the user name and respects reduced motion", () => {
		const svg = renderSvg({ ...cal, user: "a<b&c" }, mocha);
		expect(svg).toContain("a&lt;b&amp;c");
		expect(svg).toContain("prefers-reduced-motion");
	});

	it("emits the reduced-motion rule last so it overrides the glitch animations too", () => {
		expect(renderSvg(cal, mocha)).toMatch(
			/@media \(prefers-reduced-motion:reduce\)\{[^}]*\{animation:none\}\}<\/style>/,
		);
	});

	it("stays within the size budget for a full year", () => {
		expect(renderSvg(cal, mocha).length).toBeLessThan(150_000);
	});

	it("handles an empty year", () => {
		const svg = renderSvg(syntheticCalendar("idle", 0), mocha);
		expect(svg).toContain("<svg");
		expect(svg).not.toContain('id="l4"><rect');
	});
});
