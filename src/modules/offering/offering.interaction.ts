import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextChannel,
	ThreadChannel,
	type StringSelectMenuInteraction,
} from "discord.js";
import prisma from "../core/libs/prisma.js";
import { createOfferingAndInteraction } from "./offering.service.js";
import { addProjectDeadlineJob } from "../project/project.queue.js";
import { formatDeadline } from "../../utils/formatter/index.js";

export const offeringInteraction = async ({
	interaction,
	offeringId,
}: {
	interaction: StringSelectMenuInteraction;
	offeringId: string;
}) => {
	// option selected
	const option = interaction.values[0];

	if (option === "no") {
		interaction.message.edit({
			components: [],
		});

		await prisma.offering.update({
			data: {
				status: "REJECTED",
			},
			where: {
				id: offeringId,
			},
		});

		const offering = await prisma.offering.findUniqueOrThrow({
			where: {
				id: offeringId,
			},
			select: {
				projectId: true,
				team: {
					select: {
						discordUserId: true,
					},
				},
			},
		});

		// remove member from thread
		const channel = await interaction.channel?.fetch();
		if (channel instanceof TextChannel) {
			channel?.members.delete(offering.team?.discordUserId);
		}

		const teams = await prisma.team.findMany({});
		const options = teams.map((team) => {
			return new StringSelectMenuOptionBuilder()
				.setLabel(team.name)
				.setValue(team.id);
		});
		const select = new StringSelectMenuBuilder()
			.setCustomId(`choose-team/${offering?.projectId}`)
			.setPlaceholder("Select an option")
			.addOptions(options);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			select,
		);

		interaction.reply({
			content:
				"Kamu mau offer ke siapa nih ? \nJika mau ubah offering lewat dashboard yaaa",
			components: [row],
		});

		return;
	}

	if (option === "yes") {
		prisma.$transaction(async (trx) => {
			const offering = await trx.offering.update({
				where: {
					id: offeringId,
				},
				data: {
					status: "ACCEPTED",
				},
				select: {
					id: true,
					projectId: true,
					discordThreadId: true,
				},
			});

			const project = await trx.project.update({
				where: {
					id: offering.projectId,
				},
				data: {
					status: "IN_PROGRESS",
				},
			});

			interaction.message.edit({
				components: [],
			});

			interaction.reply({
				content: `Here we go 🚀 \nJangan lupa deadline mu sampai ${formatDeadline(
					project.deadline.toISOString(),
				)}`,
			});

			const channel = await interaction.channel?.fetch();
			if (!(channel instanceof ThreadChannel)) return;

			const message = await channel.fetchStarterMessage();
			if (!message) return;

			await message.react("💰");

			await addProjectDeadlineJob({
				project,
			});
		});

		return;
	}
};

export const chooseTeamInteraction = async ({
	interaction,
	projectId,
}: {
	interaction: StringSelectMenuInteraction;
	projectId: string;
}) => {
	// option selected
	const teamId = interaction.values[0];

	const project = await prisma.project.findUniqueOrThrow({
		where: {
			id: projectId,
		},
	});
	const tasks = await prisma.task.findMany({
		where: {
			projectId: projectId,
		},
		orderBy: {
			createdAt: "asc",
		},
		include: {
			attachments: true,
		},
	});

	await prisma.$transaction(async (trx) => {
		await trx.project.update({
			where: {
				id: projectId,
			},
			data: {
				teamId: teamId,
			},
		});

		const { offering } = await createOfferingAndInteraction({
			discordClient: interaction.client,
			prisma: trx,
			body: {
				projectId: projectId,
				teamId: teamId,
				deadline: project.deadline.toISOString(),
				fee: project.fee,
				confirmationDuration: project.confirmationDuration,
			},
			project: {
				name: project.name,
				imageRatio: project.imageRatio,
				clientName: project.clientName,
				confirmationDuration: project.confirmationDuration,
				note: project.note || "",
				autoNumberTask: project.autoNumberTask,
			},
			tasks: tasks.map((task) => ({
				...task,
				attachments: task.attachments.map((attachment) => attachment.url),
			})),
		});

		await interaction.channel?.delete().catch(() => {});

		return { offering };
	});
};
