-- CreateEnum
CREATE TYPE "meeting_status" AS ENUM ('queued', 'running', 'ready', 'failed');

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "file_name" VARCHAR(180) NOT NULL,
    "status" "meeting_status" NOT NULL DEFAULT 'queued',
    "job_id" TEXT,
    "speakers" INTEGER,
    "transcript" TEXT NOT NULL DEFAULT '',
    "segments" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meetings_user_id_updated_at_idx" ON "meetings"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
