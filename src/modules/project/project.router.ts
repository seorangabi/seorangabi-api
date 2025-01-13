import "./project.worker.js";

import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { isUndefined } from "../core/libs/utils.js";
import type { Prisma } from "../../../prisma/generated/client/index.js";
import {
  postProjectJsonSchema,
  getListProjectJsonSchema,
  patchProjectJsonSchema,
} from "./project.schema.js";
import { createOfferingAndInteraction } from "../offering/offering.service.js";
import { getOfferingTeamThreadFromProjectId } from "./project.service.js";
import { useJWT } from "../core/libs/jwt.js";
import { randomUUID } from "node:crypto";

const projectRoute = new Hono().basePath("/project");

projectRoute.get(
  "/list",
  useJWT(),
  zValidator("query", getListProjectJsonSchema),
  async (c) => {
    const query = c.req.valid("query");

    const include: Prisma.ProjectInclude = {};
    if (!isUndefined(query.with)) {
      const withArray = Array.isArray(query.with) ? query.with : [query.with];

      if (withArray.includes("team")) include.team = true;
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {};
    if (!isUndefined(query.sort)) {
      const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

      if (sortArray.includes("created_at:asc")) {
        orderBy.createdAt = "asc";
      }
      if (sortArray.includes("created_at:desc")) {
        orderBy.createdAt = "desc";
      }
    }

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null, // filter for soft delete
    };
    if (!isUndefined(query.id_eq)) {
      where.id = query.id_eq;
    }
    if (!isUndefined(query.team_id_eq)) {
      where.teamId = query.team_id_eq;
    }
    if (!isUndefined(query.status_eq)) {
      where.status = query.status_eq;
    }
    if (query.is_paid_eq === "true") where.isPaid = true;
    if (query.is_paid_eq === "false") where.isPaid = false;

    const result = await prisma.project.findMany({
      include,
      where,
      orderBy,
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

projectRoute.post(
  "/",
  useJWT(),
  zValidator("json", postProjectJsonSchema),
  async (c) => {
    const form = c.req.valid("json");

    const { project } = await prisma.$transaction(async (trx) => {
      const projectId = randomUUID();

      const { tasks, totalFee, totalImageCount } = form.tasks.reduce(
        (acc, task) => {
          const temp: Prisma.TaskCreateManyInput = {
            projectId,
            fee: task.fee,
            imageCount: task.imageCount,
            note: task.note || "",
            attachmentUrl: task.attachmentUrl,
          };

          return {
            tasks: [...acc.tasks, temp],
            totalFee: acc.totalFee + task.fee,
            totalImageCount: acc.totalImageCount + task.imageCount,
          };
        },
        {
          tasks: [],
          totalFee: 0,
          totalImageCount: 0,
        } as {
          tasks: Prisma.TaskCreateManyInput[];
          totalFee: number;
          totalImageCount: number;
        }
      );

      const project = await trx.project.create({
        data: {
          id: projectId,
          name: form.name,
          imageRatio: form.imageRatio,
          teamId: form.teamId,
          clientName: form.clientName,
          deadline: form.deadline,

          fee: totalFee,
          imageCount: totalImageCount,
          confirmationDuration: form.confirmationDuration,
        },
      });

      await trx.task.createMany({
        data: tasks,
      });

      const discordClient = c.get("discordClient");

      await createOfferingAndInteraction({
        prisma: trx,
        body: {
          deadline: form.deadline,
          fee: totalFee,
          projectId: project.id,
          teamId: form.teamId,
          confirmationDuration: form.confirmationDuration,
        },
        discordClient,
        project: {
          clientName: form.clientName,
          name: form.name,
          imageRatio: form.imageRatio,
          confirmationDuration: form.confirmationDuration,
        },
        tasks,
      });

      return { project };
    });

    return c.json({
      data: {
        doc: project,
      },
    });
  }
);

projectRoute.delete("/:id", useJWT(), async (c) => {
  const id = c.req.param("id");
  const result = await prisma.project.update({
    data: {
      deletedAt: new Date().toISOString(),
    },
    where: {
      id,
    },
  });

  return c.json({
    data: {
      doc: result,
    },
  });
});

projectRoute.patch(
  "/:id",
  useJWT(),
  zValidator("json", patchProjectJsonSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const { project } = await prisma.$transaction(async (trx) => {
      const project = await trx.project.update({
        where: {
          id,
        },
        data: {
          name: isUndefined(body.name) ? undefined : body.name,
          imageRatio: isUndefined(body.imageRatio)
            ? undefined
            : body.imageRatio,
          status: isUndefined(body.status) ? undefined : body.status,
          teamId: isUndefined(body.teamId) ? undefined : body.teamId,
          imageCount: isUndefined(body.imageCount)
            ? undefined
            : body.imageCount,
          clientName: isUndefined(body.clientName)
            ? undefined
            : body.clientName,
          doneAt: body.status === "DONE" ? new Date().toISOString() : undefined,

          // Offering
          fee: isUndefined(body.fee) ? undefined : body.fee,
          deadline: isUndefined(body.deadline) ? undefined : body.deadline,
        },
      });

      if (body.status === "DONE") {
        const discordClient = c.get("discordClient");

        const { thread, team } = await getOfferingTeamThreadFromProjectId({
          prisma: trx,
          discordClient,
          projectId: id,
        });

        await thread.send({
          content: `Thx guys <@${team.discordUserId}> project selesai 🔥🔥🔥`,
        });
      }

      if (body.status === "CANCELLED") {
        const discordClient = c.get("discordClient");

        const { thread, team } = await getOfferingTeamThreadFromProjectId({
          prisma: trx,
          discordClient,
          projectId: id,
        });

        await thread.send({
          content: `Sorry guys <@${team.discordUserId}> project dibatalkan ❌`,
        });
      }

      return { project };
    });

    return c.json({
      data: {
        doc: project,
      },
    });
  }
);

export default projectRoute;
