UPDATE "users"
SET "role" = 'mentor'
WHERE "email" = 'mentor@nora.com';

INSERT INTO "mentor_assignments" ("mentor_id", "mentee_id")
SELECT mentor."id", mentee."id"
FROM "users" AS mentor
CROSS JOIN "users" AS mentee
WHERE mentor."email" = 'mentor@nora.com'
  AND mentor."role" = 'mentor'
  AND mentee."email" = 'user@nora.com'
  AND mentee."role" = 'user'
ON CONFLICT ("mentee_id")
DO UPDATE SET "mentor_id" = EXCLUDED."mentor_id";
