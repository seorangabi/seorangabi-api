-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PAID');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payrollId" TEXT;

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payroll_id_idx" ON "Payroll"("id");

-- CreateIndex
CREATE INDEX "Project_payrollId_idx" ON "Project"("payrollId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
