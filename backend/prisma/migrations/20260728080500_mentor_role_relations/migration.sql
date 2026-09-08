-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'mentor';

-- CreateTable
CREATE TABLE "mentor_assignments" (
    "mentee_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_assignments_pkey" PRIMARY KEY ("mentee_id")
);

-- CreateIndex
CREATE INDEX "mentor_assignments_mentor_id_created_at_idx" ON "mentor_assignments"("mentor_id", "created_at");

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
