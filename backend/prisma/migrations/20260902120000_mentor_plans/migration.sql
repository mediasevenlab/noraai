-- CreateTable
CREATE TABLE "mentor_plans" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "mentor_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'План наставника',
    "image" TEXT NOT NULL DEFAULT '',
    "days" INTEGER NOT NULL DEFAULT 7,
    "meals_per_day" INTEGER NOT NULL,
    "meals" JSONB NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein" INTEGER NOT NULL,
    "fat" INTEGER NOT NULL,
    "carbs" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_assignments" (
    "user_id" UUID NOT NULL,
    "plan_ids" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "plan_assignments_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "mentor_plans_mentor_id_updated_at_idx" ON "mentor_plans"("mentor_id", "updated_at");

-- AddForeignKey
ALTER TABLE "mentor_plans" ADD CONSTRAINT "mentor_plans_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_assignments" ADD CONSTRAINT "plan_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
