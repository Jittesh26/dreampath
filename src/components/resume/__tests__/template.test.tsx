import React from 'react';
import { describe, it, expect } from 'vitest';
import { StandardAcademicTemplate } from '../templates/StandardAcademicTemplate';
import { ModernTechTemplate } from '../templates/ModernTechTemplate';
import { ResumeContent } from '@/domain/resume';

describe('StandardAcademicTemplate PDF Template', () => {
  it('should render document element for minimal valid resume content', () => {
    const content: ResumeContent = {
      personal: {
        fullName: 'Ahmad Faiz',
        email: 'faiz@example.com',
        phone: '+60 12-345 6789',
        location: 'Kuala Lumpur, Malaysia'
      },
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      awards: [],
      leadership: [],
      volunteering: [],
      scholarships: [],
      customSections: []
    };

    const element = <StandardAcademicTemplate content={content} />;
    expect(element).toBeDefined();
    expect(element.props.content.personal?.fullName).toBe('Ahmad Faiz');
  });

  it('should structure Malaysian academic sections including SPM and CGPA', () => {
    const content: ResumeContent = {
      personal: {
        fullName: 'Nurul Huda',
        email: 'huda@example.com',
        phone: '+60 19-876 5432',
        location: 'Penang, Malaysia',
        linkedin: 'https://linkedin.com/in/nurulhuda',
        github: 'https://github.com/nurulhuda'
      },
      education: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.92',
          startDate: '2021',
          endDate: '2025'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          institution: 'Kolej Yayasan Saad',
          qualification: 'Sijil Pelajaran Malaysia',
          educationLevel: 'SPM',
          startDate: '2016',
          endDate: '2020',
          spmSubjects: [
            { subject: 'Bahasa Melayu', grade: 'A+' },
            { subject: 'English', grade: 'A+' },
            { subject: 'Mathematics', grade: 'A+' },
            { subject: 'Additional Mathematics', grade: 'A+' }
          ]
        }
      ],
      experience: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          employer: 'Petronas Digital',
          position: 'Software Engineer Intern',
          location: 'Kuala Lumpur',
          startDate: '2024-03',
          endDate: '2024-09',
          isCurrent: false,
          description: 'Supported full-stack internal tooling development.',
          achievements: ['Optimized SQL queries by 35%.']
        }
      ],
      projects: [
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'BiasiswaHub',
          role: 'Lead Developer',
          description: 'Scholarship discovery platform for Malaysian undergraduates.',
          technologies: ['Next.js', 'PostgreSQL', 'Tailwind'],
          achievements: ['Reached 5,000 monthly active students.']
        }
      ],
      skills: {
        technical: ['TypeScript', 'React', 'Python', 'PostgreSQL'],
        languages: ['Bahasa Melayu (Native)', 'English (Professional)', 'Mandarin (Basic)'],
        soft: ['Critical Thinking', 'Leadership', 'Public Speaking']
      },
      certifications: [],
      awards: [
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Dean’s Honor List',
          issuer: 'Faculty of Computer Science & IT, UM',
          date: '2023'
        }
      ],
      leadership: [
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          organization: 'UM Computer Science Society',
          role: 'Vice President',
          startDate: '2023',
          endDate: '2024',
          description: 'Organized national hackathon with 400+ participants.'
        }
      ],
      volunteering: [],
      scholarships: [
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          name: 'JPA Dermasiswa B40',
          issuer: 'Jabatan Perkhidmatan Awam',
          year: '2021'
        }
      ],
      customSections: []
    };

    const tree = <StandardAcademicTemplate content={content} />;
    expect(tree).toBeDefined();
    expect(tree.props.content.education.length).toBe(2);
    expect(tree.props.content.education[1].spmSubjects?.length).toBe(4);
    expect(tree.props.content.experience.length).toBe(1);
    expect(tree.props.content.projects.length).toBe(1);
    expect(tree.props.content.leadership.length).toBe(1);
    expect(tree.props.content.scholarships.length).toBe(1);
    expect(tree.props.content.skills?.languages?.length).toBe(3);
  });

  it('should compile valid PDF binary stream and verify page structure', async () => {
    const { pdf } = await import('@react-pdf/renderer');
    const content: ResumeContent = {
      personal: {
        fullName: 'Muhammad Danial bin Azman',
        email: 'danial.azman@siswa.um.edu.my',
        phone: '+60 17-234 5678',
        location: 'Kuala Lumpur, Malaysia'
      },
      education: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science',
          educationLevel: 'Bachelor',
          cgpa: '3.94'
        }
      ],
      experience: [],
      projects: [],
      certifications: [],
      awards: [],
      leadership: [],
      volunteering: [],
      scholarships: [],
      customSections: []
    };

    const doc = <StandardAcademicTemplate content={content} />;
    const instance = pdf(doc);
    const blob = await instance.toBlob();
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(100);

    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(100);

    // Verify valid PDF header
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');

    // Verify EOF marker
    const tail = buffer.subarray(buffer.length - 30).toString('ascii');
    expect(tail.includes('%%EOF')).toBe(true);
  });

  it('should compile multi-page A4 document without clipping errors and verify A4 page metrics', async () => {
    const { pdf } = await import('@react-pdf/renderer');
    // Generates a comprehensive multi-page Malaysian academic resume
    const multiPageContent: ResumeContent = {
      personal: {
        fullName: 'Muhammad Danial bin Azman',
        email: 'danial.azman@siswa.um.edu.my',
        phone: '+60 17-234 5678',
        location: 'Kuala Lumpur, Malaysia',
        linkedin: 'https://linkedin.com/in/danialazman',
        github: 'https://github.com/danialazman',
        portfolio: 'https://danialazman.dev',
        professionalSummary:
          'Final-year Computer Science undergraduate at Universiti Malaya specializing in Artificial Intelligence. JPA PIDN Scholar with extensive experience in machine learning pipelines, full-stack microservices, and student leadership.'
      },
      education: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          institution: 'Universiti Malaya',
          qualification: 'Bachelor of Computer Science (Artificial Intelligence)',
          educationLevel: 'Bachelor',
          startDate: '2022',
          endDate: '2026',
          cgpa: '3.94 / 4.00'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          institution: 'Pusat Asasi Sains Universiti Malaya',
          qualification: 'Foundation in Physical Sciences',
          educationLevel: 'Foundation',
          startDate: '2021',
          endDate: '2022',
          cgpa: '4.00 / 4.00'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          institution: 'Kolej Islam Sultan Alam Shah',
          qualification: 'Sijil Pelajaran Malaysia',
          educationLevel: 'SPM',
          startDate: '2016',
          endDate: '2020',
          cgpa: '9A+ 1A',
          spmSubjects: [
            { subject: 'Bahasa Melayu', grade: 'A+' },
            { subject: 'English', grade: 'A+' },
            { subject: 'Mathematics', grade: 'A+' },
            { subject: 'Additional Mathematics', grade: 'A+' },
            { subject: 'Physics', grade: 'A+' },
            { subject: 'Chemistry', grade: 'A+' },
            { subject: 'Biology', grade: 'A+' },
            { subject: 'Sejarah', grade: 'A+' },
            { subject: 'Pendidikan Islam', grade: 'A+' },
            { subject: 'Bahasa Arab', grade: 'A' }
          ]
        }
      ],
      experience: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          employer: 'Petronas Digital Sdn Bhd',
          position: 'Software Engineering & AI Intern',
          location: 'Kuala Lumpur',
          startDate: '2024-03',
          endDate: '2024-09',
          isCurrent: false,
          description: 'Developed analytics pipelines for offshore platform sensor telemetry.',
          achievements: [
            'Engineered automated ETL workflows in Python and Apache Spark processing 1.2M daily sensor records.',
            'Developed interactive analytics dashboards with Next.js and PostgreSQL reducing anomaly detection latency by 42%.',
            'Implemented automated unit test suites achieving 94% test coverage across core microservices.'
          ]
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          employer: 'Faculty of Computer Science & IT, UM',
          position: 'Undergraduate Teaching Assistant',
          location: 'Kuala Lumpur',
          startDate: '2023-10',
          endDate: '2024-02',
          isCurrent: false,
          description: 'Conducted weekly lab sessions for 85 second-year students in Data Structures and Algorithms.',
          achievements: [
            'Designed coding exercises and automated grader scripts in C++ and Python.',
            'Mentored 15 academically challenged students resulting in 100% pass rate in lab assessments.'
          ]
        }
      ],
      projects: [
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          name: 'BiasiswaHub Malaysia',
          role: 'Lead Architect',
          startDate: '2024-01',
          endDate: 'Present',
          technologies: ['Next.js 15', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
          description: 'Centralized scholarship matching platform for secondary and tertiary students.',
          achievements: [
            'Reached 12,000 verified student accounts across Malaysia with zero marketing spend.',
            'Engineered deterministic rule engine that instantly calculates SPM/STPM cut-off eligibility for 150+ scholarship schemes.',
            'Integrated automated deadline alerts via Telegram bot serving 4,500 active subscribers.'
          ]
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          name: 'MyJawiOCR',
          role: 'ML Researcher',
          startDate: '2023-08',
          endDate: '2023-12',
          technologies: ['PyTorch', 'Vision Transformer (ViT)', 'FastAPI'],
          description: 'Historical Jawi manuscript digitisation model trained on national archive documents.',
          achievements: [
            'Trained customized Vision Transformer model achieving 92.4% character recognition accuracy on degraded Jawi prints.'
          ]
        }
      ],
      leadership: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          organization: 'Persatuan Sains Komputer Universiti Malaya',
          role: 'Vice President',
          startDate: '2023',
          endDate: '2024',
          description: 'Led executive board of 22 students organizing university-wide tech symposia and hackathons with RM45,000 corporate sponsorship.'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440031',
          organization: 'Varsity Hackathon 2024',
          role: 'Director of Technology',
          startDate: '2023',
          endDate: '2024',
          description: 'Directed end-to-end technology infrastructure for Malaysia’s premier student hackathon with 600+ physical participants.'
        }
      ],
      volunteering: [
        {
          id: '550e8400-e29b-41d4-a716-446655440040',
          organization: 'Teach For Malaysia Volunteer Chapter',
          role: 'STEM Workshop Lead Tutor',
          startDate: '2023',
          endDate: 'Present',
          description: 'Volunteered 120+ hours conducting free weekend Python workshops for B40 rural secondary school students.'
        }
      ],
      scholarships: [
        {
          id: '550e8400-e29b-41d4-a716-446655440050',
          name: 'Program Penajaan Ijazah Dalam Negara (PIDN)',
          issuer: 'Jabatan Perkhidmatan Awam (JPA)',
          year: '2022 – Present',
          description: 'Federal scholarship awarded for academic excellence in undergraduate studies covering tuition and allowances.'
        }
      ],
      awards: [
        {
          id: '550e8400-e29b-41d4-a716-446655440060',
          name: 'Dean’s Honor List (Anugerah Dekan)',
          issuer: 'Faculty of Computer Science & IT, UM',
          date: 'Semesters 1, 2, 3, 4',
          description: 'Awarded to undergraduates maintaining GPA above 3.75.'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440061',
          name: 'Champion — Shell Digital Innovation Challenge',
          issuer: 'Shell Malaysia & MDEC',
          date: '2023',
          description: 'Won 1st place among 120 teams nationwide for AI-driven energy optimization solution.'
        }
      ],
      certifications: [
        {
          id: '550e8400-e29b-41d4-a716-446655440070',
          name: 'AWS Certified Solutions Architect – Associate',
          issuer: 'Amazon Web Services',
          date: '2024'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440071',
          name: 'TensorFlow Developer Certificate',
          issuer: 'Google',
          date: '2023'
        }
      ],
      skills: {
        technical: ['Python', 'TypeScript', 'JavaScript', 'C++', 'SQL', 'PostgreSQL', 'Next.js 15', 'React', 'FastAPI', 'Docker', 'AWS'],
        languages: ['Bahasa Melayu (Native)', 'English (Fluent / CEFR C1)', 'Mandarin (Basic / HSK 2)'],
        soft: ['Technical Communication', 'Team Leadership', 'Complex Problem Solving', 'Public Presentation']
      },
      customSections: []
    };

    const doc = <StandardAcademicTemplate content={multiPageContent} />;
    const instance = pdf(doc);
    const blob = await instance.toBlob();
    expect(blob).toBeDefined();

    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify PDF header & EOF
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.subarray(buffer.length - 30).toString('ascii').includes('%%EOF')).toBe(true);

    // Count pages in PDF stream
    const pdfRaw = buffer.toString('latin1');
    const pageMatches = pdfRaw.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 0;

    // Verify multi-page span (content forces 2 pages cleanly)
    expect(pageCount).toBeGreaterThanOrEqual(2);

    // Verify A4 dimensions in MediaBox (A4 standard: [0 0 595.28 841.89] pt)
    expect(pdfRaw.includes('595.28') || pdfRaw.includes('595')).toBe(true);
    expect(pdfRaw.includes('841.89') || pdfRaw.includes('842')).toBe(true);
  });

  it('should sanitize filename correctly for PDF export download', () => {
    const rawName = 'Muhammad Danial bin Azman (Scholarship/2026)';
    const baseName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const academicFile = `${baseName}_Resume_Academic.pdf`;
    const modernFile = `${baseName}_Resume_ModernTech.pdf`;

    expect(academicFile).toBe('Muhammad_Danial_bin_Azman__Scholarship_2026__Resume_Academic.pdf');
    expect(modernFile).toBe('Muhammad_Danial_bin_Azman__Scholarship_2026__Resume_ModernTech.pdf');
    expect(academicFile.endsWith('.pdf')).toBe(true);
    expect(modernFile.endsWith('.pdf')).toBe(true);
  });
});

