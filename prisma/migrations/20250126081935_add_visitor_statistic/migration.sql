-- CreateTable
CREATE TABLE "StatisticVisitor" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "StatisticVisitor_pkey" PRIMARY KEY ("id")
);
