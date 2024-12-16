import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isUndefined } from "../core/libs/utils.js";
import type { Prisma } from "../../../prisma/generated/client/index.js";
import { useJWT } from "../../libs/jwt.js";

const teamRoute = new Hono().basePath("/team");

teamRoute.get(
  "/list",
  useJWT(),
  zValidator(
    "query",
    z.object({
      id_eq: z.string().optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid("query");

    const where: Prisma.TeamWhereInput = {
      deletedAt: null, // filter for soft delete
    };
    if (!isUndefined(query.id_eq)) {
      where.id = query.id_eq;
    }

    const result = await prisma.team.findMany({
      where,
    });
    return c.json({
      data: {
        docs: result,
      },
    });
  }
);

teamRoute.post(
  "/",
  useJWT(),
  zValidator(
    "json",
    z.object({
      name: z.string(),
      discordUserId: z.string(),
      discordChannelId: z.string(),
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

teamRoute.delete("/:id", useJWT(), async (c) => {
  const id = c.req.param("id");
  const result = await prisma.team.update({
    data: {
      deletedAt: new Date(),
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

teamRoute.patch(
  "/:id",
  useJWT(),
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      discordUserId: z.string().optional(),
      discordChannelId: z.string().optional(),
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
        discordUserId: isUndefined(body.discordUserId)
          ? undefined
          : body.discordUserId,
        discordChannelId: isUndefined(body.discordChannelId)
          ? undefined
          : body.discordChannelId,
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
