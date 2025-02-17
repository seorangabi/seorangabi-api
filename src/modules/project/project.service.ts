import { TextChannel, type Client } from "discord.js";
import type {
	OfferingStatus,
	Prisma,
	PrismaClient,
} from "../../../prisma/generated/client/index.js";
import { HTTPException } from "hono/http-exception";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type {
	getListProjectJsonSchema,
	patchProjectJsonSchema,
	postProjectJsonSchema,
} from "./project.schema.js";
import { createOfferingAndInteraction } from "../offering/offering.service.js";
import { isUndefined } from "../core/libs/utils.js";

export const createProject = async ({
	form,
	prisma,
	discordClient,
}: {
	prisma: PrismaClient;
	form: z.infer<typeof postProjectJsonSchema>;
	discordClient: Client;
}) => {
	const projectId = randomUUID();

	const createTasksInput: Prisma.TaskCreateManyInput[] = [];
	const createTaskAttachmentsInput: Prisma.TaskAttachmentCreateManyInput[] = [];
	let totalFee = 0;
	let totalImageCount = 0;

	for (const task of form.tasks) {
		const taskId = randomUUID();

		totalFee = totalFee + task.fee;
		totalImageCount = totalImageCount + task.imageCount;

		createTasksInput.push({
			id: taskId,
			projectId,
			fee: task.fee,
			imageCount: task.imageCount,
			note: task.note || "",
			attachmentUrl: "", // TODO: Delete soon
		});

		for (const taskAttachment of task.attachments) {
			createTaskAttachmentsInput.push({
				taskId,
				url: taskAttachment,
			});
		}
	}

	const project = await prisma.project.create({
		data: {
			id: projectId,
			name: form.name,
			imageRatio: form.imageRatio,
			teamId: form.teamId,
			clientName: form.clientName,
			deadline: form.deadline,
			note: form.note || "",

			fee: totalFee,
			imageCount: totalImageCount,
			confirmationDuration: form.confirmationDuration,

			autoNumberTask: form.autoNumberTask,
		},
	});

	await prisma.task.createMany({
		data: createTasksInput,
	});

	await prisma.taskAttachment.createMany({
		data: createTaskAttachmentsInput,
	});

	await createOfferingAndInteraction({
		prisma: prisma,
		body: {
			deadline: form.deadline,
			fee: totalFee,
			projectId: project.id,
			teamId: form.teamId,
			confirmationDuration: form.confirmationDuration,
		},
		discordClient,
		project: {
			clientName: form.clientName,
			name: form.name,
			imageRatio: form.imageRatio,
			confirmationDuration: form.confirmationDuration,
			note: form.note || "",
			autoNumberTask: form.autoNumberTask ?? true,
		},
		tasks: form.tasks,
	});

	return { project };
};

export const getListProject = async ({
	query,
	prisma,
}: {
	query: z.infer<typeof getListProjectJsonSchema>;
	prisma: PrismaClient;
}) => {
	const include: Prisma.ProjectInclude = {};
	if (!isUndefined(query.with)) {
		const withArray = Array.isArray(query.with) ? query.with : [query.with];

		if (withArray.includes("team")) include.team = true;
		if (withArray.includes("payroll")) include.payroll = true;
	}

	const orderBy: Prisma.ProjectOrderByWithRelationInput = {};
	if (!isUndefined(query.sort)) {
		const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

		if (sortArray.includes("created_at:asc")) {
			orderBy.createdAt = "asc";
		}
		if (sortArray.includes("created_at:desc")) {
			orderBy.createdAt = "desc";
		}
	}

	const where: Prisma.ProjectWhereInput = {
		deletedAt: null, // filter for soft delete
	};
	if (!isUndefined(query.id_eq)) {
		where.id = query.id_eq;
	}
	if (!isUndefined(query.team_id_eq)) {
		where.teamId = query.team_id_eq;
	}
	if (!isUndefined(query.status_eq)) {
		where.status = query.status_eq;
	}
	if (query.is_paid_eq === "true") where.isPaid = true;
	if (query.is_paid_eq === "false") where.isPaid = false;

	where.createdAt = {
		...(!isUndefined(query.created_at_gte) && {
			gte: query.created_at_gte,
		}),
		...(!isUndefined(query.create_at_lte) && { lte: query.create_at_lte }),
	};

	const result = await prisma.project.findMany({
		include,
		where,
		orderBy,
		...(!isUndefined(query.skip) && { skip: query.skip }),
		...(!isUndefined(query.limit) && { take: query.limit + 1 }),
	});

	let hasNext = false;
	if (query.limit && result.length > query.limit) {
		result.pop();
		hasNext = true;
	}

	const hasPrev = !isUndefined(query.skip) && query.skip > 0;

	return {
		result,
		hasNext,
		hasPrev,
	};
};

