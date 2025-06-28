import type { ChatInputCommandInteraction } from "discord.js";
import {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";

const askAIHandler = async (interaction: ChatInputCommandInteraction) => {
	// allowed only for discord id (540163649709277245 & 798396651684888576)
	// if (
	// 	!interaction.user.id ||
	// 	!["540163649709277245", "798396651684888576"].includes(interaction.user.id)
	// ) {
	// 	return interaction.editReply("You are not allowed to use this command.");
	// }

	// Defer reply to give us time to call the AI API
	await interaction.deferReply();

	try {
		// Get the user's question from the interaction
		const question = interaction.options.getString("question");

		if (!question) {
			return interaction.reply("Please provide a question to ask the AI.");
		}

		// Check if we have the required environment variables
		const agentUrl = process.env.AGENT_URL;
		const agentApiKey = process.env.AGENT_API_KEY;

		if (!agentUrl || !agentApiKey) {
			console.error(
				"Missing AGENT_URL or AGENT_API_KEY in environment variables",
			);
			return interaction.reply("AI service is not properly configured.");
		}

		// Send the question to the AI agent
		const response = await fetch(`${agentUrl}/query`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${agentApiKey}`,
			},
			body: JSON.stringify({
				query: question,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed: ${response.status} ${errorText}`);
		}

		const data = await response.json();

		if (data.status !== "success") {
			throw new Error(`API response error: ${data.message || "Unknown error"}`);
		}

		// Create a rich embed for the response
		const embed = new EmbedBuilder()
			.setColor("#0099ff")
			.setTitle("Review Generated SQL Query")
			.setFields([
				{ name: "Question", value: question },
				{
					name: "Generated Query",
					value: data.query || "No query generated",
				},
			])
			.setFooter({ text: "Review the query before execution" })
			.setTimestamp();

		// Create confirmation button
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("execute_query")
				.setLabel("Execute Query")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("cancel_query")
				.setLabel("Cancel")
				.setStyle(ButtonStyle.Secondary),
		);

		// Send the response with buttons
		interaction.editReply({
			embeds: [embed],
			components: [row],
		});
	} catch (error) {
		console.error("Error in askAIHandler:", error);

		// Handle errors gracefully
		if (interaction.deferred || interaction.replied) {
			await interaction.reply("Sorry, I encountered an error");
		} else {
			console.error("Failed to edit reply:", error);
			await interaction.reply({
				content: "Sorry, I encountered an error",
				ephemeral: true,
			});
		}
	}
};

export { askAIHandler };