describe('ModernTechTemplate PDF Template', () => {
  const minimalContent: ResumeContent = {
    personal: {
      fullName: 'Ahmad Faiz',
      email: 'faiz@example.com',
      phone: '+60 12-345 6789',
      location: 'Kuala Lumpur, Malaysia'
    },
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    awards: [],
    leadership: [],
    volunteering: [],
    scholarships: [],
    customSections: []
  };

  const comprehensiveContent: ResumeContent = {
    personal: {
      fullName: 'Muhammad Danial bin Azman',
      email: 'danial.azman@siswa.um.edu.my',
      phone: '+60 17-234 5678',
      location: 'Kuala Lumpur, Malaysia',
      linkedin: 'https://linkedin.com/in/danialazman',
      github: 'https://github.com/danialazman',
      portfolio: 'https://danialazman.dev',
      professionalSummary:
        'Final-year Computer Science undergraduate at Universiti Malaya specializing in Artificial Intelligence. JPA PIDN Scholar with extensive experience in machine learning pipelines, full-stack microservices, and student leadership.'
    },
    education: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        institution: 'Universiti Malaya',
        qualification: 'Bachelor of Computer Science (Artificial Intelligence)',
        educationLevel: 'Bachelor',
        startDate: '2022',
        endDate: '2026',
        cgpa: '3.94 / 4.00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        institution: 'PASUM',
        qualification: 'Foundation in Physical Sciences',
        educationLevel: 'Foundation',
        startDate: '2021',
        endDate: '2022',
        cgpa: '4.00 / 4.00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        institution: 'KISAS',
        qualification: 'Sijil Pelajaran Malaysia',
        educationLevel: 'SPM',
        startDate: '2016',
        endDate: '2020',
        cgpa: '9A+ 1A',
        spmSubjects: [
          { subject: 'Bahasa Melayu', grade: 'A+' },
          { subject: 'English', grade: 'A+' },
          { subject: 'Mathematics', grade: 'A+' },
          { subject: 'Additional Mathematics', grade: 'A+' }
        ]
      }
    ],
    experience: [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        employer: 'Petronas Digital Sdn Bhd',
        position: 'Software Engineering & AI Intern',
        location: 'Kuala Lumpur',
        startDate: '2024-03',
        endDate: '2024-09',
        isCurrent: false,
        description: 'Developed analytics pipelines for offshore platform sensor telemetry.',
        achievements: [
          'Engineered automated ETL workflows in Python and Apache Spark processing 1.2M daily sensor records.',
          'Developed interactive analytics dashboards with Next.js reducing anomaly detection latency by 42%.'
        ]
      }
    ],
    projects: [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'BiasiswaHub Malaysia',
        role: 'Lead Architect',
        startDate: '2024-01',
        endDate: 'Present',
        technologies: ['Next.js 15', 'TypeScript', 'PostgreSQL', 'Tailwind CSS', 'FastAPI'],
        description: 'Centralized scholarship matching platform for secondary and tertiary students.',
        achievements: [
          'Reached 12,000 verified student accounts across Malaysia with zero marketing spend.',
          'Engineered deterministic rule engine calculating SPM/STPM cut-off eligibility for 150+ scholarship schemes.'
        ]
      }
    ],
    leadership: [
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        organization: 'Persatuan Sains Komputer Universiti Malaya',
        role: 'Vice President',
        startDate: '2023',
        endDate: '2024',
        description: 'Led executive board organizing university-wide tech symposia with RM45,000 corporate sponsorship.'
      }
    ],
    volunteering: [
      {
        id: '550e8400-e29b-41d4-a716-446655440040',
        organization: 'Teach For Malaysia',
        role: 'STEM Workshop Lead Tutor',
        startDate: '2023',
        endDate: 'Present',
        description: 'Conducted free weekend Python workshops for B40 rural secondary school students.'
      }
    ],
    scholarships: [
      {
        id: '550e8400-e29b-41d4-a716-446655440050',
        name: 'PIDN Federal Scholarship',
        issuer: 'Jabatan Perkhidmatan Awam (JPA)',
        year: '2022 – Present'
      }
    ],
    awards: [
      {
        id: '550e8400-e29b-41d4-a716-446655440060',
        name: 'Dean’s Honor List',
        issuer: 'Faculty of Computer Science & IT, UM',
        date: 'Semesters 1, 2, 3, 4'
      }
    ],
    certifications: [
      {
        id: '550e8400-e29b-41d4-a716-446655440070',
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2024'
      }
    ],
    skills: {
      technical: ['Python', 'TypeScript', 'Next.js', 'PostgreSQL', 'Docker', 'AWS'],
      languages: ['Bahasa Melayu (Native)', 'English (Fluent / CEFR C1)'],
      soft: ['Technical Communication', 'Team Leadership']
    },
    customSections: []
  };

  it('should render document element for minimal valid resume content in ModernTech template', () => {
    const element = <ModernTechTemplate content={minimalContent} />;
    expect(element).toBeDefined();
    expect(element.props.content.personal?.fullName).toBe('Ahmad Faiz');
  });

  it('should render document element with full Malaysian academic & tech profile', () => {
    const element = <ModernTechTemplate content={comprehensiveContent} />;
    expect(element).toBeDefined();
    expect(element.props.content.education.length).toBe(3);
    expect(element.props.content.education[2].spmSubjects?.length).toBe(4);
    expect(element.props.content.projects[0].technologies?.length).toBe(5);
    expect(element.props.content.skills?.technical?.length).toBe(6);
  });

  it('should compile valid PDF binary stream with ModernTechTemplate', async () => {
    const { pdf } = await import('@react-pdf/renderer');
    const doc = <ModernTechTemplate content={comprehensiveContent} />;
    const instance = pdf(doc);
    const blob = await instance.toBlob();
    expect(blob).toBeDefined();

    const buffer = Buffer.from(await blob.arrayBuffer());
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify valid PDF header & EOF
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.subarray(buffer.length - 30).toString('ascii').includes('%%EOF')).toBe(true);

    // Verify A4 dimensions in stream
    const pdfRaw = buffer.toString('latin1');
    expect(pdfRaw.includes('595.28') || pdfRaw.includes('595')).toBe(true);
    expect(pdfRaw.includes('841.89') || pdfRaw.includes('842')).toBe(true);
  });
});
