import { addDays, endOfDay, format, startOfDay } from "date-fns";
import prisma from "../core/libs/prisma.js";

/**
 * Get image production statistics per week for a specific month and year
 */
export async function getImageProductionPerWeek({
	monthIndex,
	year,
}: {
	monthIndex: number;
	year: number;
}) {
	const totalDays = new Date(year, monthIndex + 1, 0).getDate();
	const totalWeeks = Math.ceil(totalDays / 7);
	const totalDaysInLastWeek = totalDays % 7 || 7;

	const weeks = Array.from({ length: totalWeeks }, (_, index) => {
		const startDate = new Date(year, monthIndex, index * 7 + 1);
		const isLastWeek = index === totalWeeks - 1;
		const endDate = addDays(
			startDate,
			isLastWeek ? totalDaysInLastWeek - 1 : 6,
		);

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
			deletedAt: null,
			role: "ARTIST",
		},
	});

	return output.map((item) => ({
		...item,
		teams: teams.map((team) => ({
			...team,
			count: item.teams.find((t) => t.id === team.id)?.count || 0,
		})),
	}));
}
