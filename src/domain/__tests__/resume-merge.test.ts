import { describe, it, expect } from 'vitest';
import { mergeResumeContent } from '../resume-merge';
import { ResumeContent, resumeContentSchema } from '../resume';
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
    expect(merged.education[0].cgpa).toBe('3.70'); // Existing manual CGPA is preserved
    expect(merged.education[0].fieldOfStudy).toBe('Artificial Intelligence'); // Empty field is populated
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

  it('normalizes numeric startDate (e.g. 2025) to string "2025" and preserves existing string dates', () => {
    const validId = crypto.randomUUID();
    const existing: ResumeContent = {
      ...createEmptyResume(),
      personal: {
        fullName: 'Amarjit Kani',
        email: 'amarjit@example.com',
      },
      education: [
        {
          id: validId,
          institution: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
          qualification: 'Bachelor of Computer Science with Honours',
          educationLevel: 'Bachelor',
          fieldOfStudy: 'Computer Science',
          cgpa: '3.98',
          startDate: '2025',
          endDate: 'Present',
        },
      ],
    };

    // Case 1: Existing entry updated with numeric startDate and numeric cgpa
    const generatedUpdate: GeneratedWording = {
      education: [
        {
          id: crypto.randomUUID(),
          institution: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
          qualification: 'Bachelor of Computer Science with Honours',
          educationLevel: 'Bachelor',
          fieldOfStudy: 'Computer Science',
          cgpa: 3.98 as any,
          startDate: 2025 as any,
          endDate: 'Present',
        },
      ],
    };

    const mergedUpdate = mergeResumeContent(existing, generatedUpdate);
    expect(mergedUpdate.education).toHaveLength(1);
    expect(typeof mergedUpdate.education[0].startDate).toBe('string');
    expect(mergedUpdate.education[0].startDate).toBe('2025');
    expect(typeof mergedUpdate.education[0].cgpa).toBe('string');
    expect(mergedUpdate.education[0].cgpa).toBe('3.98');
    expect(mergedUpdate.education[0].institution).toBe('Universiti Pertahanan Nasional Malaysia (UPNM)');
    expect(mergedUpdate.education[0].qualification).toBe('Bachelor of Computer Science with Honours');
    expect(mergedUpdate.education[0].fieldOfStudy).toBe('Computer Science');
    expect(mergedUpdate.education[0].educationLevel).toBe('Bachelor');
    expect(mergedUpdate.education[0].endDate).toBe('Present');

    // Must strictly validate against resumeContentSchema without ZodError
    const parsedUpdate = resumeContentSchema.safeParse(mergedUpdate);
    expect(parsedUpdate.success).toBe(true);

    // Case 2: New entry appended with numeric startDate: 2025
    const emptyExisting: ResumeContent = {
      ...createEmptyResume(),
      personal: {
        fullName: 'Amarjit Kani',
        email: 'amarjit@example.com',
      },
    };
    const generatedNew: GeneratedWording = {
      education: [
        {
          id: crypto.randomUUID(),
          institution: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
          qualification: 'Bachelor of Computer Science with Honours',
          educationLevel: 'Bachelor',
          fieldOfStudy: 'Computer Science',
          cgpa: 3.98 as any,
          startDate: 2025 as any,
          endDate: '2029',
        },
      ],
    };

    const mergedNew = mergeResumeContent(emptyExisting, generatedNew);
    expect(mergedNew.education).toHaveLength(1);
    expect(typeof mergedNew.education[0].startDate).toBe('string');
    expect(mergedNew.education[0].startDate).toBe('2025');
    expect(typeof mergedNew.education[0].endDate).toBe('string');
    expect(mergedNew.education[0].endDate).toBe('2029');
    expect(typeof mergedNew.education[0].cgpa).toBe('string');
    expect(mergedNew.education[0].cgpa).toBe('3.98');
    expect(mergedNew.education[0].institution).toBe('Universiti Pertahanan Nasional Malaysia (UPNM)');
    expect(mergedNew.education[0].qualification).toBe('Bachelor of Computer Science with Honours');
    expect(mergedNew.education[0].fieldOfStudy).toBe('Computer Science');
    expect(mergedNew.education[0].educationLevel).toBe('Bachelor');

    const parsedNew = resumeContentSchema.safeParse(mergedNew);
    expect(parsedNew.success).toBe(true);

    // Case 3: Existing string "2025" remains unchanged as string "2025"
    const generatedStringDate: GeneratedWording = {
      education: [
        {
          id: 'str-uuid',
          institution: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
          qualification: 'Bachelor of Computer Science with Honours',
          educationLevel: 'Bachelor',
          startDate: '2025',
        },
      ],
    };
    const mergedStringDate = mergeResumeContent(emptyExisting, generatedStringDate);
    expect(mergedStringDate.education[0].startDate).toBe('2025');
    expect(typeof mergedStringDate.education[0].startDate).toBe('string');
  });

  describe('Manual Edit Preservation During AI Regeneration', () => {
    // Test 1 — Existing manual scalar wins
    it('Test 1 — Existing manual scalar wins over new AI synthesis', () => {
      const expId = crypto.randomUUID();
      const existing: ResumeContent = {
        ...createEmptyResume(),
        experience: [
          {
            id: expId,
            employer: 'Health Lane Family Pharmacy',
            position: 'Pharmacy Assistant',
            isCurrent: false,
            description: 'My manually edited pharmacy experience.',
          },
        ],
      };

      const generated: GeneratedWording = {
        experience: [
          {
            id: crypto.randomUUID(),
            employer: 'Health Lane Family Pharmacy',
            position: 'Pharmacy Assistant',
            isCurrent: false,
            description: 'AI generated pharmacy description.',
          },
        ],
      };

      const merged = mergeResumeContent(existing, generated);
      expect(merged.experience).toHaveLength(1);
      expect(merged.experience[0].description).toBe('My manually edited pharmacy experience.');
    });

    // Test 2 — Empty existing field can be populated
    it('Test 2 — Empty existing field can be populated by AI synthesis', () => {
      const expId = crypto.randomUUID();
      const existing: ResumeContent = {
        ...createEmptyResume(),
        experience: [
          {
            id: expId,
            employer: 'Health Lane Family Pharmacy',
            position: 'Pharmacy Assistant',
            isCurrent: false,
            description: '',
          },
        ],
      };

      const generated: GeneratedWording = {
        experience: [
          {
            id: crypto.randomUUID(),
            employer: 'Health Lane Family Pharmacy',
            position: 'Pharmacy Assistant',
            isCurrent: false,
            description: 'AI generated pharmacy description.',
          },
        ],
      };

      const merged = mergeResumeContent(existing, generated);
      expect(merged.experience).toHaveLength(1);
      expect(merged.experience[0].description).toBe('AI generated pharmacy description.');
    });

    // Test 3 — New entity is still added
    it('Test 3 — New entity that does not exist yet is added normally', () => {
      const existing: ResumeContent = {
        ...createEmptyResume(),
        projects: [],
      };

      const generated: GeneratedWording = {
        projects: [
          {
            id: crypto.randomUUID(),
            name: 'CampusFind',
            role: 'Lead Developer',
            description: 'Smart campus lost and found platform.',
            technologies: ['React', 'Next.js'],
          },
        ],
      };

      const merged = mergeResumeContent(existing, generated);
      expect(merged.projects).toHaveLength(1);
      expect(merged.projects[0].name).toBe('CampusFind');
      expect(merged.projects[0].role).toBe('Lead Developer');
      expect(merged.projects[0].description).toBe('Smart campus lost and found platform.');
      expect(merged.projects[0].technologies).toEqual(['React', 'Next.js']);
    });

    // Test 4 — Existing manual project description wins
    it('Test 4 — Existing manual project description remains unchanged', () => {
      const projId = crypto.randomUUID();
      const existing: ResumeContent = {
        ...createEmptyResume(),
        projects: [
          {
            id: projId,
            name: 'CampusFind',
            role: 'Project Manager',
            description: 'My manually edited project description.',
            technologies: ['React'],
          },
        ],
      };

      const generated: GeneratedWording = {
        projects: [
          {
            id: crypto.randomUUID(),
            name: 'CampusFind',
            description: 'AI generated project description.',
            technologies: ['Next.js'],
          },
        ],
      };

      const merged = mergeResumeContent(existing, generated);
      expect(merged.projects).toHaveLength(1);
      expect(merged.projects[0].description).toBe('My manually edited project description.');
      expect(merged.projects[0].technologies).toEqual(['React', 'Next.js']);
    });

    // Test 5 — Existing manual education value wins
    it('Test 5 — Existing manual education value remains unchanged', () => {
      const eduId = crypto.randomUUID();
      const existing: ResumeContent = {
        ...createEmptyResume(),
        education: [
          {
            id: eduId,
            institution: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
            qualification: 'Bachelor of Computer Science with Honours',
            educationLevel: 'Bachelor',
            fieldOfStudy: 'Computer Science',
            cgpa: '3.98',
            startDate: '2025',
          },
        ],
      };

      const generated: GeneratedWording = {
        education: [
          {
            id: crypto.randomUUID(),
            institution: 'Universiti Pertahanan Nasional Malaysia (UPNM)',
            qualification: 'Bachelor of Computer Science with Honours',
            educationLevel: 'Bachelor',
            fieldOfStudy: 'Software Engineering', // AI proposed different major
            cgpa: '4.00', // AI proposed different CGPA
            startDate: '2024',
          },
        ],
      };

      const merged = mergeResumeContent(existing, generated);
      expect(merged.education).toHaveLength(1);
      expect(merged.education[0].institution).toBe('Universiti Pertahanan Nasional Malaysia (UPNM)');
      expect(merged.education[0].fieldOfStudy).toBe('Computer Science'); // Existing manual value preserved
      expect(merged.education[0].cgpa).toBe('3.98'); // Existing manual value preserved
      expect(merged.education[0].startDate).toBe('2025'); // Existing manual value preserved
    });

    // Test 6 — Existing manual skills/list behaviour
    it('Test 6 — Existing skill merge behaviour is preserved as additive/deduplicating, not scalar replacement', () => {
      const existing: ResumeContent = {
        ...createEmptyResume(),
        skills: {
          technical: ['React', 'TypeScript', 'Node.js'],
          soft: ['Problem Solving'],
          languages: ['English', 'Malay'],
        },
      };

      const generated: GeneratedWording = {
        skills: {
          technical: ['TypeScript', 'Python', 'Docker'],
          soft: ['Team Leadership', 'Problem Solving'],
          languages: ['Mandarin'],
        },
      };

      const merged = mergeResumeContent(existing, generated);
      // Merges and deduplicates lists rather than replacing
      expect(merged.skills?.technical).toEqual(['React', 'TypeScript', 'Node.js', 'Python', 'Docker']);
      expect(merged.skills?.soft).toEqual(['Problem Solving', 'Team Leadership']);
      expect(merged.skills?.languages).toEqual(['English', 'Malay', 'Mandarin']);
    });
  });
});
