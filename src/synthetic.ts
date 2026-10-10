import { seeded } from "@sm-steel/neon-kit";
import type { Calendar, Day, Level } from "./types.ts";

/**
 * A fake but plausible year of contributions, for offline previews and tests.
 * `activity` ranges 0 (empty) to 1 (busy every day).
 */
export function syntheticCalendar(
	user: string,
	activity: number,
	end = new Date("2026-10-10T00:00:00Z"),
): Calendar {
	const rand = seeded(`${user}:${activity}`);
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - 364);

	const weeks: Day[][] = [];
	let total = 0;
	for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
		const weekday = d.getUTCDay();
		if (weekday === 0 || weeks.length === 0) weeks.push([]);
		// streaky: busier mid-week, with occasional bursts
		const busy = rand() < activity * (weekday === 0 || weekday === 6 ? 0.5 : 1);
		const count = busy ? Math.ceil(rand() ** 2 * 18) : 0;
		total += count;
		weeks[weeks.length - 1].push({
			date: d.toISOString().slice(0, 10),
			weekday,
			count,
			level: 0,
		});
	}
	for (const day of weeks.flat()) day.level = levelFor(day.count);
	return { user, total, weeks };
}

function levelFor(count: number): Level {
	if (count === 0) return 0;
	if (count <= 3) return 1;
	if (count <= 7) return 2;
	if (count <= 12) return 3;
	return 4;
}
