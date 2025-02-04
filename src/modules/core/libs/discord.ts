import {
	ChatInputCommandInteraction,
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
import prisma from "./prisma.js";
import { updateProject } from "../../project/project.service.js";
import config from "../config/index.js";

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

		if (interaction instanceof ChatInputCommandInteraction) {
			if (interaction.commandName === "done") {
				const adminDiscordId = await config.getAdminDiscordId();

				if (adminDiscordId !== interaction.user.id) {
					interaction.reply("Hanya admin yang diperbolehkan");
					return;
				}

				const offering = await prisma.offering.findFirst({
					where: {
						discordThreadId: interaction.channelId,
					},
				});

				if (!offering) {
					interaction.reply("Offering tidak ditemukan");
					return;
				}

				if (offering.status !== "ACCEPTED") {
					interaction.reply("Konfirmasi dahulu offering nya 🙏");
					return;
				}

				const project = await prisma.project.findFirst({
					where: {
						id: offering.projectId,
					},
				});

				if (!project) {
					interaction.reply("Project tidak ditemukan");
					return;
				}

				interaction.reply("Acc ✅");

				await updateProject({
					id: project.id,
					body: {
						status: "DONE",
					},
					prisma,
					discordClient,
				});
			}
		}
	});
	discordClient.login(process.env.DISCORD_TOKEN);
};

const Route = new Hono().basePath("/discord");

const Commands = [
	{
		name: "done",
		description: "Mengupdate status project menjadi done",
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
