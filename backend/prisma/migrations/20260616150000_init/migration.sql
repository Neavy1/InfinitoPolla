-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('GROUPS', 'R32', 'R16', 'QF', 'SF', 'THIRD_PLACE', 'FINAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flagUrl" TEXT,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "homeTeamId" TEXT,
    "awayTeamId" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "bracketSlot" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "groupName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "firstTeamId" TEXT NOT NULL,
    "secondTeamId" TEXT NOT NULL,

    CONSTRAINT "GroupPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "ThirdPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "slot" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "BracketPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "championId" TEXT NOT NULL,
    "runnerUpId" TEXT NOT NULL,
    "thirdId" TEXT NOT NULL,
    "fourthId" TEXT NOT NULL,

    CONSTRAINT "FinalPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupStanding" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDiff" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "fairPlayScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroupStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThirdsTable" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "rank" INTEGER,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "points" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDiff" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "fairPlayScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ThirdsTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketTemplate" (
    "id" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "slot" TEXT NOT NULL,
    "homeSource" TEXT NOT NULL,
    "awaySource" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "BracketTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "groupPoints" INTEGER NOT NULL DEFAULT 0,
    "thirdPoints" INTEGER NOT NULL DEFAULT 0,
    "r32Points" INTEGER NOT NULL DEFAULT 0,
    "r16Points" INTEGER NOT NULL DEFAULT 0,
    "qfPoints" INTEGER NOT NULL DEFAULT 0,
    "finalPosPoints" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE INDEX "Match_phase_kickoffAt_idx" ON "Match"("phase", "kickoffAt");

-- CreateIndex
CREATE INDEX "Match_bracketSlot_idx" ON "Match"("bracketSlot");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPrediction_userId_groupId_key" ON "GroupPrediction"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPrediction_userId_groupId_key" ON "ThirdPrediction"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketPrediction_userId_phase_slot_key" ON "BracketPrediction"("userId", "phase", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "FinalPrediction_userId_key" ON "FinalPrediction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupStanding_groupId_teamId_key" ON "GroupStanding"("groupId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupStanding_groupId_position_key" ON "GroupStanding"("groupId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdsTable_teamId_key" ON "ThirdsTable"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketTemplate_phase_slot_key" ON "BracketTemplate"("phase", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringConfig_key_key" ON "ScoringConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Score_userId_key" ON "Score"("userId");

-- CreateIndex
CREATE INDEX "PredictionAudit_userId_createdAt_idx" ON "PredictionAudit"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPrediction" ADD CONSTRAINT "GroupPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPrediction" ADD CONSTRAINT "GroupPrediction_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPrediction" ADD CONSTRAINT "GroupPrediction_firstTeamId_fkey" FOREIGN KEY ("firstTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPrediction" ADD CONSTRAINT "GroupPrediction_secondTeamId_fkey" FOREIGN KEY ("secondTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdPrediction" ADD CONSTRAINT "ThirdPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdPrediction" ADD CONSTRAINT "ThirdPrediction_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdPrediction" ADD CONSTRAINT "ThirdPrediction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPrediction" ADD CONSTRAINT "BracketPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketPrediction" ADD CONSTRAINT "BracketPrediction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPrediction" ADD CONSTRAINT "FinalPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPrediction" ADD CONSTRAINT "FinalPrediction_championId_fkey" FOREIGN KEY ("championId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPrediction" ADD CONSTRAINT "FinalPrediction_runnerUpId_fkey" FOREIGN KEY ("runnerUpId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPrediction" ADD CONSTRAINT "FinalPrediction_thirdId_fkey" FOREIGN KEY ("thirdId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalPrediction" ADD CONSTRAINT "FinalPrediction_fourthId_fkey" FOREIGN KEY ("fourthId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStanding" ADD CONSTRAINT "GroupStanding_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStanding" ADD CONSTRAINT "GroupStanding_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThirdsTable" ADD CONSTRAINT "ThirdsTable_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAudit" ADD CONSTRAINT "PredictionAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
