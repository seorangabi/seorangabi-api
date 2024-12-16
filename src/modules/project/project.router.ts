import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isUndefined } from "../core/libs/utils.js";
import type { Prisma } from "../../../prisma/generated/client/index.js";
import { createProjectJsonSchema } from "./project.schema.js";
import { createOfferingAndInteraction } from "../offering/offering.service.js";
import { getOfferingTeamThreadFromProjectId } from "./project.service.js";
import { useJWT } from "../../libs/jwt.js";
// import { createOfferingDeadlineNotification } from "../offering/offering.queue.js";

const projectRoute = new Hono().basePath("/project");

const withTeam = z.enum(["team"]);
const sortTeam = z.enum(["created_at:asc", "created_at:desc"]);

projectRoute.get(
  "/list",
  useJWT(),
  zValidator(
    "query",
    z.object({
      id_eq: z.string().optional(),
      team_id_eq: z.string().optional(),
      status_eq: z
        .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE", "CANCELLED"])
        .optional(),
      is_paid_eq: z.enum(["true", "false"]).optional(),
      skip: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      with: z.union([withTeam, z.array(withTeam)]).optional(),
      sort: z.union([sortTeam, z.array(sortTeam)]).optional(),
    })
  ),
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
  zValidator("json", createProjectJsonSchema),
  async (c) => {
    const body = c.req.valid("json");

    const doc = await prisma.$transaction(async (trx) => {
      console.log("Creating project:", JSON.stringify(body));
      const result = await trx.project.create({
        data: body,
      });
      console.log("Project created:", result.id);

      const discordClient = c.get("discordClient");

      const { offering, team } = await createOfferingAndInteraction({
        prisma: trx,
        body: {
          deadline: body.deadline,
          fee: body.fee,
          note: body.note,
          projectId: result.id,
          teamId: body.teamId,
        },
        discordClient,
        project: {
          clientName: body.clientName,
          name: body.name,
          imageRatio: body.imageRatio,
        },
      });

      // console.log("Creating offering deadline notification");
      // await createOfferingDeadlineNotification({
      //   offering,
      //   message: `Mohon dikonfirmasi ya guys <@${team.discordUserId}> \nNotifikasi ini akan dikirimkan setiap 30 menit.`,
      // });
      // console.log("Offering deadline notification created");

      return result;
    });
    return c.json({
      data: {
        doc: doc,
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
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      imageRatio: z.string().optional(),
      status: z
        .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE", "CANCELLED"])
        .optional(),
      teamId: z.string().optional(),
      imageCount: z.number().optional(),
      clientName: z.string().optional(),

      // Offering
      fee: z.number().optional(),
      note: z.string().nullable().optional(),
      deadline: z.string().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const result = await prisma.$transaction(async (trx) => {
      console.log(
        "Updating project",
        JSON.stringify({
          id,
        })
      );
      const result = await trx.project.update({
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
          note: isUndefined(body.note) ? undefined : body.note,
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

      if (result.teamId) {
        console.log(
          "Updating Offering",
          JSON.stringify({
            teamId: result.teamId,
            projectId: id,
          })
        );
        await trx.offering.updateMany({
          where: {
            teamId: result.teamId,
            projectId: id,
            status: "ACCEPTED",
          },
          data: {
            fee: isUndefined(body.fee) ? undefined : body.fee,
            note: isUndefined(body.note) ? undefined : body.note,
            deadline: isUndefined(body.deadline) ? undefined : body.deadline,
          },
        });
      }
      return result;
    });

    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

export default projectRoute;
