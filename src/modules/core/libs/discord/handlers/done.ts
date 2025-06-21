import type { ChatInputCommandInteraction, Client } from "discord.js";
import { updateProject } from "../../../../project/project.service.js";
import prisma from "../../prisma.js";
import { isUserAdmin } from "../helpers.js";

/**
 * Handle the "done" command
 */
async function doneCommandHandler(
	interaction: ChatInputCommandInteraction,
	discordClient: Client,
) {
	if (!isUserAdmin(interaction.user.id)) {
		return interaction.reply("Hanya admin yang diperbolehkan");
	}

	const offering = await prisma.offering.findFirst({
		where: { discordThreadId: interaction.channelId },
	});

	if (!offering) {
		return interaction.reply("Offering tidak ditemukan");
	}

	if (offering.status !== "ACCEPTED") {
		return interaction.reply("Konfirmasi dahulu offering nya 🙏");
	}

	const project = await prisma.project.findFirst({
		where: { id: offering.projectId },
	});

	if (!project) {
		return interaction.reply("Project tidak ditemukan");
	}

	await interaction.reply("Acc ✅");

	await updateProject({
		id: project.id,
		body: { status: "DONE" },
		prisma,
		discordClient,
	});
}

export { doneCommandHandler };
