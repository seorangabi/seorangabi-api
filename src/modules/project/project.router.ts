import { Hono } from "hono";
import prisma from "../core/libs/prisma.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { isUndefined } from "../core/libs/utils.js";
import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from "discord.js";
import type { Prisma } from "../../../prisma/generated/client/index.js";

const projectRoute = new Hono().basePath("/project");

const withTeam = z.enum(["team"]);
const sortTeam = z.enum(["created_at:asc", "created_at:desc"]);

projectRoute.get(
  "/list",
  zValidator(
    "query",
    z.object({
      id_eq: z.string().optional(),
      team_id_eq: z.string().optional(),
      status_eq: z
        .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE"])
        .optional(),
      is_paid_eq: z.enum(["true", "false"]).optional(),
      skip: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      with: z.union([withTeam, z.array(withTeam)]).optional(),
      sort: z.union([sortTeam, z.array(sortTeam)]).optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid("query");

    const include: Prisma.ProjectInclude = {};
    if (!isUndefined(query.with)) {
      const withArray = Array.isArray(query.with) ? query.with : [query.with];

      if (withArray.includes("team")) include.team = true;
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {};
    if (!isUndefined(query.sort)) {
      const sortArray = Array.isArray(query.sort) ? query.sort : [query.sort];

      if (sortArray.includes("created_at:asc")) {
        orderBy.createdAt = "asc";
      }
      if (sortArray.includes("created_at:desc")) {
        orderBy.createdAt = "desc";
      }
    }

    const where: Prisma.ProjectWhereInput = {};
    if (!isUndefined(query.id_eq)) {
      where.id = query.id_eq;
    }
    if (!isUndefined(query.team_id_eq)) {
      where.teamId = query.team_id_eq;
    }
    if (!isUndefined(query.status_eq)) {
      where.status = query.status_eq;
    }
    if (query.is_paid_eq === "true") where.isPaid = true;
    if (query.is_paid_eq === "false") where.isPaid = false;

    const result = await prisma.project.findMany({
      include,
      where,
      orderBy,
      ...(!isUndefined(query.skip) && { skip: query.skip }),
      ...(!isUndefined(query.limit) && { take: query.limit + 1 }),
    });

    let hasNext = false;
    if (query.limit && result.length > query.limit) {
      result.pop();
      hasNext = true;
    }

    const hasPrev = !isUndefined(query.skip) && query.skip > 0;

    return c.json({
      data: {
        docs: result,
        pagination: {
          hasNext,
          hasPrev,
        },
      },
    });
  }
);

projectRoute.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      fee: z.number(),
      note: z.string().nullable().optional(),
      deadline: z.string(),
      imageRatio: z.string(),
      imageCount: z.number(),
      teamId: z.string(),
      clientName: z.string().optional(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");

    const result = await prisma.project.create({
      data: body,
    });
    console.log("Project created:", result.id);

    const offering = await prisma.offering.create({
      data: {
        deadline: body.deadline,
        fee: body.fee,
        projectId: result.id,
        note: result.note,
        stage: "OFFERING",
        teamId: body.teamId,
      },
    });
    console.log("Offering created:", offering.id);

    const team = await prisma.team.findUniqueOrThrow({
      where: {
        id: body.teamId,
      },
    });
    console.log("Team found:", team?.id);

    const discordClient = c.get("discordClient");

    const channel = await discordClient.channels.fetch("1313163294692868227");

    if (channel instanceof TextChannel) {
      try {
        const thread = await channel.threads.create({
          name: `${body.name}`,
          type: ChannelType.PrivateThread,
        });

        if (team?.discordUserId) {
          await thread.members.add(team?.discordUserId);
          console.log("Member added:", team?.discordUserId);
          // await thread.members.add("540163649709277245");
          // console.log("Member added:", "540163649709277245");
        } else {
          console.log(`Team ${body.teamId} not have discord user id`);
        }

        // inside a command, event listener, etc.
        const exampleEmbed = new EmbedBuilder()
          .setTitle(`🌟 NEW PROJECT 🌟 \n ${body.name}`)
          .addFields(
            { name: "Deadline", value: `${body.deadline}` },
            { name: "Fee", value: `${body.fee}` },
            { name: "Ratio", value: `${body.imageRatio}` },
            { name: "Client", value: `${body.clientName || "-"}` }
          );

        await thread.send({ embeds: [exampleEmbed] });
        console.log("Embed sent");

        if (team?.discordUserId) {
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

          const row =
            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              select
            );

          await thread.send({
            content: `Ready cuy <@${team?.discordUserId}> ? \nwaktu konfirmasi mu sampai jam 11:00 yaaa 👀`,
            components: [row],
          });
        }
      } catch (error) {
        console.error(
          `Gagal membuat thread untuk project ${body.name}:`,
          error
        );
      }
    } else {
      console.error("Channel tidak valid atau bukan tipe text.");
    }

    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

projectRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await prisma.project.delete({
    where: {
      id,
    },
  });

  return c.json({
    data: {
      doc: result,
    },
  });
});

projectRoute.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      fee: z.number().optional(),
      note: z.string().nullable().optional(),
      deadline: z.string().optional(),
      imageRatio: z.string().optional(),
      status: z
        .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE"])
        .optional(),
      teamId: z.string().optional(),
      imageCount: z.number().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const result = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name: isUndefined(body.name) ? undefined : body.name,
        fee: isUndefined(body.fee) ? undefined : body.fee,
        note: isUndefined(body.note) ? undefined : body.note,
        deadline: isUndefined(body.deadline) ? undefined : body.deadline,
        imageRatio: isUndefined(body.imageRatio) ? undefined : body.imageRatio,
        status: isUndefined(body.status) ? undefined : body.status,
        teamId: isUndefined(body.teamId) ? undefined : body.teamId,
        imageCount: isUndefined(body.imageCount) ? undefined : body.imageCount,
        doneAt: body.status === "DONE" ? new Date().toISOString() : undefined,
      },
    });

    return c.json({
      data: {
        doc: result,
      },
    });
  }
);

export default projectRoute;
