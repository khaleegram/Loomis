CREATE SCHEMA "storage";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage"."storage_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"owner_resource_type" varchar(128) NOT NULL,
	"owner_resource_id" uuid NOT NULL,
	"bucket" varchar(128) NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"object_hash" char(64) NOT NULL,
	"classification" varchar(20) NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"content_length_bytes" bigint NOT NULL,
	"status" varchar(20) DEFAULT 'upload_pending' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "storage"."storage_objects" ADD CONSTRAINT "storage_objects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenant"."tenants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "storage_objects_bucket_object_key_unique" ON "storage"."storage_objects" USING btree ("bucket","object_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_objects_tenant_resource_idx" ON "storage"."storage_objects" USING btree ("tenant_id","owner_resource_type","owner_resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_objects_classification_created_at_idx" ON "storage"."storage_objects" USING btree ("classification","created_at");