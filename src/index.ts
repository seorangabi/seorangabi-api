import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import projectRoute from "./modules/project/project.router.js";
import { cors } from "hono/cors";
import teamRoute from "./modules/team/team.router.js";
import { logger } from "hono/logger";
import payrollRoute from "./modules/payroll/payroll.router.js";
import statisticRoute from "./modules/statistic/statistic.js";
import {
  Client,
  DiscordAPIError,
  StringSelectMenuInteraction,
} from "discord.js";
import { env } from "hono/adapter";
import { Commands } from "./commands.js";
import {
  offeringInteraction,
  chooseTeamInteraction,
} from "./modules/offering/offering.interaction.js";
import offeringRoute from "./modules/offering/offering.router.js";
import { HTTPException } from "hono/http-exception";
import discordClient from "./discord.js";

discordClient.on("ready", async (c) => {
  console.log(`Logged in as ${c.user.tag}!`);
});

discordClient.on("interactionCreate", async (interaction) => {
  if (interaction instanceof StringSelectMenuInteraction) {
    const [action, id] = interaction.customId.split("/");
    if (action === "offering") {
      await offeringInteraction({
        interaction,
        offeringId: id,
      });
      return;
    }

    if (action === "choose-team") {
      await chooseTeamInteraction({
        interaction,
        projectId: id,
      });
    }
  } else {
    console.log(interaction);
  }
});
discordClient.login(process.env.DISCORD_TOKEN);

declare module "hono" {
  interface ContextVariableMap {
    discordClient: Client;
  }
}

const app = new Hono();

// Middleware to inject Discord client into context
app.use("*", async (c, next) => {
  c.set("discordClient", discordClient); // Attach Discord client to context
  await next();
});

app.get("/", (c) => c.text("Seorangabi API"));
app.use(prettyJSON());
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

// API
const api = new Hono();
api.use(
  "*",
  cors({
    origin: ["https://studio.seorangabi.com", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);
api.use(logger());
api.route("/", projectRoute);
api.route("/", teamRoute);
api.route("/", payrollRoute);
api.route("/", statisticRoute);
api.route("/", offeringRoute);

app.route("/v1", api);

/**
 * Register slash commands with Discord. This is only required once (or when you update your commands)
 */
app.get("/register", async (ctx) => {
  const { DISCORD_APPLICATION_ID, DISCORD_TOKEN, BOT_SECRET } = env(ctx);
  if (ctx.req.query("secret") !== BOT_SECRET) {
    return ctx.text("Unauthorized", 401);
  }

  const registerResponse = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${DISCORD_TOKEN}`,
      },
      method: "PUT",
      body: JSON.stringify(Commands),
    }
  );

  if (!registerResponse.ok) {
    const err = await registerResponse.json();
    return console.error(err), ctx.json(err, 500);
  }
  {
    const data = await registerResponse.json();
    console.log(data);
    return Response.json({ message: "Commands registered" });
  }
});

// @ts-ignore
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  
  if (err instanceof DiscordAPIError) {
    return new Response(`Discord Error: ${err.message}`, {
      status: 500,
    });
  }

  if (err instanceof Error) {
    return new Response(err.message, {
      status: 500,
    })
  }
  console.log(err);
});

const port = 3020;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
