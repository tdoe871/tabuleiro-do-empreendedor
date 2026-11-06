-- CreateEnum
CREATE TYPE "SubmissionFileStatus" AS ENUM ('PENDING', 'READY');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "links" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "SubmissionFileStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionFile_path_key" ON "SubmissionFile"("path");

-- CreateIndex
CREATE INDEX "SubmissionFile_teamId_idx" ON "SubmissionFile"("teamId");

-- CreateIndex
CREATE INDEX "SubmissionFile_uploadedById_idx" ON "SubmissionFile"("uploadedById");

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS with no policies, like every other table (see 20261105145444_init).
ALTER TABLE "SubmissionFile" ENABLE ROW LEVEL SECURITY;
