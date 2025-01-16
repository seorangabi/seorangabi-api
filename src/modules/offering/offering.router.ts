import "./offering.worker.js";

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { useJWT } from "../core/libs/jwt.js";
import { getListOfferingQuerySchema } from "./offering.schema.js";
import { getListOffering } from "./offering.service.js";

const offeringRoute = new Hono().basePath("/offering");

offeringRoute.get(
	"/list",
	useJWT(),
	zValidator("query", getListOfferingQuerySchema),
	async (c) => {
		const query = c.req.valid("query");

		const { result } = await getListOffering({
			query,
			prisma,
		});

		return c.json({
			data: {
				docs: result,
			},
		});
	},
);

export default offeringRoute;
