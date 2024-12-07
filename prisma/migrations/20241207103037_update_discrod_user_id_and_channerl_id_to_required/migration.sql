/*
  Warnings:

  - Made the column `clientName` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordUserId` on table `Team` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordChannelId` on table `Team` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "clientName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "discordUserId" SET NOT NULL,
ALTER COLUMN "discordChannelId" SET NOT NULL;
