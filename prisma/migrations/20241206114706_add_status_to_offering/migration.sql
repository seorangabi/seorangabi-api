-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('OFFERING', 'REJECTED', 'ACCEPTED');

-- AlterTable
ALTER TABLE "Offering" ADD COLUMN     "status" "OfferingStatus" NOT NULL DEFAULT 'OFFERING';
