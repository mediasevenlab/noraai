-- CreateTable
CREATE TABLE "news_posts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "channel_handle" TEXT NOT NULL,
    "telegram_post_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL,
    "media" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_posts_user_id_posted_at_idx" ON "news_posts"("user_id", "posted_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_posts_user_channel_post_key" ON "news_posts"("user_id", "channel_handle", "telegram_post_id");

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
