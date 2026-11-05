-- CreateEnum
CREATE TYPE "BoardKey" AS ENUM ('PROBLEMA', 'SOLUCAO', 'PARCERIAS', 'OPORTUNIDADES');

-- DropIndex
DROP INDEX "Phase_eventId_order_key";

-- AlterTable
ALTER TABLE "Phase" ADD COLUMN     "key" "BoardKey" NOT NULL,
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TeamPhase" ADD COLUMN     "content" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Phase_eventId_key_order_key" ON "Phase"("eventId", "key", "order");
