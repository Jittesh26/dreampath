import { z } from 'zod';

// Zod schemas for the DreamPath AI Resume Builder

export const personalSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url('Invalid URL').optional().or(z.literal('')),
  github: z.string().url('Invalid URL').optional().or(z.literal('')),
  portfolio: z.string().url('Invalid URL').optional().or(z.literal('')),
  professionalSummary: z.string().optional(),
  photoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const spmSubjectSchema = z.object({
  subject: z.string(),
  grade: z.string(), // e.g. A+, A, A-, B+
});

export const educationSchema = z.object({
  id: z.string().uuid(),
  institution: z.string().min(1, 'Institution is required'),
  qualification: z.string().min(1, 'Qualification is required'),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  educationLevel: z.enum(['SPM', 'STPM', 'Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Other']),
  cgpa: z.string().optional(),
  spmSubjects: z.array(spmSubjectSchema).optional(),
});

export const experienceSchema = z.object({
  id: z.string().uuid(),
  employer: z.string().min(1, 'Employer is required'),
  position: z.string().min(1, 'Position is required'),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Project name is required'),
  role: z.string().optional(),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  achievements: z.array(z.string()).optional(),
});

export const skillsSchema = z.object({
  technical: z.array(z.string()).optional(),
  soft: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

export const certificationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().optional(),
  credentialUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const awardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Award name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().optional(),
  description: z.string().optional(),
});

export const leadershipSchema = z.object({
  id: z.string().uuid(),
  organization: z.string().min(1, 'Organization is required'),
  role: z.string().min(1, 'Role is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export const volunteeringSchema = z.object({
  id: z.string().uuid(),
  organization: z.string().min(1, 'Organization is required'),
  role: z.string().min(1, 'Role is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
});

export const scholarshipSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Scholarship name is required'),
  issuer: z.string().optional(),
  year: z.string().optional(),
  description: z.string().optional(),
});

export const customSectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
});

export const resumeContentSchema = z.object({
  personal: personalSchema.optional(),
  education: z.array(educationSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  skills: skillsSchema.optional(),
  certifications: z.array(certificationSchema).default([]),
  awards: z.array(awardSchema).default([]),
  leadership: z.array(leadershipSchema).default([]),
  volunteering: z.array(volunteeringSchema).default([]),
  scholarships: z.array(scholarshipSchema).default([]),
  customSections: z.array(customSectionSchema).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type Personal = z.infer<typeof personalSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Award = z.infer<typeof awardSchema>;
export type Leadership = z.infer<typeof leadershipSchema>;
export type Volunteering = z.infer<typeof volunteeringSchema>;
export type Scholarship = z.infer<typeof scholarshipSchema>;

/**
 * Formats academic result appropriately based on qualification level.
 * SPM uses 'Result: <grade>' (never 'CGPA: 8As'), whereas universities use 'CGPA: <score>'.
 */
export function formatEducationResult(edu: {
  educationLevel?: string;
  qualification?: string;
  cgpa?: string;
}): string {
  if (!edu.cgpa) return '';
  const raw = edu.cgpa.trim();
  if (!raw) return '';

  const isSpm =
    edu.educationLevel === 'SPM' ||
    /spm|sijil\s+pelajaran\s+malaysia/i.test(edu.qualification || '');

  if (isSpm) {
    if (/^(result|grade):/i.test(raw)) return raw;
    return `Result: ${raw}`;
  }

  // Tertiary qualifications
  if (/^cgpa:/i.test(raw)) return raw;
  return `CGPA: ${raw}`;
}

/**
 * Builds clean, professional badge text for education entries without leaking internal enums or square brackets (e.g. never outputs [BACHELOR]).
 */
export function formatEducationBadge(edu: {
  educationLevel?: string;
  qualification?: string;
  cgpa?: string;
}): string {
  const parts: string[] = [];
  const qualLower = (edu.qualification || '').toLowerCase();
  const level = edu.educationLevel;

  if (level && level !== 'Other') {
    const isRedundant =
      qualLower.includes(level.toLowerCase()) ||
      (level === 'Bachelor' &&
        (qualLower.includes('degree') ||
          qualLower.includes('bachelor') ||
          qualLower.includes('bsc') ||
          qualLower.includes('beng') ||
          qualLower.includes('ba '))) ||
      (level === 'SPM' &&
        (qualLower.includes('spm') || qualLower.includes('pelajaran malaysia')));

    if (!isRedundant) {
      parts.push(level === 'Bachelor' ? 'Bachelor Degree' : level);
    }
  }

  const resultStr = formatEducationResult(edu);
  if (resultStr) {
    parts.push(resultStr);
  }

  return parts.join(' • ');
}
