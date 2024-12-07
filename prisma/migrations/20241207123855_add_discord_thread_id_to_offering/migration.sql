/*
  Warnings:

  - Added the required column `discordThreadId` to the `Offering` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Offering" ADD COLUMN     "discordThreadId" TEXT NOT NULL;
