import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { useJWT } from "../core/libs/jwt.js";
import {
	getProjectAttachments,
	createProjectAttachment,
	deleteProjectAttachment,
} from "./project-attachment.service.js";
import prisma from "../core/libs/prisma.js";

const projectAttachmentRouter = new Hono().basePath("/project-attachments");

// GET list of attachments for a project
projectAttachmentRouter.get(
	"/:projectId",
	useJWT(),
	zValidator("param", z.object({ projectId: z.string() })),
	async (c) => {
		const { projectId } = c.req.valid("param");
		const result = await getProjectAttachments({
			projectId,
			prisma,
		});

		return c.json({
			docs: result,
		});
	},
);

// POST new attachment to a project
projectAttachmentRouter.post(
	"/",
	useJWT(),
	zValidator(
		"json",
		z.object({
			projectId: z.string(),
			url: z.string(),
		}),
	),
	async (c) => {
		const body = c.req.valid("json");
		const result = await createProjectAttachment({
			projectId: body.projectId,
			url: body.url,
			prisma,
		});

		return c.json({
			doc: result,
		});
	},
);

// DELETE attachment from a project
projectAttachmentRouter.delete(
	"/:attachmentId",
	useJWT(),
	zValidator("param", z.object({ attachmentId: z.string() })),
	async (c) => {
		const { attachmentId } = c.req.valid("param");
		await deleteProjectAttachment({
			attachmentId,
			prisma,
		});

		return c.json({
			message: "Attachment deleted successfully",
		});
	},
);

export default projectAttachmentRouter;
