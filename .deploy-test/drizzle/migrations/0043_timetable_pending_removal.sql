ALTER TABLE "academic"."timetables" DROP CONSTRAINT IF EXISTS "timetables_status_valid";
--> statement-breakpoint
ALTER TABLE "academic"."timetables" ADD CONSTRAINT "timetables_status_valid" CHECK ("status" IN ('draft', 'published', 'marked_for_removal'));
