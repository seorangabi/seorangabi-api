import { jwt } from "hono/jwt";

export const JWT_SECRET = process.env.JWT_SECRET!;

export const useJWT = () =>
  jwt({
    secret: JWT_SECRET,
  });
