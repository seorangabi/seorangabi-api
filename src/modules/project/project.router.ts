import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isUndefined } from "../core/libs/utils.js";

const projectRoute = new Hono().basePath("/project");

projectRoute.get("/list", async (c) => {
  const result = await prisma.project.findMany();
  return c.json({
    data: {
      docs: result,
    },
  });
});

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
      done: z.boolean().optional(),
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
        done: isUndefined(body.done) ? undefined : body.done,
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
