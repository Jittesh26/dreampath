import { describe, it, expect } from 'vitest';
import {
  resumeContentSchema,
  formatEducationResult,
  formatEducationBadge,
} from '../resume';

describe('Resume Domain Schema Validation', () => {
  it('should validate a valid empty resume content', () => {
    const emptyResume = {
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      awards: [],
      leadership: [],
      volunteering: [],
      scholarships: [],
      customSections: [],
    };
    
    const result = resumeContentSchema.safeParse(emptyResume);
    expect(result.success).toBe(true);
  });

  it('should validate Malaysian education with SPM subjects and CGPA', () => {
    const resume = {
      personal: {
        fullName: 'Jittesh Amaran',
        email: 'jittesh@example.com',
      },
      education: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.98',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          institution: 'SMK Damansara Utama',
          qualification: 'Sijil Pelajaran Malaysia',
          educationLevel: 'SPM',
          spmSubjects: [
            { subject: 'Mathematics', grade: 'A+' },
            { subject: 'Additional Mathematics', grade: 'A' },
            { subject: 'Physics', grade: 'A-' },
          ]
        }
      ]
    };

    const result = resumeContentSchema.safeParse(resume);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.education.length).toBe(2);
      expect(result.data.education[1].spmSubjects?.length).toBe(3);
    }
  });

  it('should reject invalid education levels', () => {
    const resume = {
      education: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Middle School', // Invalid enum
        }
      ]
    };

    const result = resumeContentSchema.safeParse(resume);
    expect(result.success).toBe(false);
  });
  
  it('should require minimum required fields in personal schema', () => {
    const resume = {
      personal: {
        fullName: '', // Invalid: min length 1
        email: 'not-an-email', // Invalid: email format
      },
    };

    const result = resumeContentSchema.safeParse(resume);
    expect(result.success).toBe(false);
  });
});

describe('Malaysian Education Result & PDF Badge Hygiene', () => {
  it('formats SPM results as "Result: <grade>" and tertiary qualifications as "CGPA: <score>"', () => {
    // SPM entry
    const spmEdu = {
      qualification: 'Sijil Pelajaran Malaysia (SPM)',
      educationLevel: 'SPM',
      cgpa: '8A+ 1A',
    };
    expect(formatEducationResult(spmEdu)).toBe('Result: 8A+ 1A');

    // Degree entry
    const degreeEdu = {
      qualification: 'Bachelor of Computer Science',
      educationLevel: 'Bachelor',
      cgpa: '3.98 / 4.00',
    };
    expect(formatEducationResult(degreeEdu)).toBe('CGPA: 3.98 / 4.00');

    // Pre-prefixed values shouldn't be duplicated
    expect(formatEducationResult({ educationLevel: 'SPM', cgpa: 'Result: 9As' })).toBe('Result: 9As');
    expect(formatEducationResult({ educationLevel: 'Bachelor', cgpa: 'CGPA: 3.85' })).toBe('CGPA: 3.85');
  });

  it('never outputs bracketed internal enums like [BACHELOR] in PDF badge text', () => {
    const degreeEdu = {
      qualification: 'Bachelor of Computer Science',
      educationLevel: 'Bachelor',
      cgpa: '3.95',
    };
    const badge = formatEducationBadge(degreeEdu);

    // Invariant: no raw bracketed enums leaking into PDF
    expect(badge).not.toContain('[BACHELOR]');
    expect(badge).not.toContain('[');
    expect(badge).not.toContain(']');
    expect(badge).toBe('CGPA: 3.95');

    // Where degree title does not contain the level, human-readable level is provided without brackets
    const csEdu = {
      qualification: 'Artificial Intelligence',
      educationLevel: 'Bachelor',
      cgpa: '3.90',
    };
    const csBadge = formatEducationBadge(csEdu);
    expect(csBadge).toBe('Bachelor Degree • CGPA: 3.90');

    // SPM badge
    const spmEdu = {
      qualification: 'Sijil Pelajaran Malaysia',
      educationLevel: 'SPM',
      cgpa: '9As',
    };
    const spmBadge = formatEducationBadge(spmEdu);
    expect(spmBadge).toBe('Result: 9As');
    expect(spmBadge).not.toContain('[SPM]');
  });
});
