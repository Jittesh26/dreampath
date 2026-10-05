import { describe, it, expect } from 'vitest';
import { extractScholarshipDraftFromText } from '../scholarship-extractor';

describe('AI Scholarship Ingestion & Extraction Safety', () => {
  const sampleGuidelineText = `
    YAYASAN PENERAJU SPECIALIST SCHOLARSHIP 2026
    Official Announcement by Yayasan Peneraju Pendidikan Bumiputera (https://yayasanpeneraju.com.my)
    
    Overview:
    The programme provides full sponsorship covering tuition fees and monthly subsistence allowance for Bumiputera students pursuing professional accounting and engineering degrees. Successful recipients will undergo structured development and career mentoring.
    
    Key Dates:
    Application Opens: 2026-04-01
    Application Deadline: 2026-08-31
    
    Eligibility Requirements:
    1. Must be a Malaysian Citizen and Bumiputera.
    2. Minimum academic qualification of CGPA 3.50 or STPM 3A.
    3. Maximum age 25 years old at point of application.
    4. Household income within B40 or M40 bracket.
    
    Selection Process (Post-Application):
    Stage 1: Document Screening
    Stage 2: Online Aptitude Assessment
    Stage 3: Interview with Selection Board
  `;

  it('correctly maps extracted text to deterministic eligibility rules and separate selection stages', async () => {
    const draft = await extractScholarshipDraftFromText(
      sampleGuidelineText,
      'https://yayasanpeneraju.com.my/specialist-2026'
    );

    expect(draft.sourceUrl).toBe('https://yayasanpeneraju.com.my/specialist-2026');
    expect(draft.name.value).toBeDefined();
    expect(draft.eligibilityAst).toBeDefined();
    expect(draft.eligibilityAst.type).toBe('ALL');

    // Selection stages must be preserved separately
    expect(draft.selectionStages).toBeDefined();
    expect(draft.selectionStages.length).toBeGreaterThanOrEqual(1);

    // Verify selection stages do not pollute the eligibility questionnaire
    for (const stage of draft.selectionStages) {
      expect(['interview', 'online_assessment', 'document_verification', 'selection_camp', 'final_award']).toContain(stage.type);
    }
  });

  it('marks missing dates as needing verification rather than guessing or fabricating them', async () => {
    const textWithoutDates = `
      CSR CHARITY DEGREE GRANT
      Offered by XYZ Corporation. Full degree tuition assistance for engineering students.
      Applicants must be Malaysian with CGPA 3.00.
    `;

    const draft = await extractScholarshipDraftFromText(
      textWithoutDates,
      'https://xyz-corp.com/grant'
    );

    // If closing date is not in text, sourceFound must be false and notes must indicate verification needed
    expect(draft.closeDate.sourceFound).toBe(false);
    expect(draft.closeDate.notes).toContain('Needs verification');
  });
});
