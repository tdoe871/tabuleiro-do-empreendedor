-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('PARTICIPANT', 'MENTOR', 'STAFF');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "teamId" TEXT,
    "teamName" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_eventId_id_idx" ON "ActivityLog"("eventId", "id");

-- CreateIndex
CREATE INDEX "ActivityLog_teamId_id_idx" ON "ActivityLog"("teamId", "id");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same rule as every table: RLS on, no policies (only Prisma reaches them).
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
