import { describe, it, expect } from 'vitest';
import {
  aiDiscoverFilters,
  aiGroundedScholarshipQA,
  aiExtractAcademicData,
  aiCompareScholarships,
  aiEssayAssistant,
  aiInterviewSimulator,
} from '../gemini-service';

describe('Gemini Intelligence Service', () => {
  describe('aiDiscoverFilters', () => {
    it('extracts degree and engineering filters from query', async () => {
      const res = await aiDiscoverFilters('I am a computer science student with 3.80 CGPA looking for degree scholarships');
      expect(res.studyLevel).toBe('Undergraduate Degree');
      expect(res.fieldOfStudy).toBe('Computer Science / Tech');
      expect(res.minCgpa).toBe(3.80);
    });

    it('identifies provider alias like JPA and B40', async () => {
      const res = await aiDiscoverFilters('b40 student looking for JPA sponsorship');
      expect(res.b40Only).toBe(true);
      expect(res.providerName).toBe('JPA');
    });
  });

  describe('aiGroundedScholarshipQA', () => {
    it('returns answer grounded in verified intake and lists sources used', async () => {
      const res = await aiGroundedScholarshipQA({
        question: 'When is the deadline?',
        scholarshipName: 'Gamuda Scholarship 2026',
        providerName: 'Gamuda Berhad',
        description: 'Undergraduate engineering scholarship',
        sourceUrl: 'https://gamuda.com.my',
        openDate: '1 March 2026',
        closeDate: '30 April 2026',
        requirementsSummary: ['CGPA >= 3.50', 'Malaysian Citizen'],
      });

      expect(res.answer).toBeDefined();
      expect(res.sourcesUsed.length).toBeGreaterThan(0);
      expect(res.canConfirm).toBe(true);
    });
  });

  describe('aiExtractAcademicData', () => {
    it('extracts SPM grades and CGPA accurately from transcript text', async () => {
      const text = `
        SLIP KEPUTUSAN PEPERIKSAAN SPM
        Bahasa Melayu: A+
        English: A
        Mathematics: A+
        Additional Mathematics: A-
        CGPA: 3.85
      `;
      const res = await aiExtractAcademicData(text);
      expect(res.cgpa).toBe('3.85');
      expect(res.spmGrades['Bahasa Melayu']).toBe('A+');
      expect(res.spmGrades['Mathematics']).toBe('A+');
      expect(res.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('aiCompareScholarships', () => {
    it('returns structured highlights for multiple scholarships', async () => {
      const res = await aiCompareScholarships([
        {
          name: 'Gamuda Scholarship',
          provider: 'Gamuda',
          description: 'Engineering and IT scholarship',
          closeDate: '30 April 2026',
          requirements: ['CGPA 3.50'],
        },
        {
          name: 'PESP',
          provider: 'PETRONAS',
          description: 'Global energy sponsorship',
          closeDate: '15 May 2026',
          requirements: ['SPM 8A'],
        },
      ]);

      expect(res.summary).toBeDefined();
      expect(res.tableHighlights.length).toBeGreaterThan(0);
    });
  });

  describe('aiEssayAssistant', () => {
    it('provides structured paragraph guidance for scholarship essays', async () => {
      const res = await aiEssayAssistant({
        action: 'brainstorm',
        scholarshipName: 'Yayasan Khazanah Global Scholarship',
        providerName: 'Yayasan Khazanah',
        essayPrompt: 'Personal statement on nation building',
      });

      expect(res.feedback).toBeDefined();
      expect(res.suggestedOutline).toBeDefined();
    });
  });

  describe('aiInterviewSimulator', () => {
    it('evaluates answers using STAR method criteria', async () => {
      const res = await aiInterviewSimulator({
        action: 'evaluate_answer',
        scholarshipName: 'Bank Negara Kijang Scholarship',
        providerName: 'Bank Negara Malaysia',
        questionHistory: [
          { role: 'interviewer', content: 'Why did you choose economics?' },
        ],
        currentAnswer: 'I founded the school economics club and led an outreach campaign raising RM 5,000 for financial literacy.',
      });

      expect(res.feedback).toBeDefined();
      expect(res.feedback?.clarityScore).toBeGreaterThanOrEqual(1);
    });
  });
});
