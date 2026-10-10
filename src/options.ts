import { FLAVORS, isFlavor } from "./palette.ts";
import type { Palette, RenderOptions } from "./types.ts";

export interface OutputSpec extends RenderOptions {
	path: string;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function color(value: string, key: string): string {
	const v = value.trim();
	if (!HEX.test(v)) throw new Error(`Invalid color for ${key}: "${value}"`);
	return v.startsWith("#") ? v : `#${v}`;
}

function bool(value: string | null, fallback: boolean): boolean {
	if (value === null) return fallback;
	return !["false", "0", "no", "off"].includes(value.toLowerCase());
}

/**
 * Parses one `outputs` line, snk-style: `path/file.svg?flavor=latte&hud=false`.
 * `#` must be URL-encoded as `%23` (or omitted) inside color values.
 */
export function parseOutput(line: string): OutputSpec {
	const [path, query = ""] = line.trim().split("?", 2);
	const params = new URLSearchParams(query);

	const flavor = params.get("flavor") ?? "mocha";
	if (!isFlavor(flavor)) {
		throw new Error(
			`Unknown flavor "${flavor}" (expected ${Object.keys(FLAVORS).join(", ")})`,
		);
	}
	const palette: Palette = { ...FLAVORS[flavor] };

	const levels = params.get("color_levels");
	if (levels !== null) {
		const list = levels.split(",").map((c) => color(c, "color_levels"));
		if (list.length !== 4) {
			throw new Error("color_levels needs exactly 4 colors (levels 1-4)");
		}
		palette.levels = list as Palette["levels"];
	}
	const bg = params.get("color_background");
	if (bg !== null) palette.background = color(bg, "color_background");
	const empty = params.get("color_empty");
	if (empty !== null) palette.empty = color(empty, "color_empty");

	return {
		path,
		palette,
		hud: bool(params.get("hud"), true),
		glitch: bool(params.get("glitch"), true),
	};
}
