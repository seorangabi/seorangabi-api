import prisma from "../prisma.js";
import config from "../../config/index.js";
import type {
	Project,
	ProjectStatus,
	Team,
} from "../../../../../prisma/generated/client/index.js";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

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

/**
 * Format date range for display
 */
function formatDateRange(start: string, end: string): string {
	const startDate = parseISO(start);
	const endDate = parseISO(end);
	return `${format(startDate, "d", { locale: localeId })} - ${format(
		endDate,
		"d MMM yyyy",
		{ locale: localeId },
	)}`;
}

export {
	findTeamByDiscordUserId,
	getProjects,
	formatProjectsList,
	isUserAdmin,
	formatDateRange,
};
