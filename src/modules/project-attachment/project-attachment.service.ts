import { HTTPException } from "hono/http-exception";
import type { PrismaClient } from "../../../prisma/generated/client/index.js";

/**
 * Get all attachments for a project
 */
export const getProjectAttachments = async ({
	projectId,
	prisma,
}: {
	projectId: string;
	prisma: PrismaClient;
}) => {
	try {
		const attachments = await prisma.projectAttachment.findMany({
			where: {
				projectId,
			},
			orderBy: {
				id: "desc",
			},
		});

		return attachments;
	} catch (error) {
		console.error("Error fetching project attachments:", error);
		throw new HTTPException(500, {
			message: "Failed to fetch project attachments",
		});
	}
};

/**
 * Create a new attachment for a project
 */
export const createProjectAttachment = async ({
	projectId,
	url,
	prisma,
}: {
	projectId: string;
	url: string;
	prisma: PrismaClient;
}) => {
	try {
		// First check if the project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId },
		});

		if (!project) {
			throw new HTTPException(404, {
				message: "Project not found",
			});
		}

		// Create the attachment
		const attachment = await prisma.projectAttachment.create({
			data: {
				projectId,
				url,
			},
		});

		return attachment;
	} catch (error) {
		if (error instanceof HTTPException) throw error;

		console.error("Error creating project attachment:", error);
		throw new HTTPException(500, {
			message: "Failed to create project attachment",
		});
	}
};

/**
 * Delete a project attachment by ID
 */
export const deleteProjectAttachment = async ({
	attachmentId,
	prisma,
}: {
	attachmentId: string;
	prisma: PrismaClient;
}) => {
	try {
		const attachment = await prisma.projectAttachment.findUnique({
			where: { id: attachmentId },
		});

		if (!attachment) {
			throw new HTTPException(404, {
				message: "Attachment not found",
			});
		}

		await prisma.projectAttachment.delete({
			where: { id: attachmentId },
		});

		return true;
	} catch (error) {
		if (error instanceof HTTPException) throw error;

		console.error("Error deleting project attachment:", error);
		throw new HTTPException(500, {
			message: "Failed to delete project attachment",
		});
	}
};

/**
 * Create multiple project attachments at once
 */
export const createManyProjectAttachments = async ({
	projectId,
	urls,
	prisma,
}: {
	projectId: string;
	urls: string[];
	prisma: PrismaClient;
}) => {
	// First check if the project exists
	const project = await prisma.project.findUnique({
		where: { id: projectId },
	});

	if (!project) {
		throw new HTTPException(404, {
			message: "Project not found",
		});
	}

	if (urls.length === 0) {
		return [];
	}

	// Create the attachments
	await prisma.projectAttachment.createMany({
		data: urls.map((url) => ({
			projectId,
			url,
		})),
	});

	// Return the created attachments
	return prisma.projectAttachment.findMany({
		where: {
			projectId,
			url: { in: urls },
		},
	});
};
