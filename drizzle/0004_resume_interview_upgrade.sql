ALTER TABLE "resume_versions" ADD COLUMN IF NOT EXISTS "interview_state" jsonb DEFAULT '{}' NOT NULL;
ALTER TABLE "resume_facts" ADD COLUMN IF NOT EXISTS "resume_version_id" uuid REFERENCES "public"."resume_versions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resume_facts" ALTER COLUMN "is_confirmed" SET DEFAULT true;
