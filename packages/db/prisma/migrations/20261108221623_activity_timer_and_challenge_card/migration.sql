-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "activityEndsAt" TIMESTAMP(3),
ADD COLUMN     "activitySeconds" INTEGER,
ADD COLUMN     "activityVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "challengeKey" "BoardKey",
ADD COLUMN     "challengeSentAt" TIMESTAMP(3),
ADD COLUMN     "challengeText" TEXT;
