-- CreateTable
CREATE TABLE "PhaseCompletion" (
    "phase" "Phase" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rankingUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseCompletion_pkey" PRIMARY KEY ("phase")
);
