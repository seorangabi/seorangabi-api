import redisInstance from "../libs/redis.js";

const config = {
  adminDiscordIdKey: "adminDiscordId",
  getAdminDiscordId: async () => {
    return (
      (await redisInstance.get(config.adminDiscordIdKey)) ||
      process.env.DEFAULT_ADMIN_DISCORD_USER_ID
    );
  },
  setAdminDiscordId: (discordId: string) => {
    return redisInstance.set(config.adminDiscordIdKey, discordId);
  },
};

export default config;
