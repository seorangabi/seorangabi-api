import type { ChatInputCommandInteraction } from "discord.js";
import {
	findTeamByDiscordUserId,
	formatProjectsList,
	getProjects,
	isUserAdmin,
} from "../helpers.js";
import type { Team } from "../../../../../../prisma/generated/client/index.js";

/**
 * Handle the "projects" command
 */
async function projectsCommandHandler(
	interaction: ChatInputCommandInteraction,
) {
	await interaction.deferReply();

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

export { projectsCommandHandler };
