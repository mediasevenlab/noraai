/*
  Warnings:

  - A unique constraint covering the columns `[user_id,client_key]` on the table `meals` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "client_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "meals_user_id_client_key_key" ON "meals"("user_id", "client_key");
