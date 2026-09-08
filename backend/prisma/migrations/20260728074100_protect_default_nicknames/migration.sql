-- Reserve the built-in nicknames before assigning them to their default accounts.
UPDATE "users"
SET "nickname" = NULL
WHERE "nickname" IN ('admin', 'mentor', 'user')
  AND "email" NOT IN ('admin@nora.com', 'mentor@nora.com', 'user@nora.com');

UPDATE "users"
SET "nickname" = CASE "email"
  WHEN 'admin@nora.com' THEN 'admin'
  WHEN 'mentor@nora.com' THEN 'mentor'
  WHEN 'user@nora.com' THEN 'user'
END
WHERE "email" IN ('admin@nora.com', 'mentor@nora.com', 'user@nora.com');
