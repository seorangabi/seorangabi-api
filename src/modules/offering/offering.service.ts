import { format } from "date-fns";
import {
  ActionRowBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from "discord.js";
import type { PrismaClient } from "../../../prisma/generated/client/index.js";
import { formatRupiah } from "../core/libs/utils.js";
import type { z } from "zod";
import type { createOfferingJsonSchema } from "./offering.schema.js";
import { HTTPException } from "hono/http-exception";

export const createOfferingAndInteraction = async ({
  discordClient,
  prisma,
  body,
  project,
}: {
  discordClient: Client;
  prisma: PrismaClient;
  body: z.infer<typeof createOfferingJsonSchema>;
  project: {
    name: string;
    imageRatio: string;
    clientName: string;
  };
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
    throw new HTTPException(404, { message: "Discord channel id not found" });
  if (!team.discordUserId)
    throw new HTTPException(404, { message: "Discord user id not found" });

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
      deadline: body.deadline,
      fee: body.fee,
      note: body.note,
      status: "OFFERING",
      discordThreadId: thread.id,
    },
  });
  console.log("Offering created:", offering.id);

  const embed = new EmbedBuilder()
    .setTitle(`🌟 NEW PROJECT 🌟 \n ${project.name}`)
    .addFields(
      {
        name: "Deadline",
        value: `${format(body.deadline, "dd MMMM yyyy HH:mm")}`,
      },
      { name: "Fee", value: `${formatRupiah(body.fee)}` },
      { name: "Ratio", value: `${project.imageRatio || "-"}` },
      { name: "Client", value: `${project.clientName || "-"}` }
    );

  console.log("Sending embed");
  await thread.send({ embeds: [embed] });
  console.log("Embed sent");

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

  return {
    offeringId: offering.id,
  };
};
