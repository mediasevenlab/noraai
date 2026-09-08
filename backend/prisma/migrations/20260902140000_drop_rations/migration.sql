-- DropForeignKey
ALTER TABLE "mentor_rations" DROP CONSTRAINT "mentor_rations_mentor_id_fkey";

-- DropForeignKey
ALTER TABLE "ration_assignments" DROP CONSTRAINT "ration_assignments_user_id_fkey";

-- AlterTable
ALTER TABLE "user_saved_items" DROP COLUMN "ration_ids";

-- DropTable
DROP TABLE "mentor_rations";

-- DropTable
DROP TABLE "ration_assignments";
