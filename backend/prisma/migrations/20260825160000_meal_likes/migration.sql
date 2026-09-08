-- CreateTable
CREATE TABLE "meal_likes" (
    "meal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_likes_pkey" PRIMARY KEY ("meal_id","user_id")
);

-- CreateIndex
CREATE INDEX "meal_likes_meal_id_idx" ON "meal_likes"("meal_id");

-- AddForeignKey
ALTER TABLE "meal_likes" ADD CONSTRAINT "meal_likes_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_likes" ADD CONSTRAINT "meal_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
