-- CreateEnum
CREATE TYPE "PredictionCategory" AS ENUM ('GROUPS', 'R32', 'R16', 'QF', 'FINAL_POSITIONS');

-- CreateTable
CREATE TABLE "PredictionLock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "PredictionCategory" NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PredictionLock_userId_category_key" ON "PredictionLock"("userId", "category");

-- AddForeignKey
ALTER TABLE "PredictionLock" ADD CONSTRAINT "PredictionLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
