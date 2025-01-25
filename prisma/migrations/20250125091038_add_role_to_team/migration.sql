-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('ADMIN', 'ARTIST', 'CODER');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "role" "TeamRole" NOT NULL DEFAULT 'ARTIST';
