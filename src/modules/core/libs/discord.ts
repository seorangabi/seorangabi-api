import {
	Client,
	GatewayIntentBits,
	StringSelectMenuInteraction,
} from "discord.js";
import {
	chooseTeamInteraction,
	offeringInteraction,
} from "../../offering/offering.interaction.js";
import { Hono } from "hono";
import { env } from "hono/adapter";

const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds],
});

const start = () => {
	discordClient.on("ready", async (c) => {
		console.log(`Logged in as ${c.user.tag}!`);
	});

	discordClient.on("interactionCreate", async (interaction) => {
		if (interaction instanceof StringSelectMenuInteraction) {
			const [action, id] = interaction.customId.split("/");
			if (action === "offering") {
				await offeringInteraction({
					interaction,
					offeringId: id,
				});
				return;
			}

			if (action === "choose-team") {
				await chooseTeamInteraction({
					interaction,
					projectId: id,
				});
			}
		}
	});
	discordClient.login(process.env.DISCORD_TOKEN);
};

const Route = new Hono().basePath("/discord");

const Commands = [
	{
		name: "hello",
		description: "Says hello back to you",
		// @ts-ignore
		run: (interaction) => {
			const user = interaction.member.user.id;
			return Promise.resolve(`Hello <@${user}>!`);
		},
	},
];

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
	{
		const data = await registerResponse.json();
		return Response.json({ message: "Commands registered" });
	}
});

export { Route, start, discordClient };
