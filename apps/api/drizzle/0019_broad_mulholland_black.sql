ALTER TABLE "notifications" ADD COLUMN "target_role" "user_role";--> statement-breakpoint
UPDATE "notifications"
SET "target_role" = CASE
  WHEN "type" LIKE 'admin\_%' ESCAPE '\' THEN 'admin'::"user_role"
  WHEN "type" LIKE 'sales\_agent\_%' ESCAPE '\'
    OR "type" LIKE 'agent\_%' ESCAPE '\'
    OR "type" LIKE 'commission\_%' ESCAPE '\'
    THEN 'sales_agent'::"user_role"
  WHEN "type" LIKE 'rider\_%' ESCAPE '\' OR "type" = 'pickup_ready'
    THEN 'rider'::"user_role"
  WHEN "type" = 'restaurant_new_order' THEN 'restaurant'::"user_role"
  WHEN "type" = 'push_enabled' AND ("data"->>'url') LIKE '/sales-agent/%'
    THEN 'sales_agent'::"user_role"
  WHEN "type" = 'push_enabled' AND ("data"->>'url') LIKE '/restaurant/%'
    THEN 'restaurant'::"user_role"
  WHEN "type" = 'push_enabled' AND ("data"->>'url') LIKE '/rider/%'
    THEN 'rider'::"user_role"
  WHEN "type" = 'push_enabled' AND ("data"->>'url') LIKE '/admin/%'
    THEN 'admin'::"user_role"
  ELSE 'customer'::"user_role"
END;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "target_role" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "notifications_user_role_index" ON "notifications" USING btree ("user_id","target_role");
