import { z } from "zod";
import { ProjectStatus } from "../../../prisma/generated/client/index.js";

const withProject = z.enum(["team", "payroll"]);
const sort = z.enum(["created_at:asc", "created_at:desc"]);

export const getListProjectJsonSchema = z.object({
	id_eq: z.string().optional(),
	team_id_eq: z.string().optional(),
	status_eq: z.nativeEnum(ProjectStatus).optional(),
	is_paid_eq: z.enum(["true", "false"]).optional(),
	skip: z.coerce.number().optional(),
	limit: z.coerce.number().optional(),
	with: z.union([withProject, z.array(withProject)]).optional(),
	sort: z.union([sort, z.array(sort)]).optional(),
	created_at_gte: z.string().optional(),
	create_at_lte: z.string().optional(),
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
			attachments: z.array(z.string()),
		}),
	),
	confirmationDuration: z.number(),
	note: z.string().nullable(),
	autoNumberTask: z.boolean().optional(),
	isPublished: z.boolean().optional().default(true),
	attachments: z.array(z.string()).default([]),
});

export const patchProjectJsonSchema = z.object({
	name: z.string().optional(),
	imageRatio: z.string().optional(),
	status: z.nativeEnum(ProjectStatus).optional(),
	teamId: z.string().optional(),
	imageCount: z.number().optional(),
	clientName: z.string().optional(),

	// Offering
	fee: z.number().optional(),
	note: z.string().nullable().optional(),
	deadline: z.string().optional(),

	autoNumberTask: z.boolean().optional(),
});
