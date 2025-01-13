import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isUndefined } from "../core/libs/utils.js";
import type {
  Prisma,
  PrismaClient,
} from "../../../prisma/generated/client/index.js";
import { useJWT } from "../core/libs/jwt.js";
import {
  patchPayrollJsonSchema,
  getListPayrollQuerySchema,
  postPayrollJsonSchema,
  deletePayrollParamSchema,
} from "./payroll.schema.js";
import { TextChannel, ThreadChannel, type Client } from "discord.js";

const payrollRoute = new Hono().basePath("/payroll");

const onStatusChange = async ({
  prisma,
  newStatus,
  projectIds,
  discordClient,
}: {
  prisma: Omit<
    PrismaClient<Prisma.PrismaClientOptions>,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;
  newStatus: "DRAFT" | "PAID";
  projectIds: string[];
  discordClient: Client;
}) => {
  if (newStatus === "PAID") {
    await prisma.project.updateMany({
      where: {
        id: {
          in: projectIds,
        },
        isPaid: false,
      },
      data: {
        isPaid: true,
      },
    });

    const offering = await prisma.offering.findMany({
      where: {
        projectId: {
          in: projectIds,
        },
        status: "ACCEPTED",
      },
      select: {
        discordThreadId: true,
        team: {
          select: {
            discordChannelId: true,
          },
        },
      },
    });

    for (const offer of offering) {
      const channel = await discordClient.channels.fetch(
        offer.team.discordChannelId
      );
      if (!(channel instanceof TextChannel)) continue;

      const thread = await channel.threads.fetch(offer.discordThreadId);
      if (!(thread instanceof ThreadChannel)) return;

      const message = await thread.fetchStarterMessage();
      if (!message) return;

      message.react("✅");
    }
  }
};

payrollRoute.get(
  "/list",
  useJWT(),
  zValidator("query", getListPayrollQuerySchema),
  async (c) => {
    const query = c.req.valid("query");

    const include: Prisma.PayrollInclude = {};
    if (!isUndefined(query.with)) {
      const withArray = Array.isArray(query.with) ? query.with : [query.with];

      if (withArray.includes("team")) include.team = true;
      if (withArray.includes("projects")) include.projects = true;
    }

    const orderBy: Prisma.PayrollOrderByWithRelationInput = {};
    if (!isUndefined(query.sort)) {
      const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

      if (sortArray.includes("created_at:asc")) {
        orderBy.createdAt = "asc";
      }
      if (sortArray.includes("created_at:desc")) {
        orderBy.createdAt = "desc";
      }
    }

    const where: Prisma.PayrollWhereInput = {
      deletedAt: null, // filter for soft delete
    };
    if (!isUndefined(query.id_eq)) {
      where.id = query.id_eq;
    }
    if (!isUndefined(query.status_eq)) {
      where.status = query.status_eq;
    }
    if (!isUndefined(query.team_id_eq)) {
      where.teamId = query.team_id_eq;
    }

    const result = await prisma.payroll.findMany({
      include,
      orderBy,
      where,
      ...(!isUndefined(query.skip) && { skip: query.skip }),
      ...(!isUndefined(query.limit) && { take: query.limit + 1 }),
    });

    let hasNext = false;
    if (query.limit && result.length > query.limit) {
      result.pop();
      hasNext = true;
    }

    const hasPrev = !isUndefined(query.skip) && query.skip > 0;

    return c.json({
      data: {
        docs: result,
        pagination: {
          hasNext,
          hasPrev,
        },
      },
    });
  }
);

payrollRoute.post(
  "/",
  useJWT(),
  zValidator("json", postPayrollJsonSchema),
  async (c) => {
    const body = c.req.valid("json");

    const { payroll } = await prisma.$transaction(async (trx) => {
      const projects = await trx.project.findMany({
        where: {
          id: {
            in: body.projectIds,
          },
        },
      });

      const amount = projects.reduce((acc, project) => acc + project.fee, 0);

      const payroll = await trx.payroll.create({
        data: {
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          status: body.status,
          teamId: body.teamId,
          amount: amount,
          projects: {
            connect: [...projects.map((project) => ({ id: project.id }))],
          },
        },
      });

      if (body.status === "PAID") {
        await trx.project.updateMany({
          where: {
            id: {
              in: body.projectIds,
            },
          },
          data: {
            isPaid: true,
          },
        });
      }

      await onStatusChange({
        prisma: trx,
        newStatus: body.status,
        projectIds: body.projectIds,
        discordClient: c.get("discordClient"),
      });

      return { payroll };
    });

    return c.json({
      data: {
        doc: payroll,
      },
    });
  }
);

payrollRoute.delete(
  "/:id",
  useJWT(),
  zValidator("param", deletePayrollParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");

    const { payroll } = await prisma.$transaction(async (trx) => {
      const payroll = await trx.payroll.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // disconnect projects
      await trx.project.updateMany({
        where: {
          payrollId: id,
        },
        data: {
          payrollId: null,
        },
      });

      return { payroll };
    });

    return c.json({
      data: {
        doc: payroll,
      },
    });
  }
);

payrollRoute.patch(
  "/:id",
  useJWT(),
  zValidator("json", patchPayrollJsonSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    await prisma.$transaction(async (trx) => {
      await trx.payroll.update({
        where: {
          id,
        },
        data: {
          ...(isUndefined(body.status) ? {} : { status: body.status }),
        },
      });

      if (body.status === "PAID") {
        const projectIds = await trx.project.findMany({
          where: {
            payrollId: id,
          },
          select: {
            id: true,
          },
        });

        await onStatusChange({
          prisma: trx,
          newStatus: body.status,
          projectIds: projectIds.map((project) => project.id),
          discordClient: c.get("discordClient"),
        });
      }
    });

    return c.json({
      data: {},
    });
  }
);

export default payrollRoute;
