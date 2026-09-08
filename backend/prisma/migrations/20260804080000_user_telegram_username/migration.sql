-- AlterTable
ALTER TABLE "users" ADD COLUMN "telegram_username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_username_key" ON "users"("telegram_username");
