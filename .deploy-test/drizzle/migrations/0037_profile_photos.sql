-- Custom SQL migration: Add photo_storage_object_id to staff_profiles and students.

ALTER TABLE "hrm"."staff_profiles"
  ADD COLUMN IF NOT EXISTS "photo_storage_object_id" uuid;--> statement-breakpoint

ALTER TABLE "student"."students"
  ADD COLUMN IF NOT EXISTS "photo_storage_object_id" uuid;
