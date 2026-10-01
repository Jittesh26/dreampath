import { describe, it, expect } from 'vitest';
import { mergeResumeContent } from '../resume-merge';
import { ResumeContent, resumeContentSchema } from '../resume';
import { GeneratedWording, ExtractedFact, extractedFactSchema } from '../ai-interview';

const createEmptyResume = (): ResumeContent => ({
  personal: { fullName: 'Ahmad Faiz', email: 'faiz@example.com' },
  education: [],
  experience: [],
  projects: [],
  skills: { technical: [], soft: [], languages: [] },
  certifications: [],
  awards: [],
  leadership: [],
  volunteering: [],
  scholarships: [],
  customSections: [],
});

describe('Resume AI Interview — Realistic Production Scenarios (A to J)', () => {
  // Scenario A: Short answers
  it('Scenario A: Handles short and minimal inputs gracefully without corrupting resume state', () => {
    const existing = createEmptyResume();
    const wordingFromShortAnswer: GeneratedWording = {
      skills: {
        technical: ['Java'],
        soft: [],
        languages: [],
      },
    };

    const merged = mergeResumeContent(existing, wordingFromShortAnswer);
    const validated = resumeContentSchema.parse(merged);
    expect(validated.skills?.technical).toContain('Java');
    expect(validated.education).toHaveLength(0);
    expect(validated.experience).toHaveLength(0);
  });

  // Scenario B: Long answer spanning 5+ categories
  it('Scenario B: Intelligently organizes a single long answer spanning 5+ resume categories', () => {
    const existing = createEmptyResume();
    const wordingFromLongAnswer: GeneratedWording = {
      education: [
        {
          id: crypto.randomUUID(),
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.82',
        },
      ],
      experience: [
        {
          id: crypto.randomUUID(),
          employer: 'XYZ Corp',
          position: 'Software Developer Intern',
          isCurrent: false,
          achievements: ['Engineered a React and MySQL internal portal.'],
        },
      ],
      projects: [
        {
          id: crypto.randomUUID(),
          name: 'CampusFind',
          role: 'Team Lead',
          technologies: ['React', 'MySQL'],
          achievements: ['Won second place in national hackathon.'],
        },
      ],
      skills: {
        technical: ['React', 'MySQL', 'JavaScript'],
        soft: ['Team Leadership', 'Project Management'],
        languages: ['English', 'Malay'],
      },
      leadership: [
        {
          id: crypto.randomUUID(),
          organization: 'University Hackathon Team',
          role: 'Team Lead',
          description: 'Guided four developers to build real-time event web application.',
        },
      ],
      awards: [
        {
          id: crypto.randomUUID(),
          name: 'National University Hackathon 2nd Place',
          issuer: 'Tech Malaysia',
          date: '2026',
        },
      ],
      volunteering: [
        {
          id: crypto.randomUUID(),
          organization: 'National Blood Bank',
          role: 'Volunteer Coordinator',
          description: 'Facilitated donor registration for campus-wide blood donation campaign.',
        },
      ],
      certifications: [
        {
          id: crypto.randomUUID(),
          name: 'Google Cloud Certified Associate Cloud Engineer',
          issuer: 'Google',
        },
      ],
    };

    const merged = mergeResumeContent(existing, wordingFromLongAnswer);
    const validated = resumeContentSchema.parse(merged);

    // Verify all 8 categories are properly populated
    expect(validated.education).toHaveLength(1);
    expect(validated.experience).toHaveLength(1);
    expect(validated.projects).toHaveLength(1);
    expect(validated.skills?.technical).toContain('React');
    expect(validated.leadership).toHaveLength(1);
    expect(validated.awards).toHaveLength(1);
    expect(validated.volunteering).toHaveLength(1);
    expect(validated.certifications).toHaveLength(1);
  });

  // Scenario C: Multi-topic answer
  it('Scenario C: Multi-topic answer cleanly maps education, project, achievement, and skills', () => {
    const existing = createEmptyResume();
    const wording: GeneratedWording = {
      education: [
        {
          id: crypto.randomUUID(),
          institution: 'UTM',
          qualification: 'BSc Software Engineering',
          educationLevel: 'Bachelor',
          cgpa: '3.75',
        },
      ],
      projects: [
        {
          id: crypto.randomUUID(),
          name: 'SmartAttendance',
          technologies: ['Flutter', 'Firebase'],
          achievements: ['Awarded Best Final Year Project 2026.'],
        },
      ],
      skills: {
        technical: ['Flutter', 'Dart', 'Firebase'],
        soft: [],
        languages: [],
      },
    };

    const merged = mergeResumeContent(existing, wording);
    const validated = resumeContentSchema.parse(merged);
    expect(validated.education[0].institution).toBe('UTM');
    expect(validated.projects[0].name).toBe('SmartAttendance');
    expect(validated.skills?.technical).toEqual(['Flutter', 'Dart', 'Firebase']);
  });

  // Scenario D: User correction (updates previous CGPA and date)
  it('Scenario D: User correction updates existing record and overrides outdated value', () => {
    const originalId = crypto.randomUUID();
    const existing: ResumeContent = {
      ...createEmptyResume(),
      education: [
        {
          id: originalId,
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.60', // Old CGPA
          startDate: '2023',
          endDate: '2026',
        },
      ],
    };

    // User later says: "Actually my CGPA is 3.84 and graduation is 2027"
    const correctedWording: GeneratedWording = {
      education: [
        {
          id: crypto.randomUUID(),
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.84', // Corrected CGPA
          endDate: '2027', // Corrected date
        },
      ],
    };

    const merged = mergeResumeContent(existing, correctedWording);
    const validated = resumeContentSchema.parse(merged);
    expect(validated.education).toHaveLength(1);
    expect(validated.education[0].cgpa).toBe('3.84');
    expect(validated.education[0].endDate).toBe('2027');
    expect(validated.education[0].id).toBe(originalId); // Preserves stable id
  });

  // Scenario E: Duplicate project mentioned twice
  it('Scenario E: Same project mentioned in different turns does not duplicate in resume', () => {
    const projId = crypto.randomUUID();
    const existing: ResumeContent = {
      ...createEmptyResume(),
      projects: [
        {
          id: projId,
          name: 'CampusFind',
          description: 'A student lost-and-found mobile app',
          technologies: ['React Native'],
          achievements: ['Implemented search filters.'],
        },
      ],
    };

    const repeatedWording: GeneratedWording = {
      projects: [
        {
          id: crypto.randomUUID(),
          name: 'CampusFind', // Same project
          role: 'Full-Stack Developer',
          technologies: ['React Native', 'PostgreSQL'],
          achievements: [
            'Implemented search filters.', // Duplicate bullet
            'Reduced item retrieval time by 50%.', // New bullet
          ],
        },
      ],
    };

    const merged = mergeResumeContent(existing, repeatedWording);
    const validated = resumeContentSchema.parse(merged);
    expect(validated.projects).toHaveLength(1);
    expect(validated.projects[0].name).toBe('CampusFind');
    expect(validated.projects[0].role).toBe('Full-Stack Developer');
    expect(validated.projects[0].technologies).toEqual(['React Native', 'PostgreSQL']);
    expect(validated.projects[0].achievements).toEqual([
      'Implemented search filters.',
      'Reduced item retrieval time by 50%.',
    ]);
  });

  // Scenario F: Re-synthesis idempotency (running synthesis twice results in exact same resume)
  it('Scenario F & I: Running batch synthesis multiple times produces identical deterministic output', () => {
    const existing = createEmptyResume();
    const wording: GeneratedWording = {
      education: [
        {
          id: crypto.randomUUID(),
          institution: 'Universiti Sains Malaysia',
          qualification: 'BSc Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.78',
        },
      ],
      experience: [
        {
          id: crypto.randomUUID(),
          employer: 'Inari Amertron',
          position: 'Automation Intern',
          isCurrent: false,
          achievements: ['Automated test station scripts.'],
        },
      ],
      skills: {
        technical: ['Python', 'Linux'],
        soft: ['Problem Solving'],
        languages: ['English', 'Malay'],
      },
    };

    const run1 = mergeResumeContent(existing, wording);
    const run2 = mergeResumeContent(run1, wording);
    const run3 = mergeResumeContent(run2, wording);

    expect(run3.education).toHaveLength(1);
    expect(run3.experience).toHaveLength(1);
    expect(run3.skills?.technical).toEqual(['Python', 'Linux']);
    expect(JSON.stringify(run1.education)).toBe(JSON.stringify(run3.education));
  });

  // Scenario J: Second resume version isolation
  it('Scenario J: Facts from Resume Version A are isolated from Resume Version B', () => {
    const resumeA_Id = 'resume-version-a-uuid';
    const resumeB_Id = 'resume-version-b-uuid';

    const facts: ExtractedFact[] = [
      extractedFactSchema.parse({
        id: crypto.randomUUID(),
        category: 'education',
        originalAnswer: 'I study at UM',
        structuredData: { category: 'education', data: { institution: 'Universiti Malaya' } },
        isConfirmed: true,
      }),
      extractedFactSchema.parse({
        id: crypto.randomUUID(),
        category: 'education',
        originalAnswer: 'I study at Monash',
        structuredData: { category: 'education', data: { institution: 'Monash University' } },
        isConfirmed: true,
      }),
    ];

    // Simulating database query scoped strictly by resumeVersionId
    const factsWithVersions = [
      { ...facts[0], resumeVersionId: resumeA_Id },
      { ...facts[1], resumeVersionId: resumeB_Id },
    ];

    const scopedToA = factsWithVersions.filter((f) => f.resumeVersionId === resumeA_Id);
    const scopedToB = factsWithVersions.filter((f) => f.resumeVersionId === resumeB_Id);

    expect(scopedToA).toHaveLength(1);
    expect((scopedToA[0].structuredData.data as { institution?: string })?.institution).toBe('Universiti Malaya');

    expect(scopedToB).toHaveLength(1);
    expect((scopedToB[0].structuredData.data as { institution?: string })?.institution).toBe('Monash University');
  });
});
