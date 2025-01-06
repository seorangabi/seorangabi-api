import { Redis } from "ioredis";

export const redisHost = process.env.REDIS_HOST || "127.0.0.1";
export const redisPort = process.env.REDIS_PORT
  ? parseInt(process.env.REDIS_PORT)
  : 6379;

const redisInstance = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

export default redisInstance;
