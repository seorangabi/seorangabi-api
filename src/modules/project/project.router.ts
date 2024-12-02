import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isArray, isUndefined } from "../core/libs/utils.js";
import type { Prisma } from "@prisma/client";

const projectRoute = new Hono().basePath("/project");

projectRoute.get(
  "/list",
  zValidator(
    "query",
    z.object({
      team_id_eq: z.string().optional(),
      status_eq: z
        .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE"])
        .optional(),
      is_paid_eq: z.enum(["true", "false"]).optional(),
      with: z.union([z.enum(["team"]), z.array(z.enum(["team"]))]).optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid("query");

    const include: Prisma.ProjectInclude = {};
    if (!isUndefined(query.with)) {
      const withArray = isArray(query.with) ? query.with : [query.with];

      if (withArray.includes("team")) include.team = true;
    }

    const where: Prisma.ProjectWhereInput = {};
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
    });
    return c.json({
      data: {
        docs: result,
      },
    });
  }
);

projectRoute.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      fee: z.number(),
      note: z.string().nullable().optional(),
      deadline: z.string(),
      imageRatio: z.string(),
      imageCount: z.number(),
      teamId: z.string(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const result = await prisma.project.create({
      data: body,
    });
    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

projectRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await prisma.project.delete({
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
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      fee: z.number().optional(),
      note: z.string().nullable().optional(),
      deadline: z.string().optional(),
      imageRatio: z.string().optional(),
      status: z
        .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE"])
        .optional(),
      teamId: z.string().optional(),
      imageCount: z.number().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const result = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name: isUndefined(body.name) ? undefined : body.name,
        fee: isUndefined(body.fee) ? undefined : body.fee,
        note: isUndefined(body.note) ? undefined : body.note,
        deadline: isUndefined(body.deadline) ? undefined : body.deadline,
        imageRatio: isUndefined(body.imageRatio) ? undefined : body.imageRatio,
        status: isUndefined(body.status) ? undefined : body.status,
        teamId: isUndefined(body.teamId) ? undefined : body.teamId,
        imageCount: isUndefined(body.imageCount) ? undefined : body.imageCount,
      },
    });

    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

export default projectRoute;
