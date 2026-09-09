ALTER TABLE "push_deliveries" DROP CONSTRAINT "push_deliveries_subscription_id_push_subscriptions_id_fk";
--> statement-breakpoint
ALTER TABLE "push_deliveries" DROP CONSTRAINT "push_deliveries_notification_id_subscription_id_pk";--> statement-breakpoint
ALTER TABLE "push_deliveries" ALTER COLUMN "subscription_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "response_status" integer;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD COLUMN "failure_reason" text;--> statement-breakpoint
UPDATE "push_deliveries"
SET
  "status" = CASE
    WHEN "delivered_at" IS NOT NULL THEN 'delivered'
    WHEN "error" = 'suppressed_by_preferences' THEN 'suppressed'
    WHEN "error" IS NOT NULL THEN 'failed'
    ELSE 'retrying'
  END,
  "attempt_count" = 1,
  "next_attempt_at" = CASE
    WHEN "delivered_at" IS NULL AND "error" IS NULL THEN NOW()
    ELSE NULL
  END,
  "failed_at" = CASE
    WHEN "delivered_at" IS NULL AND "error" IS NOT NULL AND "error" <> 'suppressed_by_preferences' THEN NOW()
    ELSE NULL
  END,
  "failure_reason" = "error";--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "push_deliveries_notification_subscription_unique" ON "push_deliveries" USING btree ("notification_id","subscription_id");--> statement-breakpoint
CREATE INDEX "push_deliveries_retry_index" ON "push_deliveries" USING btree ("status","next_attempt_at");
