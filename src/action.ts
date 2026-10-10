// GitHub Action entry point. Inputs arrive as INPUT_<NAME> environment variables.
import { fetchCalendar } from "./fetch.ts";
import { generate } from "./generate.ts";

function input(name: string, required = false): string {
	const value = (process.env[`INPUT_${name.toUpperCase()}`] ?? "").trim();
	if (required && !value) throw new Error(`Input required: ${name}`);
	return value;
}

async function main() {
	const user = input("github_user_name", true);
	const token = input("github_token", true);
	const outputs = input("outputs", true).split("\n");
	const cal = await fetchCalendar(user, token);
	console.log(
		`${user}: ${cal.total} contributions over ${cal.weeks.length} weeks`,
	);
	for (const path of await generate(cal, outputs)) console.log(`wrote ${path}`);
}

main().catch((err: unknown) => {
	console.log(`::error::${err instanceof Error ? err.message : err}`);
	process.exit(1);
});
