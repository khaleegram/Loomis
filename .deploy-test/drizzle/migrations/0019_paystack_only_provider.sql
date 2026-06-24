-- Restrict webhook provider to Paystack only (Flutterwave removed).

DO $$ BEGIN
 ALTER TABLE "finance"."webhook_events" DROP CONSTRAINT "webhook_events_provider_valid";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "finance"."webhook_events"
   ADD CONSTRAINT "webhook_events_provider_valid"
   CHECK ("provider" IN ('paystack'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
