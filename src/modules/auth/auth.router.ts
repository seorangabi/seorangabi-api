import { Hono } from "hono";
import { sign } from "hono/utils/jwt/jwt";
import { JWT_SECRET } from "../core/libs/jwt.js";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { JWTPayload } from "hono/utils/jwt/types";
import { secondsInDay } from "date-fns/constants";

const authRoute = new Hono().basePath("/auth");

authRoute.post(
  "/google/verify",
  zValidator("json", z.object({ email: z.string(), secret: z.string() })),
  async (c) => {
    const body = c.req.valid("json");

    if (body.secret !== process.env.GOOGLE_VERIFY_SECRET) {
      throw new HTTPException(400, {
        message: "Invalid secret",
      });
    }

    const { user } = await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: {
          email: body.email,
        },
      });
      const user = users[0];

      if (!user) {
        await tx.user.create({
          data: {
            email: body.email,
            verified: true,
          },
        });
      } else {
        await tx.user.updateMany({
          where: {
            email: body.email,
          },
          data: {
            verified: true,
          },
        });
      }

      return {
        user,
      };
    });

    return c.json({ doc: user });
  }
);

authRoute.post(
  "/google",
  zValidator(
    "json",
    z.object({
      email: z.string(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");

    const users = await prisma.user.findMany({
      where: {
        email: body.email,
      },
      select: {
        id: true,
        verified: true,
      },
    });
    const user = users[0];

    if (!user || !user.verified) {
      throw new HTTPException(403, {
        message: "Verification needed",
      });
    }

    const accessTokenExpires = Math.floor(Date.now() / 1000) + secondsInDay * 7; // 7 days

    const payload: JWTPayload = {
      id: user?.id,
      exp: accessTokenExpires,
    };

    const accessToken = await sign(payload, JWT_SECRET);

    return c.json({
      doc: {
        user,
        accessToken,
        accessTokenExpires,
      },
    });
  }
);

export default authRoute;
