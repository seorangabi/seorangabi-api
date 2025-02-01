import { type Prisma, PrismaClient } from "../../generated/client/index.js";

const prisma = new PrismaClient();

async function main() {
	await prisma.$transaction(async (tx) => {
		const projects = await tx.project.findMany({
			include: {
				tasks: true,
			},
		});

		const attachments: Prisma.TaskAttachmentCreateManyInput[] = [];

		for (const project of projects) {
			for (const task of project.tasks) {
				if (task.attachmentUrl) {
					attachments.push({
						taskId: task.id,
						url: task.attachmentUrl,
					});
				}
			}
		}

		await tx.taskAttachment.createMany({
			data: attachments,
		});
	});
}

main()
	.catch(async (e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => await prisma.$disconnect());
