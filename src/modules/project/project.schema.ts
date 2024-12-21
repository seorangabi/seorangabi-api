import { z } from "zod";
import { File } from "node:buffer";

const withTeam = z.enum(["team"]);
const sortTeam = z.enum(["created_at:asc", "created_at:desc"]);

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
  sort: z.union([sortTeam, z.array(sortTeam)]).optional(),
});

export const postProjectFormDataSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object") return value;

    const temp: Record<string, unknown> = {};

    Object.entries(value).forEach(([key, value]) => {
      const regex = /tasks\[(\d+)\]\[(\w+)\]/;
      const match = key.match(regex);

      if (match) {
        const number = Number(match[1]);
        const field = match[2];

        temp["tasks"] = temp["tasks"] || [];
        // @ts-expect-error This is fine
        temp["tasks"][number] = temp["tasks"][number] || {};
        // @ts-expect-error This is fine
        temp["tasks"][number][field] = value;
      } else {
        temp[key] = value;
      }
    });

    return temp;
  },
  z.object({
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
        file: z.instanceof(File),
      })
    ),
  })
);

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
