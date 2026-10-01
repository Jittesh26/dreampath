import { describe, it, expect } from 'vitest';
import { aiCompareScholarships } from '../gemini-service';

describe('Scholarship Comparison Intelligence', () => {
  const sampleScholarships = [
    {
      name: 'Gamuda Scholarship',
      provider: 'Gamuda',
      description: 'Full undergraduate scholarship covering tuition, living allowance, and development programs for Engineering.',
      closeDate: '2026-10-31',
      award: 'Full Scholarship (Tuition + Allowances)',
      tuitionCoverage: '100% Tuition Fees Covered',
      livingAllowance: 'Monthly Living Allowance Included',
      bond: 'No Service Bond (Work Free)',
      minCgpa: '≥ 3.3 CGPA',
      requirements: ['Malaysian Citizenship', 'Minimum 3.3 CGPA', 'Age ≤ 23'],
    },
    {
      name: 'Penang Future Foundation (PFF)',
      provider: 'Penang State Government',
      description: 'Penang State Government scholarship granting full tuition and monthly allowances to high-achieving STEM undergraduates.',
      closeDate: '2026-08-31',
      award: 'Full Scholarship (Tuition + Allowances)',
      tuitionCoverage: '100% Tuition Fees Covered',
      livingAllowance: 'Monthly Living Allowance Included',
      bond: 'Penang Industrial Work Commitment',
      minCgpa: '≥ 3.67 CGPA',
      requirements: ['Malaysian Citizenship', 'Minimum 3.67 CGPA', 'Penang Work Commitment'],
    },
  ];

  it('generates structured comparison output with key differences and per-scholarship analysis', async () => {
    const result = await aiCompareScholarships(sampleScholarships);

    expect(result).toHaveProperty('summary');
    expect(typeof result.summary).toBe('string');
    expect(Array.isArray(result.keyDifferences)).toBe(true);
    expect(result.keyDifferences.length).toBeGreaterThan(0);
    expect(Array.isArray(result.perScholarship)).toBe(true);
    expect(result.perScholarship).toHaveLength(2);
  });

  it('correctly contrasts CGPA differences between scholarships', async () => {
    const result = await aiCompareScholarships(sampleScholarships);
    const diffsJoined = result.keyDifferences.join(' ');

    // Must contrast Gamuda (3.3) vs PFF (3.67)
    expect(diffsJoined).toMatch(/3\.3/);
    expect(diffsJoined).toMatch(/3\.67/);
  });

  it('correctly contrasts bond differences between scholarships', async () => {
    const result = await aiCompareScholarships(sampleScholarships);
    const diffsJoined = result.keyDifferences.join(' ');

    expect(diffsJoined.toLowerCase()).toMatch(/bond|commitment/);
  });

  it('produces factual strengths and considerations without subjective bias', async () => {
    const result = await aiCompareScholarships(sampleScholarships);

    for (const item of result.perScholarship) {
      expect(item.strengths.length).toBeGreaterThan(0);
      expect(item.considerations.length).toBeGreaterThan(0);

      // Verify no subjective ranking superlatives
      const allText = [...item.strengths, ...item.considerations].join(' ').toLowerCase();
      expect(allText).not.toContain('better');
      expect(allText).not.toContain('best scholarship');
      expect(allText).not.toContain('overall winner');
    }
  });

  it('safely handles missing optional fields without throwing errors', async () => {
    const sparseScholarships = [
      {
        name: 'Sparse Scholarship A',
        provider: 'Provider A',
        description: '',
        closeDate: '2026-12-31',
      },
      {
        name: 'Sparse Scholarship B',
        provider: 'Provider B',
        description: '',
        closeDate: '2026-06-30',
      },
    ];

    const result = await aiCompareScholarships(sparseScholarships);
    expect(result).toBeDefined();
    expect(result.perScholarship).toHaveLength(2);
    expect(result.summary).toBeTruthy();
  });

  it('functions deterministically even when empty input is passed', async () => {
    const result = await aiCompareScholarships([]);
    expect(result).toBeDefined();
    expect(result.keyDifferences).toHaveLength(0);
  });
});
