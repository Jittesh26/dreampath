import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { RequirementNode } from '../domain/schema';

// USERS TABLE
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('student'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// STUDENT PROFILES TABLE
export const studentProfiles = pgTable('student_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  citizenship: varchar('citizenship', { length: 100 }), // e.g. 'Malaysian'
  bumiputeraStatus: boolean('bumiputera_status'),
  incomeBand: varchar('income_band', { length: 20 }), // e.g. 'B40', 'M40', 'T20'
  householdIncome: integer('household_income'),
  cgpa: varchar('cgpa', { length: 10 }), // Stored as varchar or numeric to prevent float drift, let's use numeric string or real
  spmResults: jsonb('spm_results'), // Record<string, SPMGrade>
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// PROVIDERS TABLE
export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  url: varchar('url', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// SCHOLARSHIPS TABLE
export const scholarships = pgTable('scholarships', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'restrict' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// INTAKES TABLE
export const intakes = pgTable('intakes', {
  id: uuid('id').primaryKey().defaultRandom(),
  scholarshipId: uuid('scholarship_id').references(() => scholarships.id, { onDelete: 'restrict' }).notNull(),
  year: integer('year').notNull(),
  openDate: date('open_date'),
  closeDate: date('close_date'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, open, closed
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// INTAKE VERSIONS TABLE
export const intakeVersions = pgTable('intake_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  intakeId: uuid('intake_id').references(() => intakes.id, { onDelete: 'cascade' }).notNull(),
  versionNum: integer('version_num').notNull().default(1),
  sourceUrl: varchar('source_url', { length: 500 }),
  evidenceNotes: text('evidence_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// DATA REPORTS TABLE
export const dataReports = pgTable('data_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  scholarshipId: uuid('scholarship_id').references(() => scholarships.id, { onDelete: 'restrict' }).notNull(),
  message: text('message').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// APPLICATIONS TABLE
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  intakeId: uuid('intake_id').references(() => intakes.id, { onDelete: 'restrict' }).notNull(),
  status: varchar('status', { length: 50 }).default('saved').notNull(), // saved, applied, under_review, awarded, rejected, waitlisted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// REQUIREMENTS TABLE
export const requirements = pgTable('requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  intakeVersionId: uuid('intake_version_id').references(() => intakeVersions.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  ruleAst: jsonb('rule_ast').$type<RequirementNode>().notNull(), // Strongly typed AST!
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// RELATIONS
export const usersRelations = relations(users, ({ one, many }) => ({
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  resumeProfile: one(resumeProfiles, {
    fields: [users.id],
    references: [resumeProfiles.userId],
  }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  intake: one(intakes, {
    fields: [applications.intakeId],
    references: [intakes.id],
  }),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  scholarships: many(scholarships),
}));

export const scholarshipsRelations = relations(scholarships, ({ one, many }) => ({
  provider: one(providers, {
    fields: [scholarships.providerId],
    references: [providers.id],
  }),
  intakes: many(intakes),
}));

export const intakesRelations = relations(intakes, ({ one, many }) => ({
  scholarship: one(scholarships, {
    fields: [intakes.scholarshipId],
    references: [scholarships.id],
  }),
  versions: many(intakeVersions),
}));

export const intakeVersionsRelations = relations(intakeVersions, ({ one, many }) => ({
  intake: one(intakes, {
    fields: [intakeVersions.intakeId],
    references: [intakes.id],
  }),
  requirements: many(requirements),
}));

export const requirementsRelations = relations(requirements, ({ one }) => ({
  intakeVersion: one(intakeVersions, {
    fields: [requirements.intakeVersionId],
    references: [intakeVersions.id],
  }),
}));

// RESUME PROFILES TABLE
export const resumeProfiles = pgTable('resume_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RESUME VERSIONS TABLE
export const resumeVersions = pgTable('resume_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeProfileId: uuid('resume_profile_id').references(() => resumeProfiles.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull().default('Untitled Resume'),
  content: jsonb('content').notNull().default('{}'), // Validated by ResumeContent Zod schema
  interviewState: jsonb('interview_state').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RESUME FACTS TABLE
export const resumeFacts = pgTable('resume_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeProfileId: uuid('resume_profile_id').references(() => resumeProfiles.id, { onDelete: 'cascade' }).notNull(),
  resumeVersionId: uuid('resume_version_id').references(() => resumeVersions.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(), // 'project', 'experience', 'education'
  source: varchar('source', { length: 50 }).notNull(), // 'student', 'ai'
  originalAnswer: text('original_answer'), // Provenance: the exact student text
  content: jsonb('content').notNull(), // The extracted fact representation
  isConfirmed: boolean('is_confirmed').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resumeProfilesRelations = relations(resumeProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [resumeProfiles.userId],
    references: [users.id],
  }),
  versions: many(resumeVersions),
  facts: many(resumeFacts),
}));

export const resumeVersionsRelations = relations(resumeVersions, ({ one, many }) => ({
  profile: one(resumeProfiles, {
    fields: [resumeVersions.resumeProfileId],
    references: [resumeProfiles.id],
  }),
  facts: many(resumeFacts),
}));

export const resumeFactsRelations = relations(resumeFacts, ({ one }) => ({
  profile: one(resumeProfiles, {
    fields: [resumeFacts.resumeProfileId],
    references: [resumeProfiles.id],
  }),
  version: one(resumeVersions, {
    fields: [resumeFacts.resumeVersionId],
    references: [resumeVersions.id],
  }),
}));
