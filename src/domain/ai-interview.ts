import { z } from 'zod';
import { 
  educationSchema, 
  experienceSchema, 
  projectSchema, 
  skillsSchema, 
  certificationSchema, 
  awardSchema, 
  leadershipSchema, 
  volunteeringSchema,
  scholarshipSchema,
  customSectionSchema
} from './resume';

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['ai', 'student']),
  content: z.string(),
  timestamp: z.date(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const factCategorySchema = z.enum([
  'education', 'experience', 'project', 'skills', 
  'certifications', 'awards', 'leadership', 'volunteering', 'scholarships', 'general'
]);
export type FactCategory = z.infer<typeof factCategorySchema>;

// Strict structured data based on category (Partial because facts are often incomplete)
export const factDataSchema = z.discriminatedUnion("category", [
  z.object({ category: z.literal("education"), data: educationSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("experience"), data: experienceSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("project"), data: projectSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("skills"), data: skillsSchema.partial() }),
  z.object({ category: z.literal("certifications"), data: certificationSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("awards"), data: awardSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("leadership"), data: leadershipSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("volunteering"), data: volunteeringSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("scholarships"), data: scholarshipSchema.partial().omit({ id: true }) }),
  z.object({ category: z.literal("general"), data: z.record(z.string(), z.unknown()) }) // For unstructured safe fallback
]);
export type FactData = z.infer<typeof factDataSchema>;

export const extractedFactSchema = z.object({
  id: z.string().uuid(),
  category: factCategorySchema,
  originalAnswer: z.string(),
  structuredData: factDataSchema,
  isConfirmed: z.boolean().default(false),
});
export type ExtractedFact = z.infer<typeof extractedFactSchema>;

// Strongly typed wording generation result
export const generatedWordingSchema = z.object({
  education: z.array(educationSchema).optional(),
  experience: z.array(experienceSchema).optional(),
  projects: z.array(projectSchema).optional(),
  skills: skillsSchema.optional(),
  certifications: z.array(certificationSchema).optional(),
  awards: z.array(awardSchema).optional(),
  leadership: z.array(leadershipSchema).optional(),
  volunteering: z.array(volunteeringSchema).optional(),
  scholarships: z.array(scholarshipSchema).optional(),
  customSections: z.array(customSectionSchema).optional()
}).strict();
export type GeneratedWording = z.infer<typeof generatedWordingSchema>;

// The interface for any Resume AI Provider (Mock or Gemini)
export interface ResumeAIProvider {
  generateNextQuestion(history: ChatMessage[]): Promise<string>;
  extractFacts(history: ChatMessage[], latestAnswer: string): Promise<ExtractedFact[]>;
  generateProfessionalWording(confirmedFacts: ExtractedFact[]): Promise<GeneratedWording>;
}

