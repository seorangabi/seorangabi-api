import { TextChannel } from "discord.js";
import { discordClient } from "../core/libs/discord.js";
import prisma from "../core/libs/prisma.js";
import redisInstance from "../core/libs/redis.js";
import { Worker } from "bullmq";
import config from "../core/config/index.js";

export const projectDeadlineWorker = new Worker(
  "projectdeadline",
  async (job) => {
    const { projectId, minutes } = job.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.status === "DONE") {
      console.log(
        `Skipping notification for completed project "${projectId}".`
      );
      return;
    }

    const offering = await prisma.offering.findFirst({
      where: {
        projectId,
        status: "ACCEPTED",
      },
      include: {
        team: {
          select: {
            id: true,
            discordUserId: true,
            discordChannelId: true,
          },
        },
      },
    });

    if (!offering || !offering?.discordThreadId) {
      console.log(
        `Skipping notification for project "${projectId}: no offering".`
      );
      return;
    }

    const channel = await discordClient.channels.fetch(
      offering?.team?.discordChannelId
    );
    if (!channel || !(channel instanceof TextChannel)) {
      console.log(
        `Skipping notification for project "${projectId}: no channel".`
      );
      return;
    }
    const thread = await channel.threads.fetch(offering.discordThreadId);
    if (!thread) {
      console.log(
        `Skipping notification for project "${projectId}: no thread".`
      );
      return;
    }

    const adminDiscordUserId = await config.getAdminDiscordId();

    let message = ``;
    if (minutes === 0) {
      message = `Deadline project mu <@${offering.team.discordUserId}> telah selesai. \ncc <@${adminDiscordUserId}>`;
    } else {
      message = `Deadline project mu <@${offering.team.discordUserId}> kurang ${minutes} menit lagi.`;
    }

    await thread.send({
      content: message,
    });

    console.log(`🔔 ${message}`);
  },
  { connection: redisInstance }
);
