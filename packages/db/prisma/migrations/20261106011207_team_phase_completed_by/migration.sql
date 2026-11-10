-- AlterTable
ALTER TABLE "TeamPhase" DROP COLUMN "keyActivated",
ADD COLUMN     "completedById" TEXT;

-- CreateIndex
CREATE INDEX "TeamPhase_completedById_idx" ON "TeamPhase"("completedById");

-- AddForeignKey
ALTER TABLE "TeamPhase" ADD CONSTRAINT "TeamPhase_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
