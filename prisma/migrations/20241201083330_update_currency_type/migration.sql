/*
  Warnings:

  - You are about to alter the column `fee` on the `Offering` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `amount` on the `Payroll` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Offering" ALTER COLUMN "fee" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Payroll" ALTER COLUMN "amount" SET DATA TYPE INTEGER;
