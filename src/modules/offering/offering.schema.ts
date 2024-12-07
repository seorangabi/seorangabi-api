import { z } from "zod";

export const createOfferingJsonSchema = z.object({
  teamId: z.string(),
  projectId: z.string(),

  // Offering
  fee: z.number(),
  note: z.string().nullable().optional(),
  deadline: z.string(),
});
