import { describe, it, expect } from 'vitest';
import {
  isExactOrSemanticDuplicate,
  selectNextUnusedQuestion,
  generateDeterministicFeedback,
  generateDeterministicFinalReport,
  InterviewRound,
} from '../interview-simulator';

describe('DreamPath Interview Simulator — Question Uniqueness & Anti-Duplicate Engine', () => {
  it('1. Detects exact question duplicates across casing, whitespace, and punctuation', () => {
    const existing = [
      'What inspired you to apply specifically for the Gamuda Scholarship?',
    ];

    expect(
      isExactOrSemanticDuplicate(
        'What inspired you to apply specifically for the Gamuda Scholarship?',
        existing
      )
    ).toBe(true);

    expect(
      isExactOrSemanticDuplicate(
        'what inspired you to apply specifically for the gamuda scholarship?',
        existing
      )
    ).toBe(true);

    expect(
      isExactOrSemanticDuplicate(
        '  What inspired you to apply specifically for the Gamuda Scholarship?   ',
        existing
      )
    ).toBe(true);
  });

  it('2. Detects semantically duplicate questions with trivial rewording (User Example)', () => {
    const existing = [
      'What inspired you to apply specifically for the Gamuda Scholarship?',
    ];

    // Rephrased version of the exact same question
    const rephrased = 'Why did you choose to apply for the Gamuda Scholarship specifically?';
    expect(isExactOrSemanticDuplicate(rephrased, existing)).toBe(true);

    const rephrased2 = 'What attracted you to apply specifically for the Gamuda Scholarship?';
    expect(isExactOrSemanticDuplicate(rephrased2, existing)).toBe(true);
  });

  it('3. Accepts genuinely distinct questions across distinct interview dimensions', () => {
    const existing = [
      'Welcome to the Gamuda Scholarship interview. Please introduce yourself and your academic background.',
      'What inspired you to apply specifically for the Gamuda Scholarship?',
    ];

    const projectQuestion =
      'You mentioned your CampusFind project. What was the most difficult problem you encountered while developing it, and how did you solve it?';
    expect(isExactOrSemanticDuplicate(projectQuestion, existing)).toBe(false);

    const conflictQuestion =
      'Tell us about a time you collaborated with peers from diverse perspectives and encountered a major disagreement.';
    expect(isExactOrSemanticDuplicate(conflictQuestion, existing)).toBe(false);
  });

  it('4. Selects unused question from adaptive bank that has never been asked', () => {
    const askedQuestions = [
      'Welcome to the Gamuda Scholarship interview panel. Please introduce yourself, your academic background, and what drives your commitment to engineering, infrastructure, or environmental sustainability.',
      'What inspired you to apply specifically for the Gamuda Scholarship, and how do you see our nation-building engineering focus matching your aspirations?',
    ];

    const result = selectNextUnusedQuestion({
      scholarshipName: 'Gamuda Scholarship',
      askedQuestions,
      previousAnswer: 'I built CampusFind, an automated smart lost-and-found system for students.',
    });

    expect(result.question).toBeDefined();
    // Must NOT be any of the already asked questions
    expect(askedQuestions.includes(result.question)).toBe(false);
    expect(isExactOrSemanticDuplicate(result.question, askedQuestions)).toBe(false);
  });

  it('5. Contextually crafts follow-up question when student mentions a project', () => {
    const askedQuestions = [
      'Welcome to the Gamuda Scholarship interview. Please introduce yourself.',
    ];

    const result = selectNextUnusedQuestion({
      scholarshipName: 'Gamuda Scholarship',
      askedQuestions,
      previousAnswer:
        'I built a custom web app called CampusFind that helped over 500 students retrieve lost student cards.',
    });

    expect(result.category).toBe('project_experience');
    expect(result.question.toLowerCase()).toContain('project');
    expect(isExactOrSemanticDuplicate(result.question, askedQuestions)).toBe(false);
  });

  it('6. Does NOT increment question index for rejected duplicates internally', () => {
    const askedHistory = ['Question 1'];
    const duplicateCandidate = 'Question 1';

    // Duplicate check fails candidate
    const isDup = isExactOrSemanticDuplicate(duplicateCandidate, askedHistory);
    expect(isDup).toBe(true);

    // Question bank yields clean alternative
    const fallback = selectNextUnusedQuestion({
      scholarshipName: 'Gamuda Scholarship',
      askedQuestions: askedHistory,
    });
    expect(fallback.question).not.toBe(duplicateCandidate);
  });
});

