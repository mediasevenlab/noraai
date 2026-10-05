-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "generation_usage" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "generation_usage" JSONB NOT NULL DEFAULT '{}';
