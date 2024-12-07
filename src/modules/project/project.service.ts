import { TextChannel, type Client, type TextThreadChannel } from "discord.js";
import type { PrismaClient } from "../../../prisma/generated/client/index.js";
import { HTTPException } from "hono/http-exception";

export const getOfferingTeamThreadFromProjectId = async ({
  discordClient,
  prisma,
  projectId,
}: {
  discordClient: Client;
  prisma: PrismaClient;
  projectId: string;
}) => {
  const offerings = await prisma.offering.findMany({
    where: {
      projectId,
      status: "ACCEPTED",
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
