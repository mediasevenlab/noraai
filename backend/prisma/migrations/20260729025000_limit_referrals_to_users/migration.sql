-- Referral attribution belongs only to ordinary users. Mentor links are retained
-- for mentor assignment during registration, but do not create referral records.
UPDATE "users" AS referred
SET "referred_by_user_id" = NULL
FROM "users" AS referrer
WHERE referred."referred_by_user_id" = referrer."id"
  AND referrer."role" <> 'user';
