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
import type {
	Project,
	ProjectStatus,
	Team,
} from "../../../../prisma/generated/client/index.js";

const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds],
});

// --------------- Helper Functions ---------------

/**
 * Find team by Discord user ID
 */
async function findTeamByDiscordUserId(discordUserId: string) {
	return prisma.team.findFirst({
		where: { discordUserId },
	});
}

/**
 * Get projects with optional team and status filters
 */
async function getProjects({
	teamId,
	statusFilter,
	limit = 10,
}: {
	teamId?: string;
	statusFilter?: string;
	limit?: number;
}) {
	return prisma.project.findMany({
		where: {
			...(teamId ? { teamId } : {}), // Only filter by teamId if provided
			...(statusFilter ? { status: statusFilter as ProjectStatus } : {}),
			deletedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		take: limit,
		include: {
			team: true, // Include team information for "all teams" view
			offering: {
				where: { status: "ACCEPTED" }, // Only include accepted offerings
				select: {
					id: true,
					discordThreadId: true,
					status: true,
				},
				take: 1, // Limit to 1 accepted offering per project
			},
		},
	});
}

/**
 * Format a list of projects for Discord message
 */
function formatProjectsList(
	projects: (Project & {
		team?: Team | null;
		offering?: { id: string; discordThreadId: string; status: string }[];
	})[],
) {
	return projects
		.map((project, index) => {
			const deadline = new Date(project.deadline).toLocaleDateString("id-ID", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			});

			const offering = project.offering?.[0];

			// Include team name if available (for admin all-teams view)
			const teamInfo = project.team ? `Team: ${project.team.name}\n` : "";

			// Add thread link if offering exists
			const threadLink = offering?.discordThreadId
				? `\n[🔗 Open Thread](https://discord.com/channels/${process.env.DISCORD_TEST_GUILD_ID}/${offering.discordThreadId})`
				: "";

			return (
				`**${index + 1}. ${project.name}**\n` +
				`Status: ${project.status}\n` +
				`${teamInfo}` +
				`Client: ${project.clientName}\n` +
				`Deadline: ${deadline}\n` +
				`Fee: Rp ${project.fee.toLocaleString("id-ID")}` +
				`${threadLink}`
			);
		})
		.join("\n\n");
}

/**
 * Check if user is admin
 */
async function isUserAdmin(discordUserId: string) {
	const adminId = await config.getAdminDiscordId();
	return discordUserId === adminId;
}

// --------------- Command Handlers ---------------

/**
 * Handle the "done" command
 */
async function handleDoneCommand(interaction: ChatInputCommandInteraction) {
	const adminDiscordId = await config.getAdminDiscordId();

	if (adminDiscordId !== interaction.user.id) {
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

/**
 * Handle the "projects" command
 */
async function handleProjectsCommand(interaction: ChatInputCommandInteraction) {
	await interaction.deferReply({ ephemeral: true });

	try {
		const teamOption = interaction.options.getString("team");
		const statusOption = interaction.options.getString("status");
		const userIsAdmin = await isUserAdmin(interaction.user.id);

		// Check admin permission for team option
		if (teamOption && !userIsAdmin) {
			return interaction.editReply(
				"Hanya admin yang dapat melihat project tim lain.",
			);
		}

		let teamId: string | undefined;
		let teamName: string | null = null;

		// For non-admin or when admin specifies a team
		if (!userIsAdmin || teamOption) {
			let team: Team | null;

			if (teamOption) {
				// Admin specified a team by Discord user ID
				team = await findTeamByDiscordUserId(teamOption);

				if (!team) {
					return interaction.editReply(
						`Tim dengan discord user id "${teamOption}" tidak ditemukan.`,
					);
				}
			} else {
				// Regular user - use their own team
				team = await findTeamByDiscordUserId(interaction.user.id);

				if (!team) {
					return interaction.editReply(
						"Discord user Anda tidak terdaftar dalam sistem.",
					);
				}
			}

			teamId = team.id;
			teamName = team.name;
		}
		// Admin with no team specified - show all teams' projects
		// teamId remains undefined to fetch all projects

		// Get projects (for admin with no team specified, this will get all projects)
		const projects = await getProjects({
			teamId,
			statusFilter: statusOption || undefined,
		});

		if (projects.length === 0) {
			return interaction.editReply("Tidak ada project yang ditemukan.");
		}

		// Format response
		const projectList = formatProjectsList(projects);

		let responseTitle = "";
		if (userIsAdmin && !teamOption) {
			responseTitle = statusOption
				? `Projects - All Teams (Status: ${statusOption})`
				: "Projects - All Teams (Terbaru)";
		} else {
			responseTitle = statusOption
				? `Projects ${teamName} (Status: ${statusOption})`
				: `Projects ${teamName} (Terbaru)`;
		}

		return interaction.editReply({
			content: `# ${responseTitle}\n\n${projectList}\n\n*Menampilkan ${projects.length} dari maksimal 10 project*`,
		});
	} catch (error) {
		console.error("Error in projects command:", error);
		return interaction.editReply(
			"Terjadi kesalahan saat mengambil data project.",
		);
	}
}

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
					await handleDoneCommand(interaction);
					break;

				case "projects":
					await handleProjectsCommand(interaction);
					break;
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
	{
		name: "projects",
		description: "Melihat daftar project tim (max 10)",
		options: [
			{
				name: "status",
				description: "Filter project berdasarkan status",
				type: 3, // STRING type
				required: false,
				choices: [
					{ name: "DRAFT", value: "DRAFT" },
					{ name: "OFFERING", value: "OFFERING" },
					{ name: "IN_PROGRESS", value: "IN_PROGRESS" },
					{ name: "REVISION", value: "REVISION" },
					{ name: "DONE", value: "DONE" },
					{ name: "CANCELLED", value: "CANCELLED" },
				],
			},
			{
				name: "team",
				description: "Discord User ID (Admin only)",
				type: 3, // STRING type
				required: false,
			},
		],
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
