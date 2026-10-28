-- AlterTable
ALTER TABLE "knowledge_bases" ADD COLUMN     "builtin" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "knowledge_bases_builtin_idx" ON "knowledge_bases"("builtin");
