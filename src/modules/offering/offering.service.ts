import { format } from "date-fns";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from "discord.js";
import type {
  Prisma,
  PrismaClient,
} from "../../../prisma/generated/client/index.js";
import { formatRupiah } from "../core/libs/utils.js";
import type { z } from "zod";
import type { createOfferingJsonSchema } from "./offering.schema.js";
import { HTTPException } from "hono/http-exception";
import { createReadStream } from "fs";

export const createOfferingAndInteraction = async ({
  discordClient,
  prisma,
  body,
  project,
  tasks,
}: {
  discordClient: Client;
  prisma: Omit<
    PrismaClient<Prisma.PrismaClientOptions>,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >;
  body: z.infer<typeof createOfferingJsonSchema>;
  project: {
    name: string;
    imageRatio: string;
    clientName: string;
  };
  tasks: {
    fee: number;
    note?: string;
    attachmentUrl: string;
  }[];
}) => {
  console.log("Fetching team:", body.teamId);
  const team = await prisma.team.findUniqueOrThrow({
    where: {
      id: body.teamId,
    },
    select: {
      id: true,
      discordUserId: true,
      discordChannelId: true,
    },
  });
  console.log("Team fetched:", team?.id);
  if (!team.discordChannelId)
    throw new HTTPException(404, { message: "Discord channel id is empty" });
  if (!team.discordUserId)
    throw new HTTPException(404, { message: "Discord user id is empty" });

  console.log("Fetching user:", team.discordUserId);
  const discordUser = await discordClient.users.fetch(team.discordUserId);
  console.log("Discord user fetched:", discordUser?.id);

  console.log("Fetching channel:", team.discordChannelId);
  const channel = await discordClient.channels.fetch(team.discordChannelId);
  console.log("Channel fetched:", channel?.id);

  if (!(channel instanceof TextChannel)) throw new Error("Channel not found");

  console.log("Creating thread:", project.name);
  const thread = await channel.threads.create({
    name: `${project.name}`,
    type: ChannelType.PrivateThread,
  });
  console.log("Thread created:", thread.id);

  await thread.members.add(team.discordUserId);
  console.log("Member added:", team.discordUserId);
  // await thread.members.add("540163649709277245");
  // console.log("Member added:", "540163649709277245");

  console.log("Creating offering:", JSON.stringify(body));
  const offering = await prisma.offering.create({
    data: {
      projectId: body.projectId,
      teamId: body.teamId,
      status: "OFFERING",
      discordThreadId: thread.id,
      confirmationDuration: 30 * 60 * 1000, // 30 menit
    },
  });
  console.log("Offering created:", offering.id);

  const deadlineIsSameDay =
    new Date(body.deadline).setHours(0, 0, 0, 0) ===
    new Date().setHours(0, 0, 0, 0);

  const deadlineText = deadlineIsSameDay
    ? format(body.deadline, "HH:mm") // today
    : `${format(body.deadline, "dd MMMM yyyy")} || _${format(
        body.deadline,
        "HH:mm"
      )}_`; // tomorrow

  console.log("Sending offering");
  await thread.send({
    content: `
🌟 NEW PROJECT 🌟
${project.name}
DL: ${deadlineText}
RATIO : ${project.imageRatio || "N/A"}
CLIENT : ${project.clientName || "N/A"}
    `,
  });
  console.log("Offering sent");

  const select = new StringSelectMenuBuilder()
    .setCustomId(`offering/${offering.id}`)
    .setPlaceholder("Select an option")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Let's Go 🚀")
        .setValue("yes"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Nggak dulu ❌")
        .setValue("no")
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    select
  );

  console.log("Sending message");
  await thread.send({
    content: `Ready cuy <@${team?.discordUserId}> ? \nwaktu konfirmasi mu sampai jam 11:00 yaaa 👀`,
    components: [row],
  });
  console.log("Message sent");

  for (const task of tasks) {
    const name = task.attachmentUrl.split("/").pop();
    const attachment = new AttachmentBuilder(task.attachmentUrl, {
      name,
    });

    await thread.send({
      content: `FEE : ${formatRupiah(task.fee)}\n${task.note}`,
      files: [attachment],
    });
  }

  return {
    offeringId: offering.id,
    offering,
    team,
  };
};
