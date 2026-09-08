-- CreateTable
CREATE TABLE "mentor_mentee_meal_views" (
    "mentor_id" UUID NOT NULL,
    "mentee_id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_mentee_meal_views_pkey" PRIMARY KEY ("mentor_id","meal_id")
);

-- CreateIndex
CREATE INDEX "mentor_mentee_meal_views_mentor_id_mentee_id_idx" ON "mentor_mentee_meal_views"("mentor_id", "mentee_id");

-- AddForeignKey
ALTER TABLE "mentor_mentee_meal_views" ADD CONSTRAINT "mentor_mentee_meal_views_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_mentee_meal_views" ADD CONSTRAINT "mentor_mentee_meal_views_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_mentee_meal_views" ADD CONSTRAINT "mentor_mentee_meal_views_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
