import {
  Prisma,
  PrismaClient,
} from "../../../../prisma/generated/client/index.js";

const prisma = new PrismaClient({
  transactionOptions: {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || "2000"),
    timeout: parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || "5000"),
  },
});

export default prisma;
