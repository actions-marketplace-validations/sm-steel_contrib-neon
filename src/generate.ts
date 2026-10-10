import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseOutput } from "./options.ts";
import { renderSvg } from "./render/svg.ts";
import type { Calendar } from "./types.ts";

/** Renders `cal` once per output line and writes each file. Returns written paths. */
export async function generate(
	cal: Calendar,
	outputs: string[],
): Promise<string[]> {
	const specs = outputs.filter((l) => l.trim()).map(parseOutput);
	if (specs.length === 0) throw new Error("No outputs given");
	for (const spec of specs) {
		await mkdir(dirname(spec.path), { recursive: true });
		await writeFile(spec.path, renderSvg(cal, spec));
	}
	return specs.map((s) => s.path);
}
