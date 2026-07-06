-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- Add new enum column alongside the old string column
ALTER TABLE "WorkspaceMember" ADD COLUMN "role_new" "WorkspaceRole";

-- Backfill: 'owner' -> OWNER, everything else ('member') -> EDITOR
-- (EDITOR preserves the full view+edit access plain members already had)
UPDATE "WorkspaceMember" SET "role_new" = CASE
  WHEN "role" = 'owner' THEN 'OWNER'::"WorkspaceRole"
  ELSE 'EDITOR'::"WorkspaceRole"
END;

ALTER TABLE "WorkspaceMember" ALTER COLUMN "role_new" SET NOT NULL;
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role_new" SET DEFAULT 'EDITOR';

ALTER TABLE "WorkspaceMember" DROP COLUMN "role";
ALTER TABLE "WorkspaceMember" RENAME COLUMN "role_new" TO "role";
