/*
  Warnings:

  - You are about to drop the column `confirmationDuration` on the `Offering` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Offering" DROP COLUMN "confirmationDuration";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "confirmationDuration" INTEGER NOT NULL DEFAULT 0;
