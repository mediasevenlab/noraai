-- CreateTable
CREATE TABLE "user_plan_libraries" (
    "user_id" UUID NOT NULL,
    "authored_plans" JSONB NOT NULL DEFAULT '[]',
    "saved_plan_ids" JSONB NOT NULL DEFAULT '[]',
    "selected_plan_ids" JSONB NOT NULL DEFAULT '[]',
    "plan_starts" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_plan_libraries_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_plan_libraries" ADD CONSTRAINT "user_plan_libraries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
