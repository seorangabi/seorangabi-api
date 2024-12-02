import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import projectRoute from "./modules/project/project.router.js";
import { cors } from "hono/cors";
import teamRoute from "./modules/team/team.router.js";
import { logger } from "hono/logger";
import payrollRoute from "./modules/payroll/payroll.router.js";
import statisticRoute from "./modules/statistic/statistic.js";

const app = new Hono();

app.get("/", (c) => c.text("Seorangabi API"));
app.use(prettyJSON());
app.notFound((c) => c.json({ message: "Not Found", ok: false }, 404));

const api = new Hono();
api.use(cors());
api.use(logger());

api.route("/", projectRoute);
api.route("/", teamRoute);
api.route("/", payrollRoute);
api.route("/", statisticRoute);

app.route("/api/v1", api);

const port = 3020;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
