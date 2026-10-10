import { describe, expect, it, vi } from "vitest";
import { fetchCalendar, toLevel } from "../src/fetch.ts";

describe("toLevel", () => {
	it("maps GitHub quartile names to 0-4", () => {
		expect(toLevel("NONE")).toBe(0);
		expect(toLevel("FIRST_QUARTILE")).toBe(1);
		expect(toLevel("SECOND_QUARTILE")).toBe(2);
		expect(toLevel("THIRD_QUARTILE")).toBe(3);
		expect(toLevel("FOURTH_QUARTILE")).toBe(4);
	});
});

describe("fetchCalendar", () => {
	const ok = (body: unknown) =>
		vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

	it("normalizes the GraphQL response", async () => {
		const fetchFn = ok({
			data: {
				user: {
					contributionsCollection: {
						contributionCalendar: {
							totalContributions: 3,
							weeks: [
								{
									contributionDays: [
										{
											date: "2026-01-04",
											weekday: 0,
											contributionCount: 3,
											contributionLevel: "THIRD_QUARTILE",
										},
									],
								},
							],
						},
					},
				},
			},
		});
		const cal = await fetchCalendar("octo", "tok", fetchFn);
		expect(cal).toEqual({
			user: "octo",
			total: 3,
			weeks: [[{ date: "2026-01-04", weekday: 0, count: 3, level: 3 }]],
		});
		const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"bearer tok",
		);
	});

	it("surfaces GraphQL errors and unknown users", async () => {
		await expect(
			fetchCalendar("x", "t", ok({ errors: [{ message: "Bad credentials" }] })),
		).rejects.toThrow(/Bad credentials/);
		await expect(
			fetchCalendar("ghost", "t", ok({ data: { user: null } })),
		).rejects.toThrow(/ghost/);
	});

	it("surfaces HTTP failures", async () => {
		const fetchFn = vi.fn(async () => new Response("nope", { status: 401 }));
		await expect(fetchCalendar("x", "t", fetchFn)).rejects.toThrow(/401/);
	});
});
