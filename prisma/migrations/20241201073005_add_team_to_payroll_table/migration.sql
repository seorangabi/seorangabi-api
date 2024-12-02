/*
  Warnings:

  - Added the required column `teamId` to the `Payroll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "teamId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Payroll_teamId_idx" ON "Payroll"("teamId");

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
