-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('EDITOR', 'VIEWER');

-- AlterTable
ALTER TABLE "DocumentCollaborator" ADD COLUMN     "role" "CollaboratorRole" NOT NULL DEFAULT 'EDITOR';
