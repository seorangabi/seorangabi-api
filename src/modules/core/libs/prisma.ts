import {
	Prisma,
	PrismaClient,
} from "../../../../prisma/generated/client/index.js";

const prisma = new PrismaClient({
	transactionOptions: {
		isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		maxWait: Number.parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || "2000"),
		timeout: Number.parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || "5000"),
	},
});

export const prismaAI = new PrismaClient({
	transactionOptions: {
		isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		maxWait: Number.parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || "2000"),
		timeout: Number.parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || "5000"),
	},
	datasources: {
		db: {
			url: process.env.AI_DATABASE_URL,
		},
	},
});

export default prisma;
