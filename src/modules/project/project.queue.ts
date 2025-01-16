import { Queue } from "bullmq";
import redisInstance from "../core/libs/redis.js";
import type { Project } from "../../../prisma/generated/client/index.js";
import { milliseconds } from "date-fns";

const deadlineQueue = new Queue("projectdeadline", {
	connection: redisInstance,
});

const addProjectDeadlineJob = async ({
	project,
}: {
	project: Pick<Project, "id" | "name" | "deadline">;
}) => {
	const deadlineDate = new Date(project.deadline);
	const now = new Date();
	if (now > deadlineDate) return;

	const intervals = [10, 5, 1, 0];

	for (let i = 0; i < intervals.length; i++) {
		const minutes = intervals[i];
		const notificationTime = new Date(
			deadlineDate.getTime() - milliseconds({ minutes }),
		);

		if (notificationTime > now) {
			await deadlineQueue.add(
				`projectdeadline-${project.id}-${minutes}`,
				{
					projectId: project.id,
					minutes,
				},
				{ delay: notificationTime.getTime() - now.getTime() },
			);
		}
	}
};

const removeDeadlineJob = async ({ projectId }: { projectId: string }) => {
	const jobs = await deadlineQueue.getJobs(["waiting", "delayed"]);
	for (const job of jobs) {
		if (job.name.startsWith(`projectdeadline-${projectId}`)) {
			await job.remove();
		}
	}
};

export { addProjectDeadlineJob, removeDeadlineJob, deadlineQueue };
