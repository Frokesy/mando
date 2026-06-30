ALTER TABLE "sales_agent_profiles" ADD COLUMN "upline_sales_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "platform_commission_bps" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "service_charge_amount" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_agent_profiles" ADD CONSTRAINT "sales_agent_profiles_upline_sales_agent_id_users_id_fk" FOREIGN KEY ("upline_sales_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
