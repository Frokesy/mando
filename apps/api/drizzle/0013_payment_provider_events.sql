CREATE TABLE "payment_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"source" text NOT NULL,
	"payment_id" uuid,
	"order_id" uuid,
	"merchant_reference" text,
	"transaction_reference" text,
	"reported_status" text,
	"verified_status" text,
	"outcome" text NOT NULL,
	"request_id" text,
	"provider_correlation_id" text,
	"http_status" integer,
	"payload" jsonb,
	"verification_response" jsonb,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payment_provider_events" ADD CONSTRAINT "payment_provider_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "payment_provider_events_payment_id_index" ON "payment_provider_events" USING btree ("payment_id");
--> statement-breakpoint
CREATE INDEX "payment_provider_events_order_id_index" ON "payment_provider_events" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "payment_provider_events_transaction_reference_index" ON "payment_provider_events" USING btree ("transaction_reference");
--> statement-breakpoint
CREATE INDEX "payment_provider_events_received_at_index" ON "payment_provider_events" USING btree ("received_at");
