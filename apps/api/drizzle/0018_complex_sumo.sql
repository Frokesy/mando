ALTER TABLE "verification_tokens" ADD COLUMN "token_kind" text DEFAULT 'otp' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;