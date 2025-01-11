import { TextChannel } from "discord.js";
import { discordClient } from "../core/libs/discord.js";
import prisma from "../core/libs/prisma.js";
import redisInstance from "../core/libs/redis.js";
import { Worker } from "bullmq";
import config from "../core/config/index.js";

export const offeringWorker = new Worker(
  "offering",
  async (job) => {
    const { offeringId, minutes } = job.data;

    const offering = await prisma.offering.findFirst({
      where: {
        id: offeringId,
        status: "OFFERING",
      },
      include: {
        team: {
          select: {
            id: true,
            discordUserId: true,
            discordChannelId: true,
          },
        },
        project: {
          select: {
            confirmationDuration: true,
          },
        },
      },
    });

    if (!offering || !offering?.discordThreadId) {
      console.log(
        `Skipping notification for offering "${offeringId}: no offering".`
      );
      return;
    }

    const now = new Date();
    const confirmationDate = new Date(
      offering.createdAt.getTime() + offering.project.confirmationDuration
    );

    if (now > confirmationDate && minutes !== 0) {
      console.log(`Skipping notification for offering "${offering}: expired".`);
      return;
    }

    const channel = await discordClient.channels.fetch(
      offering?.team?.discordChannelId
    );
    if (!channel || !(channel instanceof TextChannel)) {
      console.log(
        `Skipping notification for offering "${offering}: no channel".`
      );
      return;
    }
    const thread = await channel.threads.fetch(offering.discordThreadId);
    if (!thread) {
      console.log(
        `Skipping notification for offering "${offering}: no thread".`
      );
      return;
    }

    const getTime = () => {
      const remainingMinutes = Math.floor(
        (confirmationDate.getTime() - new Date().getTime()) / 60000
      );
      if (remainingMinutes >= 60) {
        return `${Math.floor(remainingMinutes / 60)} jam ${
          remainingMinutes % 60
        } menit`;
      }

      return `${remainingMinutes} menit`;
    };

    if (minutes === 0) {
      const adminDiscordUserId = await config.getAdminDiscordId();
      const message = `Deadline konfirmasi sudah berakhir <@${offering.team.discordUserId}>. \ncc  <@${adminDiscordUserId}>`;
      await thread.send({
        content: message,
      });
      console.log(message);
      return;
    } else {
      const message = `Jangan lupa konfirmasi project mu <@${
        offering.team.discordUserId
      }> yaa. \nBatas konfirmasi ${getTime()} lagi
      `;

      await thread.send({
        content: message,
      });
      console.log(message);
    }
  },
  { connection: redisInstance }
);
