import "./project.worker.js";

import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import {
	postProjectJsonSchema,
	getListProjectJsonSchema,
	patchProjectJsonSchema,
} from "./project.schema.js";
import {
	createProject,
	getListProject,
	updateProject,
} from "./project.service.js";
import { useJWT } from "../core/libs/jwt.js";

const projectRoute = new Hono().basePath("/project");

projectRoute.get(
	"/list",
	useJWT(),
	zValidator("query", getListProjectJsonSchema),
	async (c) => {
		const query = c.req.valid("query");

		const { hasNext, hasPrev, result } = await getListProject({
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
	},
);

projectRoute.post(
	"/",
	useJWT(),
	zValidator("json", postProjectJsonSchema),
	async (c) => {
		const form = c.req.valid("json");
		const discordClient = c.get("discordClient");

		const { project } = await createProject({ form, discordClient, prisma });

		return c.json({
			data: {
				doc: project,
			},
		});
	},
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
	zValidator("json", patchProjectJsonSchema),
	async (c) => {
		const id = c.req.param("id");
		const body = c.req.valid("json");
		const discordClient = c.get("discordClient");

		const { project } = await updateProject({
			id,
			body,
			prisma,
			discordClient,
		});

		return c.json({
			data: {
				doc: project,
			},
		});
	},
);

export default projectRoute;
