import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder } from "discord.js";

const askAIHandler = async (interaction: ChatInputCommandInteraction) => {
	// Defer reply to give us time to call the AI API
	await interaction.deferReply();

	try {
		// Get the user's question from the interaction
		const question = interaction.options.getString("question");

		if (!question) {
			return interaction.editReply("Please provide a question to ask the AI.");
		}

		// Check if we have the required environment variables
		const agentUrl = process.env.AGENT_URL;
		const agentApiKey = process.env.AGENT_API_KEY;

		if (!agentUrl || !agentApiKey) {
			console.error(
				"Missing AGENT_URL or AGENT_API_KEY in environment variables",
			);
			return interaction.editReply("AI service is not properly configured.");
		}

		// Send the question to the AI agent
		const response = await fetch(`${agentUrl}/ask`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${agentApiKey}`,
			},
			body: JSON.stringify({
				message: question,
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
			.setTitle("AI Response")
			.setDescription(data.message)
			.setTimestamp();

		// Send the response back to Discord
		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		console.error("Error in askAIHandler:", error);

		// Handle errors gracefully
		if (interaction.deferred || interaction.replied) {
			await interaction.editReply("Sorry, I encountered an error");
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
