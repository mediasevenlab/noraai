-- Generated from the declarative Prisma schema. This forward-only migration
-- applies to existing databases; fresh databases use the guarded baseline.
CREATE TABLE "telegram_poller_cursors" (
    "id" TEXT NOT NULL,
    "offset" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "telegram_poller_cursors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ration_assignments" (
    "user_id" UUID NOT NULL,
    "ration_ids" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    CONSTRAINT "ration_assignments_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "ration_assignments"
  ADD CONSTRAINT "ration_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
