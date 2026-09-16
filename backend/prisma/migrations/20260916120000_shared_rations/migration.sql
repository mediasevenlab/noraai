-- CreateTable
CREATE TABLE "shared_rations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "author_id" UUID NOT NULL,
    "source_plan_id" VARCHAR(80) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goal" TEXT,
    "cover_image" TEXT NOT NULL DEFAULT '',
    "days" INTEGER NOT NULL DEFAULT 1,
    "meals" JSONB NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "carbs" INTEGER NOT NULL,
    "shared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_rations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_ration_likes" (
    "ration_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_ration_likes_pkey" PRIMARY KEY ("ration_id","user_id")
);

-- CreateIndex
CREATE INDEX "shared_rations_shared_at_idx" ON "shared_rations"("shared_at");

-- CreateIndex
CREATE UNIQUE INDEX "shared_rations_author_id_source_plan_id_key" ON "shared_rations"("author_id", "source_plan_id");

-- CreateIndex
CREATE INDEX "shared_ration_likes_ration_id_idx" ON "shared_ration_likes"("ration_id");

-- AddForeignKey
ALTER TABLE "shared_rations" ADD CONSTRAINT "shared_rations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_ration_likes" ADD CONSTRAINT "shared_ration_likes_ration_id_fkey" FOREIGN KEY ("ration_id") REFERENCES "shared_rations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_ration_likes" ADD CONSTRAINT "shared_ration_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
