import type { ChatInputCommandInteraction } from "discord.js";
import { getImageProductionPerWeek } from "../../../../statistic/statistic.service.js";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatDateRange } from "../helpers.js";

/**
 * Handle the "image-production-per-week" command
 */
async function imageProductionPerWeekCommandHandler(
	interaction: ChatInputCommandInteraction,
) {
	await interaction.deferReply();

	try {
		// Get optional month and year parameters, default to current month and year
		const now = new Date();
		const monthIndex =
			(interaction.options.getInteger("bulan") || now.getMonth() + 1) - 1; // Convert from 1-12 to 0-11
		const year = interaction.options.getInteger("tahun") || now.getFullYear();

		// Get production data
		const productionData = await getImageProductionPerWeek({
			monthIndex,
			year,
		});

		if (productionData.length === 0) {
			return interaction.editReply(
				"Tidak ada data produksi untuk periode tersebut.",
			);
		}

		// Format the data for Discord display
		const monthName = format(new Date(year, monthIndex), "MMMM yyyy", {
			locale: localeId,
		});

		let responseContent = `# Statistik Produksi Bulan ${monthName}\n\n`;

		// Add data for each week
		productionData.forEach((weekData, index) => {
			const weekNumber = index + 1;
			const dateRange = formatDateRange(weekData.start, weekData.end);

			responseContent += `## Minggu ${weekNumber} (${dateRange})\n`;

			// Sort teams by count, highest first
			const sortedTeams = [...weekData.teams].sort((a, b) => b.count - a.count);

			// Add team production data
			for (const team of sortedTeams) {
				if (team.count > 0) {
					responseContent += `${team.name}: **${team.count}** gambar\n`;
				}
			}

			// Add week total
			const weekTotal = sortedTeams.reduce((sum, team) => sum + team.count, 0);
			responseContent += `\nTotal minggu: **${weekTotal}** gambar\n\n`;
		});

		// Add monthly total
		const monthlyTotal = productionData.reduce(
			(sum, week) =>
				sum + week.teams.reduce((weekSum, team) => weekSum + team.count, 0),
			0,
		);

		responseContent += `# Total Bulan ${monthName}: **${monthlyTotal}** gambar`;

		return interaction.editReply(responseContent);
	} catch (error) {
		console.error("Error in image-production-per-week command:", error);
		return interaction.editReply(
			"Terjadi kesalahan saat mengambil data produksi.",
		);
	}
}

export { imageProductionPerWeekCommandHandler };
