import { z } from "zod";

const withTeam = z.enum(["team"]);
const sort = z.enum(["created_at:asc", "created_at:desc"]);

export const getListProjectJsonSchema = z.object({
  id_eq: z.string().optional(),
  team_id_eq: z.string().optional(),
  status_eq: z
    .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE", "CANCELLED"])
    .optional(),
  is_paid_eq: z.enum(["true", "false"]).optional(),
  skip: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  with: z.union([withTeam, z.array(withTeam)]).optional(),
  sort: z.union([sort, z.array(sort)]).optional(),
});

export const postProjectJsonSchema = z.object({
  name: z.string(),
  imageRatio: z.string(),
  teamId: z.string(),
  clientName: z.string(),
  deadline: z.string(),
  tasks: z.array(
    z.object({
      fee: z.coerce.number(),
      note: z.string(),
      imageCount: z.coerce.number(),
      attachmentUrl: z.string(),
    })
  ),
  confirmationDuration: z.number(),
});

export const patchProjectJsonSchema = z.object({
  name: z.string().optional(),
  imageRatio: z.string().optional(),
  status: z
    .enum(["OFFERING", "IN_PROGRESS", "REVISION", "DONE", "CANCELLED"])
    .optional(),
  teamId: z.string().optional(),
  imageCount: z.number().optional(),
  clientName: z.string().optional(),

  // Offering
  fee: z.number().optional(),
  note: z.string().nullable().optional(),
  deadline: z.string().optional(),
});
