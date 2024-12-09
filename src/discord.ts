import { Client, GatewayIntentBits } from "discord.js";

const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds],
});

export default discordClient;
