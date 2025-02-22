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
	deleteProject,
	getListProject,
	updateProject,
} from "./project.service.js";
import { useJWT } from "../core/libs/jwt.js";
import { z } from "zod";

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

projectRoute.delete(
	"/:id",
	zValidator("query", z.object({ deleteThread: z.string() })),
	useJWT(),
	async (c) => {
		const id = c.req.param("id");
		const deleteThread = c.req.valid("query").deleteThread === "true";
		const discordClient = c.get("discordClient");

		const result = deleteProject({
			deleteThread,
			discordClient,
			prisma,
			projectId: id,
		});

		return c.json({
			data: {
				doc: result,
			},
		});
	},
);

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
