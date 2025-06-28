import {
	ChatInputCommandInteraction,
	Client,
	Events,
	GatewayIntentBits,
	StringSelectMenuInteraction,
} from "discord.js";
import {
	chooseTeamInteraction,
	offeringInteraction,
} from "../../offering/offering.interaction.js";
import { Hono } from "hono";
import { env } from "hono/adapter";
import { Commands } from "./discord/commands.js";
import { imageProductionPerWeekCommandHandler } from "./discord/handlers/image-production-per-week.js";
import { doneCommandHandler } from "./discord/handlers/done.js";
import { projectsCommandHandler } from "./discord/handlers/projects.js";
import { askAIHandler } from "./discord/handlers/ask-ai.js";
import {
	handleCancelQueryButton,
	handleExecuteQueryButton,
} from "./discord/handlers/button-handlers.js";

const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds],
});

// --------------- Main Bot Logic ---------------

const start = () => {
	discordClient.on("ready", async (c) => {
		console.log(`Logged in as ${c.user.tag}!`);
	});

	discordClient.on("interactionCreate", async (interaction) => {
		if (interaction instanceof StringSelectMenuInteraction) {
			const [action, id] = interaction.customId.split("/");

			if (action === "offering") {
				await offeringInteraction({ interaction, offeringId: id });
				return;
			}

			if (action === "choose-team") {
				await chooseTeamInteraction({ interaction, projectId: id });
				return;
			}
		}

		if (interaction instanceof ChatInputCommandInteraction) {
			switch (interaction.commandName) {
				case "done":
					await doneCommandHandler(interaction, discordClient);
					break;

				case "projects":
					await projectsCommandHandler(interaction);
					break;

				case "image-production-per-week":
					await imageProductionPerWeekCommandHandler(interaction);
					break;

				case "ask-ai":
					await askAIHandler(interaction);
					break;
			}
			return;
		}

		if (interaction.isButton()) {
			if (interaction.customId === "execute_query") {
				await handleExecuteQueryButton(interaction);
			} else if (interaction.customId === "cancel_query") {
				await handleCancelQueryButton(interaction);
			}
			return;
		}
	});

	discordClient.login(process.env.DISCORD_TOKEN);
};

const Route = new Hono().basePath("/discord");

/**
 * Register slash commands with Discord. This is only required once (or when you update your commands)
 */
Route.get("/register", async (ctx) => {
	const { DISCORD_APPLICATION_ID, DISCORD_TOKEN, BOT_SECRET } = env(ctx);
	if (ctx.req.query("secret") !== BOT_SECRET) {
		return ctx.text("Unauthorized", 401);
	}

	const registerResponse = await fetch(
		`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bot ${DISCORD_TOKEN}`,
			},
			method: "PUT",
			body: JSON.stringify(Commands),
		},
	);

	if (!registerResponse.ok) {
		const err = await registerResponse.json();
		return ctx.json(err, 500);
	}

	const data = await registerResponse.json();
	return Response.json({ message: "Commands registered" });
});

export { Route, start, discordClient };
