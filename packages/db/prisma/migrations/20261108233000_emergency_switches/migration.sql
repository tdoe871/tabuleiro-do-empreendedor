-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "joinsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "submissionsEnabled" BOOLEAN NOT NULL DEFAULT true;
