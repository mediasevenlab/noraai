-- CreateTable
CREATE TABLE "mentor_mentee_meal_cursors" (
    "mentor_id" UUID NOT NULL,
    "mentee_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_mentee_meal_cursors_pkey" PRIMARY KEY ("mentor_id","mentee_id")
);

-- CreateIndex
CREATE INDEX "mentor_mentee_meal_cursors_mentor_id_idx" ON "mentor_mentee_meal_cursors"("mentor_id");

-- AddForeignKey
ALTER TABLE "mentor_mentee_meal_cursors" ADD CONSTRAINT "mentor_mentee_meal_cursors_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_mentee_meal_cursors" ADD CONSTRAINT "mentor_mentee_meal_cursors_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
