/*
  Warnings:

  - You are about to drop the column `stage` on the `Offering` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Offering" DROP COLUMN "stage";

-- DropEnum
DROP TYPE "Stage";
