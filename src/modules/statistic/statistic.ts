import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import prisma from "../core/libs/prisma.js";
import { add, addDays, endOfDay, format, startOfDay } from "date-fns";
import { useJWT } from "../core/libs/jwt.js";

const statisticRoute = new Hono().basePath("/statistic");

statisticRoute.get(
  "/image-production-per-week",
  useJWT(),
  zValidator(
    "query",
    z.object({ monthIndex: z.coerce.number(), year: z.coerce.number() })
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

    let output: {
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
  }
);

export default statisticRoute;
