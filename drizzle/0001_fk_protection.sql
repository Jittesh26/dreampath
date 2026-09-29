ALTER TABLE "applications" DROP CONSTRAINT "applications_intake_id_intakes_id_fk";
--> statement-breakpoint
ALTER TABLE "data_reports" DROP CONSTRAINT "data_reports_scholarship_id_scholarships_id_fk";
--> statement-breakpoint
ALTER TABLE "intakes" DROP CONSTRAINT "intakes_scholarship_id_scholarships_id_fk";
--> statement-breakpoint
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_provider_id_providers_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_intake_id_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."intakes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intakes" ADD CONSTRAINT "intakes_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE restrict ON UPDATE no action;