import { TextChannel } from "discord.js";
import { discordClient } from "../core/libs/discord.js";
import prisma from "../core/libs/prisma.js";
import redisInstance from "../core/libs/redis.js";
import { Worker } from "bullmq";
import config from "../core/config/index.js";

export const projectDeadlineWorker = new Worker(
	"projectdeadline",
	async (job) => {
		const { projectId, minutes } = job.data;

		const project = await prisma.project.findUnique({
			where: { id: projectId },
		});
		if (!project || project.status === "DONE") {
			return;
		}

		const offering = await prisma.offering.findFirst({
			where: {
				projectId,
				status: "ACCEPTED",
			},
			include: {
				team: {
					select: {
						id: true,
						discordUserId: true,
						discordChannelId: true,
					},
				},
			},
		});

		if (!offering || !offering?.discordThreadId) {
			return;
		}

		const channel = await discordClient.channels.fetch(
			offering?.team?.discordChannelId,
		);
		if (!channel || !(channel instanceof TextChannel)) {
			return;
		}
		const thread = await channel.threads.fetch(offering.discordThreadId);
		if (!thread) {
			return;
		}

		const adminDiscordUserId = await config.getAdminDiscordId();

		let message = "";
		if (minutes === 0) {
			message = `Deadline project mu <@${offering.team.discordUserId}> telah selesai. \ncc <@${adminDiscordUserId}>`;
		} else {
			message = `Deadline project mu <@${offering.team.discordUserId}> kurang ${minutes} menit lagi.`;
		}

		await thread.send({
			content: message,
		});
	},
	{ connection: redisInstance },
);
