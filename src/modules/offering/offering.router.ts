import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { Prisma } from "../../../prisma/generated/client/index.js";
import { isUndefined } from "../core/libs/utils.js";
import prisma from "../core/libs/prisma.js";
import { useJWT } from "../../libs/jwt.js";
import { getListOfferingQuerySchema } from "./offering.schema.js";

const offeringRoute = new Hono().basePath("/offering");

offeringRoute.get(
  "/list",
  useJWT(),
  zValidator("query", getListOfferingQuerySchema),
  async (c) => {
    const query = c.req.valid("query");

    const include: Prisma.OfferingInclude = {};
    if (!isUndefined(query.with)) {
      const withArray = Array.isArray(query.with) ? query.with : [query.with];

      if (withArray.includes("team")) include.team = true;
    }

    const orderBy: Prisma.OfferingOrderByWithRelationInput = {};
    if (!isUndefined(query.sort)) {
      const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

      if (sortArray.includes("created_at:asc")) {
        orderBy.createdAt = "asc";
      }
      if (sortArray.includes("created_at:desc")) {
        orderBy.createdAt = "desc";
      }
    }

    const where: Prisma.OfferingWhereInput = {};
    if (!isUndefined(query.project_id_eq)) {
      where.projectId = query.project_id_eq;
    }

    const result = await prisma.offering.findMany({
      include,
      where,
      orderBy,
    });

    return c.json({
      data: {
        docs: result,
      },
    });
  }
);

export default offeringRoute;
