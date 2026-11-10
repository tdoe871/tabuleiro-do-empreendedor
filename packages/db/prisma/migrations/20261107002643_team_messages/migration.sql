-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEAM', 'PRIVATE', 'NUDGE');

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "text" TEXT,
    "senderId" TEXT,
    "recipientId" TEXT,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_teamId_id_idx" ON "Message"("teamId", "id");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_senderId_clientId_key" ON "Message"("senderId", "clientId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same rule as every table: RLS on, no policies (only Prisma reaches it).
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
