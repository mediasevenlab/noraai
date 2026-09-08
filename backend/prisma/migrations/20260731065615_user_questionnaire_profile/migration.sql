-- CreateTable
CREATE TABLE "user_questionnaire_profiles" (
    "user_id" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_questionnaire_profiles_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_questionnaire_profiles" ADD CONSTRAINT "user_questionnaire_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
