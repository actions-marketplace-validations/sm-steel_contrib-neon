// Local preview: renders real + synthetic calendars and an HTML page that shows
// them on GitHub's light and dark backgrounds, loaded via <img> like GitHub does.
// Usage: node src/preview.ts [login]   (uses `gh auth token` for real data)
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fetchCalendar } from "./fetch.ts";
import { generate } from "./generate.ts";
import { syntheticCalendar } from "./synthetic.ts";
import type { Calendar } from "./types.ts";

const OUT = "preview/out";
const user = process.argv[2] ?? "sm-steel";

interface Shot {
	title: string;
	file: string;
	bg: "light" | "dark";
}

async function render(
	cal: Calendar,
	name: string,
	flavors: string[],
): Promise<Shot[]> {
	const lines = flavors.map((f) => `${OUT}/${name}-${f}.svg?flavor=${f}`);
	await generate(cal, lines);
	return flavors.map((f) => ({
		title: `${name} · ${f}`,
		file: `${name}-${f}.svg`,
		bg: f === "latte" ? "light" : "dark",
	}));
}

function realCalendar(): Promise<Calendar> | null {
	try {
		const token = execFileSync("gh", ["auth", "token"], {
			encoding: "utf8",
		}).trim();
		return fetchCalendar(user, token);
	} catch {
		console.warn("gh auth token unavailable; skipping real data");
		return null;
	}
}

const shots: Shot[] = [];
const real = realCalendar();
if (real)
	shots.push(
		...(await render(await real, user, [
			"latte",
			"mocha",
			"frappe",
			"macchiato",
		])),
	);
// README demo images, from a fixed synthetic calendar so they stay stable
await generate(syntheticCalendar("busy-dev", 0.85), [
	"docs/demo-latte.svg?flavor=latte",
	"docs/demo-mocha.svg?flavor=mocha",
]);
shots.push(
	...(await render(syntheticCalendar("busy-dev", 0.85), "busy", [
		"latte",
		"mocha",
	])),
);
shots.push(
	...(await render(syntheticCalendar("weekend-dev", 0.25), "sparse", [
		"latte",
		"mocha",
	])),
);
shots.push(
	...(await render(syntheticCalendar("new-dev", 0), "empty", ["mocha"])),
);

const html = `<!doctype html><meta charset="utf-8"><title>contrib-neon preview</title>
<style>
body{margin:0;font:14px system-ui;background:#888}
header{position:sticky;top:0;padding:10px 16px;background:#222;color:#eee;display:flex;gap:12px;align-items:center;z-index:1}
section{padding:24px 16px}
.light{background:#ffffff;color:#1f2328}.dark{background:#0d1117;color:#e6edf3}
h2{font-size:13px;font-weight:600;margin:0 0 10px;opacity:.7}
img{max-width:100%;display:block}
</style>
<header><b>contrib-neon preview</b><button onclick="replay()">Replay (restart animation)</button></header>
${shots.map((s) => `<section class="${s.bg}"><h2>${s.title}</h2><img src="${s.file}" alt=""></section>`).join("\n")}
<script>function replay(){for(const i of document.images){i.src=i.src.split('?')[0]+'?t='+Date.now()}}</script>`;
await writeFile(`${OUT}/index.html`, html);
console.log(`preview: ${OUT}/index.html (${shots.length} renders)`);
