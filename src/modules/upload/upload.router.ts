import { Hono } from "hono";
import path from "node:path";
import { useJWT } from "../core/libs/jwt.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { File } from "node:buffer";
import { writeFile } from "node:fs/promises";

const uploadRouter = new Hono().basePath("/upload");

uploadRouter.post(
	"/",
	useJWT(),
	zValidator(
		"form",
		z.object({ file: z.instanceof(File), forFeature: z.enum(["task"]) }),
	),
	async (c) => {
		const form = c.req.valid("form");
		const blob = form.file;

		// convert blob to file
		const file = new File([blob], blob.name, {
			type: blob.type,
		});

		const extension = file.name.split(".").pop();

		const generateName = () => {
			switch (form.forFeature) {
				case "task":
					return `task_${Date.now()}.${extension}`;
				default:
					return `file_${Date.now()}.${extension}`;
			}
		};

		const filePath = path.join("uploads", generateName());
		const fileFullPath = path.join(process.cwd(), filePath);

		await writeFile(fileFullPath, file.stream());

		return c.json({
			doc: {
				path: filePath,
				url: Array(process.env.STORAGE_URL ?? "", filePath).join("/"),
			},
		});
	},
);

export default uploadRouter;
