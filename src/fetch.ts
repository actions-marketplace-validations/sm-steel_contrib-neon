import type { Calendar, Level } from "./types.ts";

const QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays { date weekday contributionCount contributionLevel }
        }
      }
    }
  }
}`;

const LEVELS: Record<string, Level> = {
	NONE: 0,
	FIRST_QUARTILE: 1,
	SECOND_QUARTILE: 2,
	THIRD_QUARTILE: 3,
	FOURTH_QUARTILE: 4,
};

export function toLevel(name: string): Level {
	return LEVELS[name] ?? 0;
}

interface ApiDay {
	date: string;
	weekday: number;
	contributionCount: number;
	contributionLevel: string;
}

interface ApiResponse {
	errors?: { message: string }[];
	data?: {
		user: {
			contributionsCollection: {
				contributionCalendar: {
					totalContributions: number;
					weeks: { contributionDays: ApiDay[] }[];
				};
			};
		} | null;
	};
}

/** Fetches the last year of contributions for `user` via GitHub's GraphQL API. */
export async function fetchCalendar(
	user: string,
	token: string,
	fetchFn: typeof fetch = fetch,
): Promise<Calendar> {
	const res = await fetchFn("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "contrib-neon",
		},
		body: JSON.stringify({ query: QUERY, variables: { login: user } }),
	});
	if (!res.ok) {
		throw new Error(`GitHub API responded ${res.status}: ${await res.text()}`);
	}
	const json = (await res.json()) as ApiResponse;
	if (json.errors?.length) {
		throw new Error(json.errors.map((e) => e.message).join("; "));
	}
	const account = json.data?.user;
	if (!account) throw new Error(`GitHub user "${user}" not found`);

	const cal = account.contributionsCollection.contributionCalendar;
	return {
		user,
		total: cal.totalContributions,
		weeks: cal.weeks.map((w) =>
			w.contributionDays.map((d) => ({
				date: d.date,
				weekday: d.weekday,
				count: d.contributionCount,
				level: toLevel(d.contributionLevel),
			})),
		),
	};
}
