-- DropIndex
DROP INDEX "Event_code_idx";

-- DropIndex
DROP INDEX "Team_joinCode_idx";

-- CreateIndex
CREATE INDEX "Alert_eventId_idx" ON "Alert"("eventId");

-- CreateIndex
CREATE INDEX "Event_hostId_idx" ON "Event"("hostId");

-- CreateIndex
CREATE INDEX "TeamPhase_phaseId_idx" ON "TeamPhase"("phaseId");
