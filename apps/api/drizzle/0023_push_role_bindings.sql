CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_user_role_unique" ON "push_subscriptions" USING btree ("endpoint","user_id","role");--> statement-breakpoint
DROP INDEX IF EXISTS "push_subscriptions_endpoint_unique";
