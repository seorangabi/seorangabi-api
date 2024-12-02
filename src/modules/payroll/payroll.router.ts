import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isArray, isUndefined } from "../core/libs/utils.js";
import type { Prisma } from "@prisma/client";

const payrollRoute = new Hono().basePath("/payroll");

const onStatusChange = async ({
  newStatus,
  projectIds,
}: {
  newStatus: "DRAFT" | "PAID";
  projectIds: string[];
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
  }
};

payrollRoute.get(
  "/list",
  zValidator(
    "query",
    z.object({
      id_eq: z.string().optional(),
      with: z.union([z.enum(["team"]), z.array(z.enum(["team"]))]).optional(),
      status_eq: z.enum(["DRAFT", "PAID"]).optional(),
      team_id_eq: z.string().optional(),
      skip: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    })
  ),

  async (c) => {
    const query = c.req.valid("query");

    const include: Prisma.PayrollInclude = {};
    if (!isUndefined(query.with)) {
      const withArray = isArray(query.with) ? query.with : [query.with];

      if (withArray.includes("team")) include.team = true;
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
      orderBy: {
        createdAt: "desc",
      },
      where,
      ...(!isUndefined(query.skip) && {
        skip: query.skip,
      }),
      ...(!isUndefined(query.limit) && {
        take: query.limit,
      }),
    });
    return c.json({
      data: {
        docs: result,
      },
    });
  }
);

payrollRoute.post(
  "/",
  zValidator(
    "json",
    z.object({
      periodStart: z.string(),
      periodEnd: z.string(),
      status: z.enum(["DRAFT", "PAID"]),
      teamId: z.string(),
      projectIds: z.array(z.string()),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");

    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: body.projectIds,
        },
      },
    });

    const amount = projects.reduce((acc, project) => acc + project.fee, 0);

    const result = await prisma.payroll.create({
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
      await prisma.project.updateMany({
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

    onStatusChange({
      newStatus: body.status,
      projectIds: body.projectIds,
    });

    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

payrollRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const result = await prisma.payroll.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  // disconnect projects
  await prisma.project.updateMany({
    where: {
      payrollId: id,
    },
    data: {
      payrollId: null,
    },
  });

  return c.json({
    data: {
      doc: result,
    },
  });
});

payrollRoute.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      status: z.enum(["PAID"]).optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    await prisma.payroll.update({
      where: {
        id,
      },
      data: {
        ...(isUndefined(body.status) ? {} : { status: body.status }),
      },
    });

    if (body.status === "PAID") {
      const projectIds = await prisma.project.findMany({
        where: {
          payrollId: id,
        },
        select: {
          id: true,
        },
      });

      onStatusChange({
        newStatus: body.status,
        projectIds: projectIds.map((project) => project.id),
      });
    }

    return c.json({
      data: {},
    });
  }
);

export default payrollRoute;
