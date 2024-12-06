import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
  type Client,
  type StringSelectMenuInteraction,
} from "discord.js";
import prisma from "../core/libs/prisma.js";

export const offeringInteraction = async ({
  interaction,
  offeringId,
}: {
  interaction: StringSelectMenuInteraction;
  offeringId: string;
}) => {
  // option selected
  const option = interaction.values[0];

  if (option === "no") {
    await prisma.offering.update({
      data: {
        stage: "REJECTED",
      },
      where: {
        id: offeringId,
      },
    });
    console.log(`Update offering status ${offeringId} to rejected`);

    const offering = await prisma.offering.findUniqueOrThrow({
      where: {
        id: offeringId,
      },
      select: {
        team: {
          select: {
            discordUserId: true,
          },
        },
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    if (offering.team?.discordUserId) {
      // remove member from thread
      const thread = await interaction.channel?.fetch();
      if (thread instanceof TextChannel) {
        thread?.members.delete(offering.team?.discordUserId);
        console.log(
          `Remove member ${offering.team?.discordUserId} from thread ${interaction.channel?.id}`
        );
      }
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(`create-offering/${offering?.project?.id}`)
      .setPlaceholder("Select an option")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("dio").setValue("dio"),
        new StringSelectMenuOptionBuilder().setLabel("vin").setValue("vin"),
        new StringSelectMenuOptionBuilder().setLabel("ameva").setValue("ameva"),
        new StringSelectMenuOptionBuilder()
          .setLabel("kluqis")
          .setValue("kluqis")
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      select
    );

    interaction.reply({
      content: `Kamu mau offer ke siapa nih ? \nKalau mau ubah data offering lewat dashboard yaaa`,
      components: [row],
    });

    // interaction.channel?.delete();
    // console.log(`Delete channel ${interaction.channel?.id} for offering ${id}`);
    return;
  }

  if (option === "yes") {
    await prisma.offering.update({
      where: {
        id: offeringId,
      },
      data: {
        stage: "IN_PROGRESS",
      },
    });
    console.log(`Update offering status ${offeringId} to in progress`);

    interaction.message.edit({
      components: [],
    });
    console.log(`Delete components for offering ${offeringId}`);

    interaction.reply({
      content: `Here we go 🚀 \nJangan lupa deadline mu sampai 8:40 WIB`,
    });
    return;
  }

  console.log("Invalid option selected");
};

export const createOfferingInteraction = async ({
  interaction,
  projectId,
}: {
  interaction: StringSelectMenuInteraction;
  projectId: string;
}) => {
  // option selected
  const option = interaction.values[0];

  interaction.reply({
    content: `Option selected: ${option}`,
  });
};
