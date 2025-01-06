import type { Offering } from "../../../prisma/generated/client/index.js";
import redisInstance from "../core/libs/redis.js";
import { milliseconds } from "date-fns";
import { Queue } from "bullmq";
import type { TextThreadChannel } from "discord.js";

const offeringQueue = new Queue("offering", {
  connection: redisInstance,
});

const addOfferingJob = async ({
  offering,
  confirmationDuration,
}: {
  offering: Pick<Offering, "id" | "createdAt"> & {
    team: {
      discordUserId: string;
    };
  };
  confirmationDuration: number; // milliseconds
}) => {
  const now = new Date();
  const createdAt = new Date(offering.createdAt);

  const deadlineConfirmationDate = new Date(
    createdAt.getTime() + confirmationDuration
  );
  if (now > deadlineConfirmationDate) return;

  const intervals = [15, 10, 5, 0];

  for (let i = 0; i < intervals.length; i++) {
    const minutes = intervals[i];
    const notificationTime = new Date(
      deadlineConfirmationDate.getTime() - milliseconds({ minutes })
    );

    if (notificationTime > now) {
      await offeringQueue.add(
        `offering-${offering.id}-${notificationTime.getTime()}`,
        {
          offeringId: offering.id,
          minutes,
        },
        { delay: notificationTime.getTime() - now.getTime() }
      );
    }
  }
};

const removeOfferingJob = async ({ offeringId }: { offeringId: string }) => {
  const jobs = await offeringQueue.getJobs(["waiting", "delayed"]);
  jobs.forEach(async (job) => {
    if (job.name.startsWith(`offering-${offeringId}`)) {
      await job.remove();
    }
  });
};

export { offeringQueue, addOfferingJob, removeOfferingJob };
