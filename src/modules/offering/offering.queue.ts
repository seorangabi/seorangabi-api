import Bull from "bull";
import type { Offering } from "../../../prisma/generated/client/index.js";
import { discordClient } from "../../libs/discord.js";
import { getOfferingTeamThreadFromProjectId } from "../project/project.service.js";
import prisma from "../core/libs/prisma.js";
import { redisHost, redisPort } from "../core/libs/redis.js";
import { milliseconds } from "date-fns";

const offeringDeadlineQueue = new Bull("offeringDeadlineQueue", {
  redis: {
    host: redisHost,
    port: redisPort,
  },
});

offeringDeadlineQueue.process(async (offeringJob) => {
  try {
    console.log("Queue Offering Deadline Notification");
    const { offeringId, endTime, message } = offeringJob.data;

    const now = Date.now();

    if (now >= endTime) {
      console.log(
        `Waktu konfirmasi untuk Offering ID ${offeringId} telah habis.`
      );
      await offeringDeadlineQueue.removeRepeatableByKey(offeringId);
      return;
    }

    const offering = await prisma.offering.findFirst({
      where: {
        id: offeringId,
      },
      include: {
        team: {
          select: {
            discordUserId: true,
            discordChannelId: true,
          },
        },
      },
    });

    if (!offering) throw new Error("Offering not found");

    const { thread } = await getOfferingTeamThreadFromProjectId({
      discordClient,
      prisma,
      projectId: offering.projectId,
      status: "OFFERING",
    });

    thread.send({
      content: message,
    });
  } catch (error) {
    console.error(error);
  }
});

export const createOfferingDeadlineNotification = async ({
  offering,
  message,
}: {
  message: string;
  offering: Offering;
}) => {
  const endTime =
    new Date(offering.createdAt).getTime() + offering.confirmationDuration;

  offeringDeadlineQueue.add(
    offering.id,
    {
      offeringId: offering.id,
      endTime,
      message,
    },
    {
      repeat: { every: milliseconds({ minutes: 1 }) },
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
};

// export const schedulePendingOfferings = async () => {
//   const now = Date.now();

//   const offerings = await prisma.offering.findMany({
//     where: {
//       confirmationDuration: {
//         gte: now - prisma.raw(`createdAt`), // Waktu konfirmasi masih berlaku
//       },
//     },
//   });

//   for (const offering of offerings) {
//     const endTime =
//       new Date(offering.createdAt).getTime() + offering.confirmationDuration;

//     if (now < endTime) {
//       // Tambahkan ulang job untuk offering yang masih aktif
//       await notificationQueue.add(
//         {
//           offeringId: offering.id,
//           endTime,
//           message: `Jangan lupa untuk mengkonfirmasi offering ini.`,
//         },
//         {
//           repeat: { every: 30 * 60 * 1000 },
//           removeOnComplete: true,
//         }
//       );
//     }
//   }
// };