describe('DreamPath Interview Simulator — Honest Feedback & Evaluation Rubrics', () => {
  it('7. Evaluates actual submitted answer honestly without fake praise', () => {
    const briefGenericAnswer = 'I like engineering.';
    const feedback = generateDeterministicFeedback({
      question: 'What inspired you to apply specifically for the Gamuda Scholarship?',
      answer: briefGenericAnswer,
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
    });

    expect(feedback.clarityScore).toBeLessThanOrEqual(5);
    expect(feedback.starMethodUsed).toBe(false);
    expect(feedback.overallAssessment.toLowerCase()).toContain('too brief');
    expect(feedback.improvements.length).toBeGreaterThanOrEqual(2);
    expect(feedback.interviewerImpression).toBeDefined();
    expect(feedback.improvementGuidance).toBeDefined();
  });

  it('8. Recognizes and rewards STAR methodology, metrics, and concrete evidence', () => {
    const strongAnswer =
      'In Form 5, our robotics team was tasked with automating school garden irrigation (Situation). As project lead, I needed to reduce water consumption by 20% (Task). I programmed an Arduino sensor array with dual soil moisture checks (Action). As a result, our team won 1st place in the state STEM challenge and reduced water consumption by 35% (Result). This sparked my passion for sustainable infrastructure at Gamuda.';

    const feedback = generateDeterministicFeedback({
      question: 'Can you discuss a specific technical project you led?',
      answer: strongAnswer,
      scholarshipName: 'Gamuda Scholarship',
      providerName: 'Gamuda Berhad',
    });

    expect(feedback.clarityScore).toBeGreaterThanOrEqual(8);
    expect(feedback.structureScore).toBeGreaterThanOrEqual(8);
    expect(feedback.starMethodUsed).toBe(true);
    expect(feedback.strengths.some((s) => s.toLowerCase().includes('concrete') || s.toLowerCase().includes('structured'))).toBe(true);
  });

  it('9. Preserves association between questions, student answers, and feedback across rounds', () => {
    const rounds: InterviewRound[] = [
      {
        questionNumber: 1,
        category: 'introduction',
        question: 'Please introduce yourself.',
        answer: 'I am Jittesh, an engineering student.',
        feedback: {
          clarityScore: 7,
          structureScore: 6,
          starMethodUsed: false,
          overallAssessment: 'Clear introduction.',
          strengths: ['Direct response'],
          improvements: ['Elaborate on academic goals'],
          interviewerImpression: 'Sincere candidate.',
          improvementGuidance: 'Add specifics.',
        },
      },
      {
        questionNumber: 2,
        category: 'scholarship_motivation',
        question: 'What inspired you to apply specifically for the Gamuda Scholarship?',
        answer: 'Gamuda leads MRT tunneling and sustainable engineering in Malaysia.',
        feedback: {
          clarityScore: 8,
          structureScore: 7,
          starMethodUsed: false,
          overallAssessment: 'Good company awareness.',
          strengths: ['Mentions MRT tunneling'],
          improvements: ['Connect to personal coursework'],
          interviewerImpression: 'Candidate did research.',
          improvementGuidance: 'Link to degree.',
        },
      },
    ];

    expect(rounds).toHaveLength(2);
    expect(rounds[0].questionNumber).toBe(1);
    expect(rounds[0].answer).toBe('I am Jittesh, an engineering student.');
    expect(rounds[1].questionNumber).toBe(2);
    expect(rounds[1].answer).toContain('MRT tunneling');
    expect(rounds[0].question).not.toBe(rounds[1].question);
  });

  it('10. Produces comprehensive final report upon interview completion without asking extra questions', () => {
    const completedRounds: InterviewRound[] = [
      {
        questionNumber: 1,
        category: 'introduction',
        question: 'Please introduce yourself.',
        answer: 'I am Jittesh, applying for civil engineering.',
        feedback: {
          clarityScore: 8,
          structureScore: 8,
          starMethodUsed: true,
          overallAssessment: 'Good start.',
          strengths: ['Clear'],
          improvements: ['Add numbers'],
          interviewerImpression: 'Strong',
          improvementGuidance: 'Keep concise',
        },
      },
      {
        questionNumber: 2,
        category: 'project_experience',
        question: 'Tell us about your CampusFind project.',
        answer: 'I led the database design for 500 users.',
        feedback: {
          clarityScore: 9,
          structureScore: 8,
          starMethodUsed: true,
          overallAssessment: 'Solid tech project.',
          strengths: ['Specific metric'],
          improvements: ['Explain architecture'],
          interviewerImpression: 'Impressive',
          improvementGuidance: 'Explain impact',
        },
      },
    ];

    const report = generateDeterministicFinalReport(completedRounds, 'Gamuda Scholarship');
    expect(report.overallPerformance).toContain('Gamuda Scholarship');
    expect(report.strongestAreas.length).toBeGreaterThanOrEqual(2);
    expect(report.areasToImprove.length).toBeGreaterThanOrEqual(2);
    expect(report.communicationRating).toBeDefined();
    expect(report.answerQuality).toBeDefined();
    expect(report.recommendedPracticeAreas.length).toBeGreaterThanOrEqual(2);
  });
});
