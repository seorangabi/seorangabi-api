import { Hono } from "hono";
import projectRoute from "./modules/project/project.router.js";
import { cors } from "hono/cors";
import teamRoute from "./modules/team/team.router.js";
import { logger } from "hono/logger";
import payrollRoute from "./modules/payroll/payroll.router.js";
import statisticRoute from "./modules/statistic/statistic.js";
import offeringRoute from "./modules/offering/offering.router.js";
import authRoute from "./modules/auth/auth.router.js";
import taskRouter from "./modules/task/task.router.js";
import uploadRouter from "./modules/upload/upload.router.js";

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

api.route("/", authRoute);
api.route("/", projectRoute);
api.route("/", teamRoute);
api.route("/", payrollRoute);
api.route("/", statisticRoute);
api.route("/", offeringRoute);
api.route("/", taskRouter);
api.route("/", uploadRouter);

export default api;
