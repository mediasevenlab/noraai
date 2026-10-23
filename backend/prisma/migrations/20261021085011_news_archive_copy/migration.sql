-- AlterTable
ALTER TABLE "news_posts" ADD COLUMN     "archive_chat_id" TEXT,
ADD COLUMN     "archive_message_ids" JSONB NOT NULL DEFAULT '[]';
