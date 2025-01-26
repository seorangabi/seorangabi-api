import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import prisma from "../core/libs/prisma.js";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { useJWT } from "../core/libs/jwt.js";
import type {
	StatisticPunchMyHead,
	StatisticVisitor,
} from "../../../prisma/generated/client/index.js";

const statisticRoute = new Hono().basePath("/statistic");

statisticRoute.get(
	"/image-production-per-week",
	useJWT(),
	zValidator(
		"query",
		z.object({ monthIndex: z.coerce.number(), year: z.coerce.number() }),
	),
	async (c) => {
		const query = c.req.valid("query");

		const totalDays = new Date(query.year, query.monthIndex, 0).getDate();
		const totalWeeks = Math.ceil(totalDays / 7);
		const totalDaysInLastWeek = totalDays % 7;

		const weeks = Array.from({ length: totalWeeks }, (_, index) => {
			const startDate = new Date(query.year, query.monthIndex, index * 7 + 1);
			const isLastWeek = index === totalWeeks - 1;
			const endDate = addDays(startDate, isLastWeek ? totalDaysInLastWeek : 6);

			return {
				start: startOfDay(startDate).toISOString(),
				end: endOfDay(endDate).toISOString(),
			};
		});

		const output: {
			start: string;
			end: string;
			teams: {
				id: string | null;
				count: number;
			}[];
		}[] = [];

		for (const week of weeks) {
			const result = await prisma.project.groupBy({
				_sum: {
					imageCount: true,
				},
				where: {
					doneAt: {
						gte: new Date(week.start),
						lte: new Date(week.end),
					},
					status: "DONE",
				},
				by: ["teamId"],
			});

			output.push({
				start: week.start,
				end: week.end,
				teams: result.map((team) => ({
					id: team.teamId as string,
					count: team._sum.imageCount ?? 0,
				})),
			});
		}

		const teams = await prisma.team.findMany({
			select: {
				id: true,
				name: true,
			},
			where: {
				deletedAt: null, // filter for soft delete
				role: "ARTIST",
			},
		});

		const docs = output.map((item) => ({
			...item,
			teams: teams.map((team) => ({
				...team,
				count: item.teams.find((t) => t.id === team.id)?.count || 0,
			})),
		}));

		return c.json({
			data: {
				docs,
			},
		});
	},
);

statisticRoute.post(
	"/punch-my-head",
	zValidator(
		"json",
		z.object({
			country: z.string().optional(),
		}),
	),
	async (c) => {
		const body = c.req.valid("json");
		const country = body.country;

		const today = startOfDay(new Date());

		const punchMyHead = await prisma.statisticPunchMyHead.findFirst({
			where: {
				date: today,
			},
		});

		let result: StatisticPunchMyHead | null = null;

		if (punchMyHead) {
			result = await prisma.statisticPunchMyHead.update({
				where: {
					id: punchMyHead.id,
				},
				data: {
					count: punchMyHead.count + 1,
					country,
				},
			});
		} else {
			result = await prisma.statisticPunchMyHead.create({
				data: {
					date: today,
					count: 1,
					country,
				},
			});
		}

		return c.json({
			data: {
				date: format(today, "yyyy-MM-dd"),
				count: result.count || 0,
				country,
			},
		});
	},
);

statisticRoute.post(
	"/visitor",
	zValidator(
		"json",
		z.object({
			country: z.string().optional(),
		}),
	),
	async (c) => {
		const body = c.req.valid("json");
		const country = body.country;

		const today = startOfDay(new Date());

		const visitor = await prisma.statisticVisitor.findFirst({
			where: {
				date: today,
			},
		});

		let result: StatisticVisitor | null = null;

		if (visitor) {
			result = await prisma.statisticVisitor.update({
				where: {
					id: visitor.id,
				},
				data: {
					count: visitor.count + 1,
					country,
				},
			});
		} else {
			result = await prisma.statisticVisitor.create({
				data: {
					date: today,
					count: 1,
					country,
				},
			});
		}

		return c.json({
			data: {
				date: format(today, "yyyy-MM-dd"),
				count: result.count || 0,
				country,
			},
		});
	},
);

statisticRoute.get(
	"/visitor-and-punch-my-head",
	useJWT(),
	zValidator(
		"query",
		z.object({
			monthIndex: z.coerce.number(),
			year: z.coerce.number(),
		}),
	),
	async (c) => {
		const query = c.req.valid("query");

		const visitor = await prisma.statisticVisitor.findMany({
			where: {
				date: {
					gte: startOfDay(new Date(query.year, query.monthIndex, 1)),
					lte: endOfDay(new Date(query.year, query.monthIndex + 1, 0)),
				},
			},
		});

		// const punchMyHead = await prisma.statisticPunchMyHead.findMany({
		// 	where: {
		// 		date: {
		// 			gte: startOfDay(new Date(query.year, query.monthIndex, 1)),
		// 			lte: endOfDay(new Date(query.year, query.monthIndex + 1, 0)),
		// 		},
		// 	},
		// });

		const countrySet = new Set<string>();

		const visitorMap = visitor.reduce((acc, curr) => {
			const current = acc.get(format(curr.date, "dd-MM-yyyy"));

			if (!current) {
				acc.set(format(curr.date, "dd-MM-yyyy"), {
					[curr.country]: curr.count,
				});
			} else {
				acc.set(format(curr.date, "dd-MM-yyyy"), {
					...current,
					[curr.country]: curr.count,
				});
			}

			countrySet.add(curr.country);

			return acc;
		}, new Map<string, Record<string, number>>());

		// const punchMyHeadMap = punchMyHead.reduce((acc, curr) => {
		// 	const current = acc.get(format(curr.date, "dd-MM-yyyy"));

		// 	if (!current) {
		// 		acc.set(format(curr.date, "dd-MM-yyyy"), {
		// 			[curr.country]: curr.count,
		// 		});
		// 	} else {
		// 		acc.set(format(curr.date, "dd-MM-yyyy"), {
		// 			...current,
		// 			[curr.country]: curr.count,
		// 		});
		// 	}

		// 	countrySet.add(curr.country);

		// 	return acc;
		// }, new Map<string, Record<string, number>>());

		// generate date from 1 to end of month
		const result = Array.from(
			{ length: new Date(query.year, query.monthIndex + 1, 0).getDate() },
			(_, index) => {
				const date = new Date(query.year, query.monthIndex, index + 1);
				const key = format(date, "dd-MM-yyyy");
				const visitorCount = visitorMap.get(key);
				// const punchMyHeadCount = punchMyHeadMap.get(key);

				return {
					date: key,
					visitor: visitorCount || {},
					// punchMyHead: punchMyHeadCount || {},
				};
			},
		);

		return c.json({
			data: {
				docs: result,
				countries: Array.from(countrySet),
			},
		});
	},
);

export default statisticRoute;
