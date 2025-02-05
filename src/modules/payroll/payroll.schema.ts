import { z } from "zod";

const sort = z.enum(["created_at:asc", "created_at:desc"]);

export const getListPayrollQuerySchema = z.object({
	id_eq: z.string().optional(),
	with: z
		.union([
			z.enum(["team", "projects"]),
			z.array(z.enum(["team", "projects"])),
		])
		.optional(),
	status_eq: z.enum(["DRAFT", "PAID"]).optional(),
	team_id_eq: z.string().optional(),
	sort: z.union([sort, z.array(sort)]).optional(),
	period_start_gte: z.string().optional(),
	period_end_lte: z.string().optional(),
});

export const postPayrollJsonSchema = z.object({
	periodStart: z.string(),
	periodEnd: z.string(),
	status: z.enum(["DRAFT", "PAID"]),
	teamId: z.string(),
	projectIds: z.array(z.string()),
});

export const deletePayrollParamSchema = z.object({ id: z.string() });

export const patchPayrollJsonSchema = z.object({
	status: z.enum(["PAID"]).optional(),
});
