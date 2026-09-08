-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "shared_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "meals_shared_at_idx" ON "meals"("shared_at");
