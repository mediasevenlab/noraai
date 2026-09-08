-- CreateTable
CREATE TABLE "user_saved_items" (
    "user_id" UUID NOT NULL,
    "meal_ids" JSONB NOT NULL DEFAULT '[]',
    "ration_ids" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_saved_items_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_saved_items" ADD CONSTRAINT "user_saved_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
