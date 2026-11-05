-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('SCHOOL', 'CUSTOM');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "mode" "EventMode" NOT NULL DEFAULT 'SCHOOL',
ADD COLUMN     "scenario" TEXT;
