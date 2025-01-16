import { z } from "zod";

const withOffering = z.enum(["team"]);
const sortOffering = z.enum(["created_at:asc", "created_at:desc"]);

export const getListOfferingQuerySchema = z.object({
	project_id_eq: z.string().optional(),
	sort: z.union([sortOffering, z.array(sortOffering)]).optional(),
	with: z.union([withOffering, z.array(withOffering)]).optional(),
});

export const createOfferingJsonSchema = z.object({
	teamId: z.string(),
	projectId: z.string(),

	// Offering
	fee: z.number(),
	note: z.string().nullable().optional(),
	deadline: z.string(),
	confirmationDuration: z.coerce.number(),
});
