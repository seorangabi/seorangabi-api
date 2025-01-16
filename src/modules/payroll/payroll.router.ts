import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { useJWT } from "../core/libs/jwt.js";
import {
  patchPayrollJsonSchema,
  getListPayrollQuerySchema,
  postPayrollJsonSchema,
  deletePayrollParamSchema,
} from "./payroll.schema.js";
import {
  createPayroll,
  deletePayroll,
  getListPayroll,
  updatePayroll,
} from "./payroll.service.js";

const payrollRoute = new Hono().basePath("/payroll");

payrollRoute.get(
  "/list",
  useJWT(),
  zValidator("query", getListPayrollQuerySchema),
  async (c) => {
    const query = c.req.valid("query");

    const { hasNext, hasPrev, result } = await getListPayroll({
      query,
      prisma,
    });

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
    const discordClient = c.get("discordClient");

    const { payroll } = await createPayroll({ body, prisma, discordClient });

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

    const { payroll } = await deletePayroll({ id, prisma });

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
    const discordClient = c.get("discordClient");

    const { payroll } = await updatePayroll({
      id,
      body,
      prisma,
      discordClient,
    });

    return c.json({
      data: {
        doc: payroll,
      },
    });
  }
);

export default payrollRoute;
