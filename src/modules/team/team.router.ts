import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isUndefined } from "../core/libs/utils.js";

const teamRoute = new Hono().basePath("/team");

teamRoute.get("/list", async (c) => {
  const result = await prisma.team.findMany();
  return c.json({
    data: {
      docs: result,
    },
  });
});

teamRoute.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      bankNumber: z.string().nullable(),
      bankAccountHolder: z.string().nullable(),
      bankProvider: z.string().nullable(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const result = await prisma.team.create({
      data: body,
    });
    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

teamRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await prisma.team.delete({
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

teamRoute.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      bankNumber: z.string().nullable().optional(),
      bankAccountHolder: z.string().nullable().optional(),
      bankProvider: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const result = await prisma.team.update({
      where: {
        id,
      },
      data: {
        name: isUndefined(body.name) ? undefined : body.name,
        bankNumber: isUndefined(body.bankNumber) ? undefined : body.bankNumber,
        bankAccountHolder: isUndefined(body.bankAccountHolder)
          ? undefined
          : body.bankAccountHolder,
        bankProvider: isUndefined(body.bankProvider)
          ? undefined
          : body.bankProvider,
      },
    });

    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

export default teamRoute;
