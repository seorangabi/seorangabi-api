import { Hono } from "hono";
import { isUndefined } from "../core/libs/utils.js";
import { z } from "zod";
import { useJWT } from "../core/libs/jwt.js";
import { zValidator } from "@hono/zod-validator";
import type { Prisma } from "../../../prisma/generated/client/index.js";
import prisma from "../core/libs/prisma.js";
import { recalculateProject } from "../project/project.service.js";
import { randomUUID } from "node:crypto";

const taskRouter = new Hono().basePath("/task");

const sortTask = z.enum(["created_at:asc", "created_at:desc"]);

taskRouter.get(
	"/list",
	useJWT(),
	zValidator(
		"query",
		z.object({
			project_id_eq: z.string().optional(),
			sort: z.union([sortTask, z.array(sortTask)]).optional(),
		}),
	),
	async (c) => {
		const query = c.req.valid("query");

		const orderBy: Prisma.TaskOrderByWithRelationInput = {};
		if (!isUndefined(query.sort)) {
			const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

			if (sortArray.includes("created_at:asc")) {
				orderBy.createdAt = "asc";
			}
			if (sortArray.includes("created_at:desc")) {
				orderBy.createdAt = "desc";
			}
		}

		const where: Prisma.TaskWhereInput = {};
		if (!isUndefined(query.project_id_eq)) {
			where.projectId = query.project_id_eq;
		}

		const result = await prisma.task.findMany({
			where,
			orderBy,
			include: {
				attachments: true,
			},
		});

		return c.json({
			data: {
				docs: result,
			},
		});
	},
);

taskRouter.post(
	"/",
	useJWT(),
	zValidator(
		"json",
		z.object({
			projectId: z.string(),
			fee: z.number(),
			imageCount: z.number(),
			note: z.string(),
			attachments: z.array(z.string()),
		}),
	),
	async (c) => {
		const body = c.req.valid("json");

		const id = randomUUID();

		const task = await prisma.task.create({
			data: {
				id,
				projectId: body.projectId,
				fee: body.fee,
				imageCount: body.imageCount,
				note: body.note,
				attachmentUrl: "", // TODO: Delete soon
			},
		});

		const createTaskAttachmentsInput: Prisma.TaskAttachmentCreateManyInput[] =
			[];
		for (const taskAttachment of body.attachments) {
			createTaskAttachmentsInput.push({
				taskId: id,
				url: taskAttachment,
			});
		}

		await prisma.taskAttachment.createMany({
			data: createTaskAttachmentsInput,
		});

		await recalculateProject({ prisma, projectId: body.projectId });

		return c.json({
			data: {
				doc: task,
			},
		});
	},
);

taskRouter.patch(
	"/:id",
	useJWT(),
	zValidator(
		"json",
		z.object({
			projectId: z.string().optional(),
			fee: z.number().optional(),
			imageCount: z.number().optional(),
			note: z.string().optional(),
			attachments: z.array(z.string()),
		}),
	),
	async (c) => {
		const body = c.req.valid("json");
		const id = c.req.param("id");

		const task = await prisma.task.update({
			where: {
				id,
			},
			data: {
				fee: isUndefined(body.fee) ? undefined : body.fee,
				note: isUndefined(body.note) ? undefined : body.note,
				attachmentUrl: "",
			},
		});

		const createTaskAttachmentsInput: Prisma.TaskAttachmentCreateManyInput[] =
			[];
		for (const taskAttachment of body.attachments) {
			createTaskAttachmentsInput.push({
				taskId: id,
				url: taskAttachment,
			});
		}

		await prisma.taskAttachment.deleteMany({
			where: {
				taskId: id,
			},
		});
		await prisma.taskAttachment.createMany({
			data: createTaskAttachmentsInput,
		});

		await recalculateProject({ prisma, projectId: task.projectId });

		return c.json({
			data: {
				doc: task,
			},
		});
	},
);

taskRouter.delete("/:id", useJWT(), async (c) => {
	const id = c.req.param("id");

	// TODO: delete file
	await prisma.taskAttachment.deleteMany({
		where: {
			taskId: id,
		},
	});

	const task = await prisma.task.delete({
		where: {
			id,
		},
	});

	await recalculateProject({ prisma, projectId: task.projectId });

	return c.json({
		data: {
			doc: task,
		},
	});
});

export default taskRouter;
