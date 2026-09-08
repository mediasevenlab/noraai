-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegram_phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_phone_key" ON "users"("telegram_phone");
