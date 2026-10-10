#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fetchCalendar } from "./fetch.ts";
import { generate } from "./generate.ts";
import type { Calendar } from "./types.ts";

const USAGE = `Usage: contrib-neon --user <login> --out <file.svg?options> [--out ...]

Options:
  --user     GitHub login whose contribution graph to render
  --out      Output file, repeatable. Query options: flavor=latte|frappe|macchiato|mocha,
             hud=false, glitch=false, color_levels=%23..,..,..,.., color_background, color_empty
  --token    GitHub token (default: $GITHUB_TOKEN or $GH_TOKEN)
  --fixture  Read a calendar JSON file instead of calling the API`;

async function main() {
	const { values } = parseArgs({
		options: {
			user: { type: "string" },
			out: { type: "string", multiple: true },
			token: { type: "string" },
			fixture: { type: "string" },
			help: { type: "boolean", short: "h" },
		},
	});
	if (values.help || !values.out?.length || (!values.user && !values.fixture)) {
		console.log(USAGE);
		process.exit(values.help ? 0 : 1);
	}

	let cal: Calendar;
	if (values.fixture) {
		cal = JSON.parse(await readFile(values.fixture, "utf8")) as Calendar;
	} else {
		const token =
			values.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
		if (!token)
			throw new Error("A GitHub token is required (--token or $GITHUB_TOKEN)");
		cal = await fetchCalendar(values.user as string, token);
	}
	for (const path of await generate(cal, values.out))
		console.log(`wrote ${path}`);
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
