import { Hono } from "hono";
import type { Client } from "discord.js";
import type { JwtVariables } from "hono/jwt";

declare module "hono" {
  interface ContextVariableMap {
    discordClient: Client;
    jwt: JwtVariables<{
      role: string;
    }>;
  }
}
