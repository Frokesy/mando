ALTER TABLE "auth_sessions" ADD COLUMN "active_role" "user_role";--> statement-breakpoint
UPDATE "auth_sessions" AS "session"
SET
	"active_role" = (
		SELECT "role"
		FROM "user_roles"
		WHERE "user_id" = "session"."user_id"
		ORDER BY CASE "role" WHEN 'customer' THEN 0 ELSE 1 END, "role"
		LIMIT 1
	),
	"revoked_at" = now();--> statement-breakpoint
DELETE FROM "auth_sessions" WHERE "active_role" IS NULL;--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "active_role" SET NOT NULL;
