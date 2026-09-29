import { describe, it, expect } from 'vitest';
import { resumeContentSchema } from '../resume';

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
