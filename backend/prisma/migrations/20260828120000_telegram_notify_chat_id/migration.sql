-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telegram_chat_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_chat_id_key" ON "users"("telegram_chat_id");
