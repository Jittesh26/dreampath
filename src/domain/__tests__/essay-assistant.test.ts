import { describe, it, expect } from 'vitest';
import {
  calculateTextMetrics,
  validateEssayInput,
  getPromptConfig,
  generateDeterministicEssayGuidance,
} from '../essay-assistant';

describe('DreamPath Essay Assistant — Input Validation & Text Metrics', () => {
  it('1. Correctly calculates word and character counts dynamically', () => {
    const text = 'I built an automated irrigation system for my high school garden.';
    const metrics = calculateTextMetrics(text);
    expect(metrics.words).toBe(11);
    expect(metrics.characters).toBe(text.length);

    // Empty and whitespace cases
    expect(calculateTextMetrics('').words).toBe(0);
    expect(calculateTextMetrics('   \n  \t  ').words).toBe(0);
    expect(calculateTextMetrics('word').words).toBe(1);
  });

  it('2. Rejects empty, whitespace-only, and excessively brief drafts', () => {
    const emptyRes = validateEssayInput('', 'Gamuda Scholarship prompt');
    expect(emptyRes.isValid).toBe(false);
    expect(emptyRes.errorMessage).toContain('Add some notes');

    const whitespaceRes = validateEssayInput('   \n\t  ', 'Gamuda Scholarship prompt');
    expect(whitespaceRes.isValid).toBe(false);

    const tooShortRes = validateEssayInput('hi', 'Gamuda Scholarship prompt');
    expect(tooShortRes.isValid).toBe(false);
    expect(tooShortRes.errorMessage).toContain('too brief');
  });

  it('3. Rejects missing prompt or excessively long drafts exceeding safety limits', () => {
    const noPromptRes = validateEssayInput('Valid draft here with sufficient text', '');
    expect(noPromptRes.isValid).toBe(false);

    const longDraft = 'a '.repeat(16000);
    const longRes = validateEssayInput(longDraft, 'Valid prompt');
    expect(longRes.isValid).toBe(false);
    expect(longRes.errorMessage).toContain('maximum analysis length');
  });

  it('4. Accepts valid draft notes and drafts', () => {
    const validDraft =
      'I have always had an interest in computer science and built a lost-and-found portal for my campus.';
    const validRes = validateEssayInput(validDraft, 'Explain your passion');
    expect(validRes.isValid).toBe(true);
    expect(validRes.errorMessage).toBeUndefined();
  });
});

describe('DreamPath Essay Assistant — Anti-Hallucination & Grounding', () => {
  it('5. Uses the exact scholarship prompt without fabricating hidden criteria', () => {
    const gamudaConfig = getPromptConfig('Gamuda Scholarship');
    expect(gamudaConfig.prompt).toBe(
      'Explain your passion for engineering or built environment and how you will drive sustainable infrastructure.'
    );
    expect(gamudaConfig.wordLimit).toBe(500);

    const guidance = generateDeterministicEssayGuidance({
      action: 'structure',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: gamudaConfig.prompt,
      studentDraft: 'I want to build bridges and roads in Malaysia.',
    });

    expect(guidance.essayPrompt).toBe(gamudaConfig.prompt);
    expect(guidance.scholarshipName).toBe('Gamuda Scholarship');
  });

  it('6. Does NOT invent achievements or claim experience that the student did not write', () => {
    const sparseDraft = 'I want to study civil engineering because I find buildings interesting.';
    const guidance = generateDeterministicEssayGuidance({
      action: 'structure',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion for engineering and how you will drive sustainable infrastructure.',
      studentDraft: sparseDraft,
    });

    // Should indicate that evidence/projects are MISSING, rather than inventing them
    const projectSection = guidance.structureEvaluation.find((s) => s.section.includes('Evidence'));
    expect(projectSection?.status).toBe('missing');
    expect(projectSection?.feedback).toContain('Not currently supported by your draft');

    // Prompt coverage should list missing sustainability connection
    expect(
      guidance.promptCoverage.needsSupport.some((ns) => ns.toLowerCase().includes('sustainable'))
    ).toBe(true);
  });

  it('7. Recognizes when the student actually provides genuine project evidence and metrics', () => {
    const richDraft =
      'During my Form 5 year, I co-founded our school robotics club where our team of 4 built an automated hydroponics monitor. We integrated dual pH and moisture sensors that cut nutrient solution waste by 30%. This practical experience confirmed my ambition to join Gamuda in developing sustainable urban infrastructure.';

    const guidance = generateDeterministicEssayGuidance({
      action: 'structure',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion for engineering and how you will drive sustainable infrastructure.',
      studentDraft: richDraft,
    });

    // Should mark evidence as covered
    const projectSection = guidance.structureEvaluation.find((s) => s.section.includes('Evidence'));
    expect(projectSection?.status).toBe('covered');

    // Should mark sustainability as covered
    expect(
      guidance.promptCoverage.covered.some((c) => c.toLowerCase().includes('sustainable'))
    ).toBe(true);

    // Readiness should reflect strong/good foundation rather than needs development
    expect(guidance.readiness).not.toBe('needs_development');
  });
});

