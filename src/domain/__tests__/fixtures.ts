import { StudentProfile } from '../registry';
import { ScholarshipRequirement } from '../schema';

export const PROFILES: Record<string, StudentProfile> = {
  perfectB40Student: {
    id: 'p1',
    date_of_birth: '2006-05-10',
    citizenship: 'Malaysian',
    bumiputera_status: true,
    income_band: 'B40',
    household_income: 3000,
    cgpa: 4.0,
    spm_results: {
      'Mathematics': 'A+',
      'Science': 'A+',
      'English': 'A',
      'Bahasa Melayu': 'A+',
      'History': 'A-',
    }
  },
  averageM40Student: {
    id: 'p2',
    date_of_birth: '2005-02-15',
    citizenship: 'Malaysian',
    bumiputera_status: false,
    income_band: 'M40',
    household_income: 7000,
    cgpa: 3.2,
    spm_results: {
      'Mathematics': 'B',
      'Science': 'C+',
      'English': 'B+',
      'Bahasa Melayu': 'C',
    }
  },
  missingInfoStudent: {
    id: 'p3',
    date_of_birth: '2006-10-15',
    citizenship: 'Malaysian',
    // Missing bumiputera_status, income_band, cgpa, and spm_results
  }
};

export const REQUIREMENTS: Record<string, ScholarshipRequirement> = {
  jpaUndergrad: {
    id: 'req1',
    name: 'JPA Undergraduate Scholarship',
    rootNode: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
      ]
    }
  },
  corporateB40Engineering: {
    id: 'req2',
    name: 'Corporate B40 Engineering Scholarship',
    rootNode: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40'] },
        {
          type: 'ANY', // Must have A- or better in either Math OR Science
          nodes: [
            { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A-' } },
            { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Science', minGrade: 'A-' } },
          ]
        }
      ]
    }
  }
};
