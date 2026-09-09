CREATE TABLE "notification_preferences" (
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text DEFAULT '22:00' NOT NULL,
	"quiet_hours_end" text DEFAULT '07:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;