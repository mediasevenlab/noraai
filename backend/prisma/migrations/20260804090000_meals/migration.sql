-- CreateEnum
CREATE TYPE "meal_source" AS ENUM ('telegram', 'manual');

-- CreateTable
CREATE TABLE "meals" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "ingredients" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "carbs" INTEGER NOT NULL,
    "portion_items" JSONB NOT NULL DEFAULT '[]',
    "client_comment" TEXT NOT NULL DEFAULT '',
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "versions" JSONB NOT NULL DEFAULT '[]',
    "active_version_id" UUID,
    "source" "meal_source" NOT NULL DEFAULT 'telegram',
    "telegram_update_id" TEXT,
    "image_key" TEXT,
    "image_mime" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meals_telegram_update_id_key" ON "meals"("telegram_update_id");

-- CreateIndex
CREATE INDEX "meals_user_id_recorded_at_idx" ON "meals"("user_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
