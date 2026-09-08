-- CreateTable
CREATE TABLE "mentor_rations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "mentor_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Рацион наставника',
    "image" TEXT NOT NULL DEFAULT '',
    "days" INTEGER NOT NULL DEFAULT 1,
    "meals_per_day" INTEGER NOT NULL,
    "meals" JSONB NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "carbs" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_rations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_challenges" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "claimed_username" TEXT,
    "claimed_phone" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_rations_mentor_id_updated_at_idx" ON "mentor_rations"("mentor_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_challenges_code_hash_key" ON "telegram_link_challenges"("code_hash");

-- CreateIndex
CREATE INDEX "telegram_link_challenges_user_id_created_at_idx" ON "telegram_link_challenges"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "mentor_rations" ADD CONSTRAINT "mentor_rations_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_link_challenges" ADD CONSTRAINT "telegram_link_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
