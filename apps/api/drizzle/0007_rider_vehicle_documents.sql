CREATE TYPE "public"."rider_document_status" AS ENUM('pending', 'uploaded', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."rider_document_type" AS ENUM('government_id', 'vehicle_license', 'proof_of_address');--> statement-breakpoint
CREATE TYPE "public"."rider_vehicle_type" AS ENUM('motorcycle', 'bicycle', 'car');--> statement-breakpoint
ALTER TABLE "rider_profiles" ADD COLUMN "home_address" text;--> statement-breakpoint
ALTER TABLE "rider_profiles" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "rider_vehicles" (
	"rider_id" uuid PRIMARY KEY NOT NULL,
	"vehicle_type" "rider_vehicle_type" NOT NULL,
	"plate_number" text,
	"color" text,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"type" "rider_document_type" NOT NULL,
	"name" text NOT NULL,
	"file_url" text,
	"status" "rider_document_status" DEFAULT 'pending' NOT NULL,
	"uploaded_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_delivery_fee_settings" (
	"vehicle_type" "rider_vehicle_type" PRIMARY KEY NOT NULL,
	"delivery_fee_amount" bigint NOT NULL,
	"mando_cut_percent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rider_delivery_fee_settings_cut_range_check" CHECK ("rider_delivery_fee_settings"."mando_cut_percent" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "rider_vehicles" ADD CONSTRAINT "rider_vehicles_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rider_documents" ADD CONSTRAINT "rider_documents_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rider_vehicles_vehicle_type_index" ON "rider_vehicles" USING btree ("vehicle_type");--> statement-breakpoint
CREATE UNIQUE INDEX "rider_documents_rider_id_type_unique" ON "rider_documents" USING btree ("rider_id","type");--> statement-breakpoint
CREATE INDEX "rider_documents_rider_id_index" ON "rider_documents" USING btree ("rider_id");--> statement-breakpoint
CREATE INDEX "rider_documents_status_index" ON "rider_documents" USING btree ("status");--> statement-breakpoint
INSERT INTO "rider_delivery_fee_settings" ("vehicle_type", "delivery_fee_amount", "mando_cut_percent")
VALUES
	('motorcycle', 400, 20),
	('bicycle', 300, 15),
	('car', 700, 25)
ON CONFLICT ("vehicle_type") DO NOTHING;
