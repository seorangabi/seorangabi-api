import { format } from "date-fns";
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ChannelType,
	type Client,
	type PrivateThreadChannel,
	type PublicThreadChannel,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextChannel,
} from "discord.js";
import type {
	Prisma,
	PrismaClient,
} from "../../../prisma/generated/client/index.js";
import { formatRupiah, isUndefined } from "../core/libs/utils.js";
import type { z } from "zod";
import type {
	createOfferingJsonSchema,
	getListOfferingQuerySchema,
} from "./offering.schema.js";
import { HTTPException } from "hono/http-exception";
import { addOfferingJob } from "./offering.queue.js";
import config from "../core/config/index.js";
import { formatDeadline } from "../../utils/formatter/index.js";

export const getListOffering = async ({
	query,
	prisma,
}: {
	query: z.infer<typeof getListOfferingQuerySchema>;
	prisma: PrismaClient;
}) => {
	const include: Prisma.OfferingInclude = {};
	if (!isUndefined(query.with)) {
		const withArray = Array.isArray(query.with) ? query.with : [query.with];

		if (withArray.includes("team")) include.team = true;
	}

	const orderBy: Prisma.OfferingOrderByWithRelationInput = {};
	if (!isUndefined(query.sort)) {
		const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

		if (sortArray.includes("created_at:asc")) {
			orderBy.createdAt = "asc";
		}
		if (sortArray.includes("created_at:desc")) {
			orderBy.createdAt = "desc";
		}
	}

	const where: Prisma.OfferingWhereInput = {};
	if (!isUndefined(query.project_id_eq)) {
		where.projectId = query.project_id_eq;
	}

	const result = await prisma.offering.findMany({
		include,
		where,
		orderBy,
	});

	return {
		result,
	};
};

const confirmationDurationText = (confirmationDuration: number) => {
	const now = new Date();
	const confirmationDate = new Date(now.getTime() + confirmationDuration);

	const isSameDay =
		confirmationDate.getDate() === now.getDate() &&
		confirmationDate.getMonth() === now.getMonth() &&
		confirmationDate.getFullYear() === now.getFullYear();

	if (isSameDay) return format(confirmationDate, "HH:mm");

	return `${format(confirmationDate, "dd MMMM yyyy")} || _${format(
		confirmationDate,
		"HH:mm",
	)}_`;
};

export type CreateOfferingAndInteractionProps = {
	discordClient: Client;
	prisma: Omit<
		PrismaClient<Prisma.PrismaClientOptions>,
		"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
	>;
	body: z.infer<typeof createOfferingJsonSchema>;
	project: {
		name: string;
		note: string;
		imageRatio: string;
		clientName: string;
		confirmationDuration: number;
		autoNumberTask: boolean;
		attachments: string[];
	};
	tasks: {
		fee: number;
		note?: string;
		attachments: string[];
	}[];
};

export const sendTaskMessage = async ({
	thread,
	task,
	taskNumber,
	autoNumberTask,
}: {
	thread: PrivateThreadChannel | PublicThreadChannel<false>;
	task: {
		fee: number;
		note?: string;
		attachments: string[];
	};
	taskNumber: number;
	autoNumberTask: boolean;
}) => {
	const attachments: AttachmentBuilder[] = [];

	for (const attachment of task.attachments) {
		const name = attachment.split("/").pop();
		attachments.push(
			new AttachmentBuilder(attachment, {
				name,
			}),
		);
	}

	await thread.send({
		content: `${autoNumberTask ? `${+taskNumber}. ` : ""}FEE : ${formatRupiah(
			task.fee,
		)}\n${task.note}\n ** **`,
		files: attachments,
	});
};

export const createOfferingAndInteraction = async ({
	discordClient,
	prisma,
	body,
	project,
	tasks,
}: CreateOfferingAndInteractionProps) => {
	const team = await prisma.team.findUniqueOrThrow({
		where: {
			id: body.teamId,
		},
		select: {
			id: true,
			discordUserId: true,
			discordChannelId: true,
		},
	});
	if (!team.discordChannelId)
		throw new HTTPException(404, { message: "Discord channel id is empty" });
	if (!team.discordUserId)
		throw new HTTPException(404, { message: "Discord user id is empty" });

	const channel = await discordClient.channels.fetch(team.discordChannelId);

	if (!(channel instanceof TextChannel)) throw new Error("Channel not found");

	const thread = await channel.threads.create({
		name: `${project.name}`,
		type: ChannelType.PublicThread,
	});

	const adminDiscordUserId = await config.getAdminDiscordId();

	await thread.members.add(team.discordUserId);
	if (adminDiscordUserId) await thread.members.add(adminDiscordUserId);

	const offering = await prisma.offering.create({
		data: {
			projectId: body.projectId,
			teamId: body.teamId,
			status: "OFFERING",
			discordThreadId: thread.id,
		},
		include: {
			team: {
				select: {
					discordUserId: true,
				},
			},
		},
	});

	const deadlineText = formatDeadline(body.deadline);

	await thread.send({
		content: `
🌟 NEW PROJECT 🌟
${project.name}
DL: ${deadlineText}
RATIO : ${project.imageRatio || "N/A"}
CLIENT : ${project.clientName || "N/A"}
    `,
	});

	if (project.note) {
		await thread.send({
			content: project.note,
		});
	}

	// Send project attachments if they exist
	if (project.attachments && project.attachments.length > 0) {
		const projectAttachments: AttachmentBuilder[] = [];

		for (const attachment of project.attachments) {
			const name = attachment.split("/").pop() || "attachment";
			projectAttachments.push(
				new AttachmentBuilder(attachment, {
					name,
				}),
			);
		}

		await thread.send({
			content: "Project Attachments:",
			files: projectAttachments,
		});
	}

	const select = new StringSelectMenuBuilder()
		.setCustomId(`offering/${offering.id}`)
		.setPlaceholder("Select an option")
		.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel("Let's Go 🚀")
				.setValue("yes"),
			new StringSelectMenuOptionBuilder()
				.setLabel("Nggak dulu ❌")
				.setValue("no"),
		);

	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		select,
	);

	await thread.send({
		content: `Ready cuy <@${
			team?.discordUserId
		}> ? \nwaktu konfirmasi mu sampai ${confirmationDurationText(
			body.confirmationDuration,
		)} yaaa 👀`,
		components: [row],
	});

	for (const taskIndex in tasks) {
		const task = tasks[taskIndex];
		await sendTaskMessage({
			task,
			thread,
			taskNumber: +taskIndex + 1,
			autoNumberTask: project.autoNumberTask,
		});
	}

	await addOfferingJob({
		offering,
		confirmationDuration: project.confirmationDuration,
	});

	return {
		offeringId: offering.id,
		offering,
		team,
	};
};
