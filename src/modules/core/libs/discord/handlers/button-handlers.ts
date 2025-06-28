import type { ButtonInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";
import prisma, { prismaAI } from "../../prisma.js";

// Function to format query results for Discord display
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const formatQueryResults = (results: any[]): string => {
	if (!results || results.length === 0) {
		return "No results found.";
	}

	// For large result sets, limit what we show
	const maxRows = 10;
	const displayResults = results.slice(0, maxRows);

	let formattedResults = "```\n";

	// Add headers
	const headers = Object.keys(displayResults[0]);
	formattedResults += `${headers.join(" | ")}\n`;
	formattedResults += `${headers.map(() => "---").join(" | ")}\n`;

	// Add rows
	for (const row of displayResults) {
		const rowValues = headers.map((header) => {
			const value = row[header];
			return value === null ? "NULL" : String(value).substring(0, 20);
		});
		formattedResults += `${rowValues.join(" | ")}\n`;
	}

	formattedResults += "```\n";

	// Add note if results were truncated
	if (results.length > maxRows) {
		formattedResults += `\n_Showing ${maxRows} of ${results.length} results._`;
	}

	return formattedResults;
};

export const handleExecuteQueryButton = async (
	interaction: ButtonInteraction,
) => {
	await interaction.deferUpdate();

	try {
		// Extract the query from the message embed
		// The query is in the description field of the first embed
		const embeds = interaction.message.embeds;

		if (!embeds || embeds.length === 0) {
			throw new Error("Could not find the SQL query in the message");
		}

		// const query = embeds[0].description;
		const query = embeds[0].fields?.[1]?.value;

		if (!query) {
			throw new Error("Query not found in message embed");
		}

		// Validate query is SELECT only for security
		if (!query.trim().toLowerCase().startsWith("select")) {
			throw new Error("Only SELECT queries are allowed for security reasons");
		}

		const question = embeds[0].fields?.[0]?.value || "No question provided";

		// Execute the query using Prisma's raw query
		const results = await prismaAI.$queryRawUnsafe(query);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const formattedResults = formatQueryResults(results as any[]);

		// Create response embed
		const resultsEmbed = new EmbedBuilder()
			.setColor("#00FF00")
			.setTitle("Result")
			.setFields([
				{
					name: "Question",
					value: question || "No question provided",
				},
				{
					name: "Generated Query",
					value: query ? `\`\`\`${query}\`\`\`` : "No query provided",
				},
				{
					name: "Output",
					value: formattedResults || "No results found",
				},
			])
			.setFooter({ text: "Query executed successfully" })
			.setTimestamp();

		await interaction.editReply({
			embeds: [resultsEmbed],
			components: [],
		});
	} catch (error) {
		console.error("Error executing query:", error);

		const errorEmbed = new EmbedBuilder()
			.setColor("#FF0000")
			.setTitle("Query Execution Failed")
			.setDescription(
				`Error: ${error instanceof Error ? error.message : String(error)}`,
			)
			.setTimestamp();

		await interaction.editReply({
			embeds: [errorEmbed],
			components: [],
		});
	}
};

export const handleCancelQueryButton = async (
	interaction: ButtonInteraction,
) => {
	if (interaction.customId !== "cancel_query") {
		return;
	}

	const embed = EmbedBuilder.from(interaction.message.embeds[0])
		.setColor("#888888")
		.setTitle("Query Cancelled");

	await interaction.update({
		embeds: [embed],
		components: [],
	});
};