export const updateProject = async ({
	id,
	body,
	prisma,
	discordClient,
}: {
	id: string;
	body: z.infer<typeof patchProjectJsonSchema>;
	prisma: PrismaClient;
	discordClient: Client;
}) => {
	const oldProject = await prisma.project.findFirst({
		where: {
			id,
		},
	});
	const project = await prisma.project.update({
		where: {
			id,
		},
		data: {
			name: isUndefined(body.name) ? undefined : body.name,
			imageRatio: isUndefined(body.imageRatio) ? undefined : body.imageRatio,
			status: isUndefined(body.status) ? undefined : body.status,
			teamId: isUndefined(body.teamId) ? undefined : body.teamId,
			imageCount: isUndefined(body.imageCount) ? undefined : body.imageCount,
			clientName: isUndefined(body.clientName) ? undefined : body.clientName,
			doneAt: body.status === "DONE" ? new Date().toISOString() : undefined,
			note: isUndefined(body.note) ? undefined : body.note,

			// Offering
			fee: isUndefined(body.fee) ? undefined : body.fee,
			deadline: isUndefined(body.deadline) ? undefined : body.deadline,

			autoNumberTask: isUndefined(body.autoNumberTask)
				? undefined
				: body.autoNumberTask,
		},
	});

	/**
	 * For update task
	 * @see /src/modules/task/task.service.ts
	 */

	if (body.status === "DONE") {
		const { thread, team } = await getOfferingTeamThreadFromProjectId({
			prisma: prisma,
			discordClient,
			projectId: id,
			status: {
				in: ["ACCEPTED", "OFFERING"],
			},
		});

		await thread.send({
			content: `Thx guys <@${team.discordUserId}> project selesai 🔥🔥🔥`,
		});
	}

	if (body.status === "CANCELLED") {
		const { thread, team } = await getOfferingTeamThreadFromProjectId({
			prisma: prisma,
			discordClient,
			projectId: id,
			status: {
				in: ["ACCEPTED", "OFFERING"],
			},
		});

		await thread.send({
			content: `Sorry guys <@${team.discordUserId}> project dibatalkan ❌`,
		});
	}

	const revertToInprogress =
		oldProject?.status === "DONE" && project.status === "IN_PROGRESS";

	if (revertToInprogress) {
		const { thread, team } = await getOfferingTeamThreadFromProjectId({
			prisma: prisma,
			discordClient,
			projectId: id,
			status: {
				in: ["ACCEPTED", "OFFERING"],
			},
		});

		await thread.send({
			content: `Sorry guys <@${team.discordUserId}> status dikembalikan ke in progress 🙏`,
		});
	}

	return { project };
};

export const getOfferingTeamThreadFromProjectId = async ({
	discordClient,
	prisma,
	projectId,
	status,
}: {
	discordClient: Client;
	prisma: PrismaClient;
	projectId: string;
	status: Required<Prisma.OfferingFindManyArgs>["where"]["status"];
}) => {
	const offerings = await prisma.offering.findMany({
		where: {
			projectId,
			status,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			teamId: true,
			discordThreadId: true,
		},
	});
	const offering = offerings[0];

	if (!offering)
		throw new HTTPException(404, {
			message: "Offering not found",
		});

	const team = await prisma.team.findUniqueOrThrow({
		where: {
			id: offering.teamId,
		},
		select: {
			id: true,
			discordUserId: true,
			discordChannelId: true,
		},
	});

	const channel = await discordClient.channels.fetch(team.discordChannelId);

	if (!channel)
		throw new HTTPException(404, {
			message: "Channel not found",
		});

	if (!(channel instanceof TextChannel)) throw new Error("Channel not found");

	const thread = channel.threads.cache.find(
		(t) => t.id === offering.discordThreadId,
	);

	if (!thread)
		throw new HTTPException(404, {
			message: "Thread not found",
		});

	return {
		team,
		offering,
		thread,
	};
};

export const recalculateProject = async ({
	prisma,
	projectId,
}: {
	prisma: PrismaClient;
	projectId: string;
}) => {
	const tasks = await prisma.task.findMany({
		where: {
			projectId: projectId,
		},
	});

	const { totalFee, totalImageCount } = tasks.reduce(
		(acc, task) => {
			return {
				totalFee: acc.totalFee + task.fee,
				totalImageCount: acc.totalImageCount + task.imageCount,
			};
		},
		{
			totalFee: 0,
			totalImageCount: 0,
		},
	);

	return prisma.project.update({
		where: {
			id: projectId,
		},
		data: {
			fee: totalFee,
			imageCount: totalImageCount,
		},
	});
};