describe('DreamPath Essay Assistant — Three Advisory Modes & Iterative Review', () => {
  it('8. Mode A (Brainstorm): Provides probing questions to help student discover authentic stories', () => {
    const draft = 'I am thinking about writing about robotics or my science fair project.';
    const brainstormRes = generateDeterministicEssayGuidance({
      action: 'brainstorm',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion for engineering',
      studentDraft: draft,
    });

    expect(brainstormRes.mode).toBe('brainstorm');
    expect(brainstormRes.probingQuestions.length).toBeGreaterThanOrEqual(2);
    expect(brainstormRes.suggestedOutline.length).toBeGreaterThanOrEqual(3);
  });

  it('9. Mode C (Polish): Identifies cliché scholarship language and recommends authentic alternatives', () => {
    const clicheDraft =
      'I am deeply passionate about engineering and aspire to make a meaningful impact in society since I was a child.';
    const polishRes = generateDeterministicEssayGuidance({
      action: 'review',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion',
      studentDraft: clicheDraft,
    });

    expect(polishRes.mode).toBe('review');
    expect(polishRes.toneAndClarityIssues.length).toBeGreaterThan(0);
    expect(
      polishRes.toneAndClarityIssues.some((t) => t.originalSnippet.includes('deeply passionate'))
    ).toBe(true);
  });

  it('10. Supports iterative review: analyzed updated draft reflects new draft contents', () => {
    const draft1 = 'I like civil engineering.';
    const res1 = generateDeterministicEssayGuidance({
      action: 'structure',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion',
      studentDraft: draft1,
    });

    expect(res1.readiness).toBe('needs_development');

    // Student iterates on draft based on feedback
    const draft2 =
      'In 2025, I led a school flood-warning sensor initiative (Situation). We assembled low-cost ultrasonic water level sensors (Action) that alerted 200 nearby residents during flash floods (Result). This sparked my long-term ambition to work with Gamuda on MRT underground tunneling drainage.';

    const res2 = generateDeterministicEssayGuidance({
      action: 'structure',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion',
      studentDraft: draft2,
    });

    expect(res2.readiness).toBe('strong_draft');
    expect(res2.promptCoverage.covered.length).toBeGreaterThan(res1.promptCoverage.covered.length);
  });

  it('11. Brainstorm mode invariant: raw bullet points or brainstorming notes never evaluate as strong_draft', () => {
    const rawNotes =
      '• Built robotics flood alarm project with 5 team members in 2025\n• Won 1st place in state competition\n• Want to apply to Gamuda Scholarship for civil engineering and sustainable tunneling';

    const brainstormRes = generateDeterministicEssayGuidance({
      action: 'brainstorm',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion for engineering and sustainable infrastructure',
      studentDraft: rawNotes,
    });

    // Invariant: brainstorm mode should never evaluate as strong_draft
    expect(brainstormRes.readiness).not.toBe('strong_draft');
    expect(brainstormRes.readiness).toBe('good_foundation');
    expect(brainstormRes.readinessLabel).toContain('Ideation');
    expect(brainstormRes.brainstormData).toBeDefined();
    expect(brainstormRes.brainstormData?.strongIdeas.length).toBeGreaterThan(0);
    expect(brainstormRes.brainstormData?.experiencesToExpand.length).toBeGreaterThan(0);
    expect(brainstormRes.brainstormData?.possibleAngles.length).toBeGreaterThan(0);
  });

  it('12. Populates distinct mode-specific structures for structure and review modes', () => {
    const draft =
      'In 2025, I led a school flood-warning sensor initiative. We assembled low-cost ultrasonic water level sensors that alerted 200 nearby residents. I aspire to join Gamuda to drive sustainable drainage infrastructure.';

    const structureRes = generateDeterministicEssayGuidance({
      action: 'structure',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion',
      studentDraft: draft,
    });
    expect(structureRes.structureData).toBeDefined();
    expect(structureRes.structureData?.paragraphBalance).toBeDefined();
    expect(structureRes.structureData?.flowAnalysis.length).toBeGreaterThan(0);

    const reviewRes = generateDeterministicEssayGuidance({
      action: 'review',
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
      essayPrompt: 'Explain your passion',
      studentDraft: draft,
    });
    expect(reviewRes.reviewData).toBeDefined();
    expect(reviewRes.reviewData?.toneAssessment).toBeDefined();
    expect(reviewRes.reviewData?.polishChecklist.length).toBeGreaterThan(0);
  });
});
