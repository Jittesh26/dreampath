import { describe, it, expect } from 'vitest';
import { mergeResumeContent } from '../resume-merge';
import { ResumeContent } from '../resume';
import { GeneratedWording } from '../ai-interview';

const createEmptyResume = (): ResumeContent => ({
  personal: {
    fullName: '',
    email: '',
  },
  education: [],
  experience: [],
  projects: [],
  skills: {
    technical: [],
    soft: [],
    languages: [],
  },
  certifications: [],
  awards: [],
  leadership: [],
  volunteering: [],
  scholarships: [],
  customSections: [],
});

describe('mergeResumeContent', () => {
  it('merges personal info without overwriting untouched fields', () => {
    const existing: ResumeContent = {
      ...createEmptyResume(),
      personal: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+60123456789',
        location: 'Kuala Lumpur',
      },
    };

    const generated: GeneratedWording = {
      personal: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        professionalSummary: 'Passionate software engineer with hands-on experience in full-stack cloud applications.',
      },
    };

    const merged = mergeResumeContent(existing, generated);
    expect(merged.personal?.fullName).toBe('Jane Doe');
    expect(merged.personal?.phone).toBe('+60123456789');
    expect(merged.personal?.location).toBe('Kuala Lumpur');
    expect(merged.personal?.professionalSummary).toBe(
      'Passionate software engineer with hands-on experience in full-stack cloud applications.'
    );
  });

  it('updates existing education entry rather than creating duplicates', () => {
    const existing: ResumeContent = {
      ...createEmptyResume(),
      education: [
        {
          id: 'edu-1',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.70',
        },
      ],
    };

    const generated: GeneratedWording = {
      education: [
        {
          id: 'random-ai-uuid',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.85', // Updated CGPA
          fieldOfStudy: 'Artificial Intelligence',
        },
      ],
    };

    const merged = mergeResumeContent(existing, generated);
    expect(merged.education).toHaveLength(1);
    expect(merged.education[0].cgpa).toBe('3.85');
    expect(merged.education[0].fieldOfStudy).toBe('Artificial Intelligence');
    expect(merged.education[0].id).toBe('edu-1'); // preserves stable user ID
  });

  it('appends distinct new education entries', () => {
    const existing: ResumeContent = {
      ...createEmptyResume(),
      education: [
        {
          id: 'edu-1',
          institution: 'SMK Damansara Utama',
          qualification: 'SPM',
          educationLevel: 'SPM',
        },
      ],
    };

    const generated: GeneratedWording = {
      education: [
        {
          id: 'edu-2',
          institution: 'Universiti Malaya',
          qualification: 'BSc Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.8',
        },
      ],
    };

    const merged = mergeResumeContent(existing, generated);
    expect(merged.education).toHaveLength(2);
    expect(merged.education[0].institution).toBe('SMK Damansara Utama');
    expect(merged.education[1].institution).toBe('Universiti Malaya');
  });

  it('merges work experience achievements without duplicate bullet points', () => {
    const existing: ResumeContent = {
      ...createEmptyResume(),
      experience: [
        {
          id: 'exp-1',
          employer: 'Grab',
          position: 'Software Engineering Intern',
          isCurrent: false,
          achievements: [
            'Built internal payment reconciliation dashboard.',
          ],
        },
      ],
    };

    const generated: GeneratedWording = {
      experience: [
        {
          id: 'random-uuid',
          employer: 'Grab',
          position: 'Software Engineering Intern',
          isCurrent: false,
          achievements: [
            'Built internal payment reconciliation dashboard.', // duplicate
            'Optimized SQL queries reducing latency by 35%.', // new
          ],
        },
      ],
    };

    const merged = mergeResumeContent(existing, generated);
    expect(merged.experience).toHaveLength(1);
    expect(merged.experience[0].achievements).toEqual([
      'Built internal payment reconciliation dashboard.',
      'Optimized SQL queries reducing latency by 35%.',
    ]);
  });

  it('merges projects and technical skills arrays deduplicating entries', () => {
    const existing: ResumeContent = {
      ...createEmptyResume(),
      projects: [
        {
          id: 'proj-1',
          name: 'CampusFind',
          description: 'A student portal',
          technologies: ['React', 'Node.js'],
        },
      ],
      skills: {
        technical: ['JavaScript', 'React'],
        soft: ['Communication'],
        languages: ['English', 'Malay'],
      },
    };

    const generated: GeneratedWording = {
      projects: [
        {
          id: 'proj-2',
          name: 'CampusFind',
          role: 'Full-stack Lead',
          technologies: ['React', 'Next.js', 'PostgreSQL'],
          achievements: ['Deployed to 5,000 active university students.'],
        },
      ],
      skills: {
        technical: ['React', 'TypeScript', 'PostgreSQL'],
        soft: ['Team Leadership', 'Communication'],
        languages: ['English', 'Mandarin'],
      },
    };

    const merged = mergeResumeContent(existing, generated);
    expect(merged.projects).toHaveLength(1);
    expect(merged.projects[0].role).toBe('Full-stack Lead');
    expect(merged.projects[0].technologies).toEqual(['React', 'Node.js', 'Next.js', 'PostgreSQL']);
    expect(merged.projects[0].achievements).toEqual(['Deployed to 5,000 active university students.']);

    expect(merged.skills?.technical).toEqual(['JavaScript', 'React', 'TypeScript', 'PostgreSQL']);
    expect(merged.skills?.soft).toEqual(['Communication', 'Team Leadership']);
    expect(merged.skills?.languages).toEqual(['English', 'Malay', 'Mandarin']);
  });
});
