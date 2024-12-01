-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('OFFERING', 'IN_PROGRESS', 'REVISION', 'DONE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'OFFERING',
ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");
