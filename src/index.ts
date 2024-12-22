import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { DiscordAPIError } from "discord.js";
import { HTTPException } from "hono/http-exception";
import * as discord from "./libs/discord.js";
import api from "./api.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { showRoutes } from "hono/dev";
import { useJWT } from "./libs/jwt.js";

discord.start();

const app = new Hono();

app.use(
  "/uploads/*",
  serveStatic({
    root: "./",
    onNotFound: (path, c) => {
      console.log(`${path} is not found, you access ${c.req.path}`);
    },
  })
);

// Middleware to inject Discord client into context
app.use("*", async (c, next) => {
  c.set("discordClient", discord.discordClient); // Attach Discord client to context
  await next();
});

app.get("/", (c) => c.text("API Seorangabi"));
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

app.use(prettyJSON());

app.route("/", discord.Route);
app.route("/v1", api);

showRoutes(app, {
  colorize: true,
  // verbose: true,
});

// @ts-ignore
app.onError((err) => {
  console.log(err);
  if (err instanceof HTTPException) return err.getResponse();

  if (err instanceof DiscordAPIError) {
    return new Response(`Discord Error: ${err.message}`, {
      status: 500,
    });
  }

  if (err instanceof Error) {
    return new Response(err.message, {
      status: 500,
    });
  }
});

const port = 3020;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
