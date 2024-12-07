import { z } from "zod";

export const createProjectJsonSchema = z.object({
  name: z.string(),
  imageRatio: z.string(),
  imageCount: z.number(),
  teamId: z.string(),
  clientName: z.string(),

  // Offering
  fee: z.number(),
  note: z.string().nullable().optional(),
  deadline: z.string(),
});
