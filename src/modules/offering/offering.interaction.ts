import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
  type StringSelectMenuInteraction,
} from "discord.js";
import prisma from "../core/libs/prisma.js";
import { createOfferingAndInteraction } from "./offering.service.js";

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
    interaction.message.edit({
      components: [],
    });
    console.log(`Delete components for offering ${offeringId}`);

    await prisma.offering.update({
      data: {
        status: "REJECTED",
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
        projectId: true,
        team: {
          select: {
            discordUserId: true,
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
    const teams = await prisma.team.findMany({});
    const options = teams.map((team) => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(team.name)
        .setValue(team.id);
    });
    const select = new StringSelectMenuBuilder()
      .setCustomId(`choose-team/${offering?.projectId}`)
      .setPlaceholder("Select an option")
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      select
    );

    interaction.reply({
      content: `Kamu mau offer ke siapa nih ? \nJika mau ubah offering lewat dashboard yaaa`,
      components: [row],
    });
    console.log("Reply choose team for offering", offeringId);

    return;
  }

  if (option === "yes") {
    console.log(`Updating status to in progress for offering id:`, offeringId);
    const offering = await prisma.offering.update({
      where: {
        id: offeringId,
      },
      data: {
        status: "ACCEPTED",
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    console.log(
      `Updating status to in progress for project id:`,
      offering.projectId
    );
    await prisma.project.update({
      where: {
        id: offering.projectId,
      },
      data: {
        status: "IN_PROGRESS",
      },
    });

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

export const chooseTeamInteraction = async ({
  interaction,
  projectId,
}: {
  interaction: StringSelectMenuInteraction;
  projectId: string;
}) => {
  // option selected
  const teamId = interaction.values[0];

  console.log("get project:", projectId);
  const project = await prisma.project.findUniqueOrThrow({
    where: {
      id: projectId,
    },
  });

  console.log(
    "updating teamId for project:",
    JSON.stringify({
      projectId,
      teamId,
    })
  );
  await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      teamId: teamId,
    },
  });

  const { offering } = await createOfferingAndInteraction({
    discordClient: interaction.client,
    prisma,
    body: {
      projectId: projectId,
      teamId: teamId,
      deadline: project.deadline.toISOString(),
      fee: project.fee,
      note: project.note,
    },
    project: {
      name: project.name,
      imageRatio: project.imageRatio,
      clientName: project.clientName,
    },
  });

  interaction.channel?.delete();
  console.log(
    `Delete channel ${interaction.channel?.id} for offering ${offering.id}`
  );
};
