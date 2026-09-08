-- AlterTable
ALTER TABLE "users" ADD COLUMN     "public_id" SERIAL NOT NULL,
ADD COLUMN     "referred_by_user_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");

-- CreateIndex
CREATE INDEX "users_referred_by_user_id_idx" ON "users"("referred_by_user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
