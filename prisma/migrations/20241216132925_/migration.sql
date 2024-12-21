/*
  Warnings:

  - You are about to drop the column `deadline` on the `Offering` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `Offering` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Offering` table. All the data in the column will be lost.
  - You are about to drop the column `imageCount` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Offering" DROP COLUMN "deadline",
DROP COLUMN "fee",
DROP COLUMN "note";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "imageCount",
DROP COLUMN "note";

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_id_idx" ON "Task"("id");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
