import { TextChannel, type Client, type TextThreadChannel } from "discord.js";
import type {
  OfferingStatus,
  Prisma,
  PrismaClient,
} from "../../../prisma/generated/client/index.js";
import { HTTPException } from "hono/http-exception";

export const getOfferingTeamThreadFromProjectId = async ({
  discordClient,
  prisma,
  projectId,
  status = "ACCEPTED",
}: {
  discordClient: Client;
  prisma: Omit<
    PrismaClient<Prisma.PrismaClientOptions>,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;
  projectId: string;
  status?: OfferingStatus;
}) => {
  const offerings = await prisma.offering.findMany({
    where: {
      projectId,
      status,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      teamId: true,
      discordThreadId: true,
    },
  });
  const offering = offerings[0];

  if (!offering)
    throw new HTTPException(404, {
      message: "Offering not found",
    });

  const team = await prisma.team.findUniqueOrThrow({
    where: {
      id: offering.teamId,
    },
    select: {
      id: true,
      discordUserId: true,
      discordChannelId: true,
    },
  });

  const channel = await discordClient.channels.fetch(team.discordChannelId);

  if (!channel)
    throw new HTTPException(404, {
      message: "Channel not found",
    });

  if (!(channel instanceof TextChannel)) throw new Error("Channel not found");

  const thread = channel.threads.cache.find(
    (t) => t.id === offering.discordThreadId
  );

  if (!thread)
    throw new HTTPException(404, {
      message: "Thread not found",
    });

  return {
    team,
    offering,
    thread,
  };
};

export const recalculateProject = async ({
  prisma,
  projectId,
}: {
  prisma: Omit<
    PrismaClient<Prisma.PrismaClientOptions>,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;
  projectId: string;
}) => {
  const tasks = await prisma.task.findMany({
    where: {
      projectId: projectId,
    },
  });

  const { totalFee, totalImageCount } = tasks.reduce(
    (acc, task) => {
      return {
        totalFee: acc.totalFee + task.fee,
        totalImageCount: acc.totalImageCount + task.imageCount,
      };
    },
    {
      totalFee: 0,
      totalImageCount: 0,
    }
  );

  return prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      fee: totalFee,
      imageCount: totalImageCount,
    },
  });
};
