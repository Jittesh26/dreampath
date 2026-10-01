CREATE TABLE IF NOT EXISTS "interview_sessions" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "resume_version_id" uuid REFERENCES "public"."resume_versions"("id") ON DELETE cascade ON UPDATE no action,
  "resume_profile_id" uuid REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action,
  "current_turn" integer DEFAULT 0 NOT NULL,
  "is_complete" boolean DEFAULT false NOT NULL,
  "current_intent_key" varchar(255),
  "summary" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interview_transcripts" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "session_id" varchar(255) REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "turn" integer NOT NULL,
  "role" varchar(50) NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interview_entities" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "session_id" varchar(255) REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "normalized_key" varchar(255) NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interview_slots" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "session_id" varchar(255) REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "entity_id" varchar(255) REFERENCES "public"."interview_entities"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "slot" varchar(100) NOT NULL,
  "state" varchar(50) DEFAULT 'unknown' NOT NULL,
  "value" jsonb,
  "fact_id" varchar(255),
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interview_facts" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "session_id" varchar(255) REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "entity_id" varchar(255) REFERENCES "public"."interview_entities"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "slot" varchar(100) NOT NULL,
  "value" jsonb NOT NULL,
  "raw_evidence" text NOT NULL,
  "source_turn" integer NOT NULL,
  "confidence" varchar(20) DEFAULT '1.0' NOT NULL,
  "origin" varchar(50) DEFAULT 'explicit' NOT NULL,
  "status" varchar(50) DEFAULT 'active' NOT NULL,
  "source_fact_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "interview_intents" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "session_id" varchar(255) REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action NOT NULL,
  "intent_key" varchar(255) NOT NULL,
  "status" varchar(50) DEFAULT 'pending' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
