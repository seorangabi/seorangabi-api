-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('OFFERING', 'REJECTED', 'IN_PROGRESS', 'REVISION', 'DONE');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "note" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "imageRatio" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankNumber" TEXT,
    "bankAccountHolder" TEXT,
    "bankProvider" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offering" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "imageRatio" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,

    CONSTRAINT "Offering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_id_idx" ON "Project"("id");

-- CreateIndex
CREATE INDEX "Team_id_idx" ON "Team"("id");

-- CreateIndex
CREATE INDEX "Offering_id_idx" ON "Offering"("id");

-- CreateIndex
CREATE INDEX "Offering_projectId_idx" ON "Offering"("projectId");

-- CreateIndex
CREATE INDEX "Offering_teamId_idx" ON "Offering"("teamId");

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
