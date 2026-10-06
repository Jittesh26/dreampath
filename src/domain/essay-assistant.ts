/**
 * DreamPath Scholarship Essay & Statement Assistant Domain Engine
 *
 * Core Principles:
 * 1. The student is the author. Never invent achievements, leadership, volunteering,
 *    awards, family hardships, or personal stories.
 * 2. Acts as an honest writing coach, reviewer, brainstorming guide, and editor.
 * 3. Clearly distinguishes between student-provided facts, student interpretations,
 *    and missing information.
 * 4. Grounded in the exact scholarship prompt.
 * 5. Provides qualitative readiness states (no fake probabilities).
 */

export type EssayMode = 'brainstorm' | 'structure' | 'review';

export type EssayReadiness = 'needs_development' | 'good_foundation' | 'strong_draft';

export interface PromptCoverageItem {
  criterion: string;
  isCovered: boolean;
  observation: string;
}

export interface StructureSectionEvaluation {
  section: string;
  status: 'covered' | 'partial' | 'missing';
  feedback: string;
}

export interface ToneAndClarityIssue {
  originalSnippet: string;
  issue: string;
  suggestedImprovement: string;
}

export interface EssayAssistantResponse {
  mode: EssayMode;
  scholarshipName: string;
  essayPrompt: string;
  readiness: EssayReadiness;
  readinessLabel: string;
  readinessDescription: string;
  overallAssessment: string;
  promptCoverage: {
    covered: string[];
    needsSupport: string[];
  };
  structureEvaluation: StructureSectionEvaluation[];
  flowIssues: string[];
  strengths: string[];
  actionableRecommendations: string[];
  probingQuestions: string[];
  suggestedOutline: string[];
  sampleDirection?: string;
  toneAndClarityIssues: ToneAndClarityIssue[];
  wordCountAnalysis?: string;
}

export interface ScholarshipPromptConfig {
  name: string;
  provider: string;
  prompt: string;
  wordLimit?: number;
  expectedThemes: string[];
}

export const VERIFIED_SCHOLARSHIP_PROMPTS: ScholarshipPromptConfig[] = [
  {
    name: 'Gamuda Scholarship',
    provider: 'Gamuda Berhad',
    prompt:
      'Explain your passion for engineering or built environment and how you will drive sustainable infrastructure.',
    wordLimit: 500,
    expectedThemes: [
      'Origin of passion for engineering/built environment',
      'Concrete academic or hands-on project evidence',
      'Understanding of sustainable infrastructure / ESG',
      'Future career contribution to Malaysia',
    ],
  },
  {
    name: 'Petronas Education Sponsorship (PESP)',
    provider: 'PETRONAS',
    prompt:
      'Describe an instance where you demonstrated leadership and adaptability in overcoming an unexpected setback.',
    wordLimit: 500,
    expectedThemes: [
      'Specific situation and unexpected setback (STAR method)',
      'Individual leadership actions taken',
      'Adaptability under pressure',
      'Key learnings and resilience applied moving forward',
    ],
  },
  {
    name: 'Yayasan Khazanah Global Scholarship',
    provider: 'Yayasan Khazanah',
    prompt:
      'How do you envision your contribution to Malaysia’s economic competitiveness over the next decade?',
    wordLimit: 750,
    expectedThemes: [
      'Academic foundation and intellectual curiosity',
      'Socioeconomic awareness of Malaysia’s challenges',
      'Concrete future vision and nation-building impact',
      'Alignment with Khazanah’s leadership ethos',
    ],
  },
  {
    name: 'Bank Negara Kijang Scholarship',
    provider: 'Bank Negara Malaysia',
    prompt:
      'Discuss an economic, technological, or financial challenge facing Malaysia and your proposed solution.',
    wordLimit: 500,
    expectedThemes: [
      'Clear definition of specific challenge',
      'Analytical depth and evidence-based reasoning',
      'Feasible, structured proposed solution',
      'Personal motivation to serve public interest',
    ],
  },
  {
    name: 'General Personal Statement',
    provider: 'Standard Malaysian Tertiary',
    prompt: 'Statement of Purpose / Personal Statement for Undergraduate Scholarship Applications',
    wordLimit: 1000,
    expectedThemes: [
      'Academic motivation and field selection',
      'Key projects, extracurriculars, or coursework highlights',
      'Personal values and resilience',
      'Long-term goals and social contribution',
    ],
  },
];

/**
 * Calculates words and character counts accurately
 */
export function calculateTextMetrics(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const characters = text.length;
  return { words, characters };
}

/**
 * Validates input before triggering expensive or unnecessary AI calls
 */
export function validateEssayInput(
  draft: string,
  prompt: string
): { isValid: boolean; errorMessage?: string } {
  if (!prompt || !prompt.trim()) {
    return {
      isValid: false,
      errorMessage: 'Please select or provide an essay prompt before analyzing.',
    };
  }

  const { words } = calculateTextMetrics(draft);

  if (words === 0) {
    return {
      isValid: false,
      errorMessage:
        'Add some notes, rough ideas, or a draft first so the assistant can analyze your writing.',
    };
  }

  if (draft.trim().length < 15) {
    return {
      isValid: false,
      errorMessage:
        'Your notes are too brief (less than 15 characters). Please provide a sentence or key bullet points to get meaningful coaching.',
    };
  }

  if (draft.length > 15000) {
    return {
      isValid: false,
      errorMessage:
        'Your draft exceeds the maximum analysis length (15,000 characters). Please analyze in sections.',
    };
  }

  return { isValid: true };
}

/**
 * Finds prompt configuration by scholarship name
 */
export function getPromptConfig(scholarshipName: string): ScholarshipPromptConfig {
  const matched = VERIFIED_SCHOLARSHIP_PROMPTS.find(
    (p) => p.name.toLowerCase() === scholarshipName.toLowerCase()
  );
  if (matched) return matched;
  return VERIFIED_SCHOLARSHIP_PROMPTS[VERIFIED_SCHOLARSHIP_PROMPTS.length - 1];
}

/**
 * Generates deterministic fallback coaching when Gemini is offline or in test environments.
 * Strictly adheres to zero fabrication and honest grounding in the student's actual text.
 */
export function generateDeterministicEssayGuidance(params: {
  action: EssayMode;
  scholarshipName: string;
  providerName: string;
  essayPrompt: string;
  studentDraft: string;
}): EssayAssistantResponse {
  const { action, scholarshipName, providerName, essayPrompt, studentDraft } = params;
  const config = getPromptConfig(scholarshipName);
  const { words } = calculateTextMetrics(studentDraft);
  const lowerDraft = studentDraft.toLowerCase();

  // Grounding checks on actual student text
  const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(studentDraft);
  const hasProject = /(project|built|developed|created|system|robotics|club|competition|research|tutored|led|organized|founded)/i.test(
    studentDraft
  );
  const hasFutureGoals = /(future|career|aspire|ambition|vision|hope to|plan to|after graduation|five years|contribute|goal|long-term)/i.test(
    studentDraft
  );
  const mentionsProvider =
    lowerDraft.includes(scholarshipName.toLowerCase()) ||
    lowerDraft.includes(providerName.toLowerCase()) ||
    (scholarshipName.includes('Gamuda') && lowerDraft.includes('gamuda')) ||
    (scholarshipName.includes('Petronas') && lowerDraft.includes('petronas')) ||
    (scholarshipName.includes('Bank Negara') && (lowerDraft.includes('bnm') || lowerDraft.includes('bank negara')));

  const mentionsSustainability = /(sustainab|green|infrastructure|drainage|environment|esg|energy|carbon|waste|renewable)/i.test(
    studentDraft
  );

  // Readiness State Determination
  let readiness: EssayReadiness = 'needs_development';
  let readinessLabel = 'Needs Development';
  let readinessDescription =
    'Your draft contains helpful initial ideas, but key prompt requirements are not yet supported by concrete personal examples.';

  if (words >= 35 && (hasProject || hasNumbers)) {
    if (mentionsProvider && (hasFutureGoals || mentionsSustainability)) {
      readiness = 'strong_draft';
      readinessLabel = 'Strong Draft';
      readinessDescription =
        'Your draft directly addresses the core prompt with personal evidence and good structural flow. Focus now on sentence polish and conciseness.';
    } else {
      readiness = 'good_foundation';
      readinessLabel = 'Good Foundation';
      readinessDescription =
        'Your draft addresses the primary topic, but certain sections need deeper personal proof points and tighter alignment with the scholarship objectives.';
    }
  } else if (words >= 20 && (hasProject || hasNumbers || mentionsProvider)) {
    readiness = 'good_foundation';
    readinessLabel = 'Good Foundation';
    readinessDescription =
      'Your draft provides a good starting point, but needs more concrete details and clearer alignment with the prompt.';
  }

  // Prompt Coverage
  const covered: string[] = [];
  const needsSupport: string[] = [];

  if (words >= 25) {
    covered.push('Initial motivation and field interest expressed');
  } else {
    needsSupport.push('Clear origin of personal motivation (how or why you became interested)');
  }

  if (hasProject) {
    covered.push('Specific project or practical experience referenced');
  } else {
    needsSupport.push('A concrete project, challenge, or real-life milestone demonstrating your abilities');
  }

  if (hasFutureGoals) {
    covered.push('Future goals or post-graduation vision stated');
  } else {
    needsSupport.push('Specific long-term contribution or career vision');
  }

  if (scholarshipName.includes('Gamuda')) {
    if (mentionsSustainability) {
      covered.push('Connection to sustainable infrastructure or environmental stewardship');
    } else {
      needsSupport.push(
        'Connection to sustainable infrastructure (the draft does not currently show how your work connects to sustainability)'
      );
    }
  }

  if (mentionsProvider) {
    covered.push(`Direct alignment with ${providerName}`);
  } else {
    needsSupport.push(`Explicit connection to ${providerName}’s core values or mission`);
  }

  // Strengths
  const strengths: string[] = [];
  if (hasProject) {
    strengths.push('References authentic experiences rather than relying solely on abstract assertions.');
  }
  if (hasNumbers) {
    strengths.push('Includes verifiable metrics or quantifiable data that ground your narrative.');
  }
  if (mentionsProvider) {
    strengths.push(`Demonstrates awareness of ${providerName} and the specific scholarship context.`);
  }
  if (strengths.length === 0) {
    strengths.push('Directly engages with the core essay prompt prompt without going off-topic.');
    strengths.push('Provides a clear starting point that can be fleshed out with your own real examples.');
  }

  // Actionable Recommendations (What is wrong? Why does it matter? What to do next?)
  const actionableRecommendations: string[] = [];
  if (!hasProject) {
    actionableRecommendations.push(
      'Your draft currently makes general claims about your passion without showing proof. Scholarship panels look for demonstrated interest: add one specific project, competition, or coursework experience from your own life where you applied these skills.'
    );
  }
  if (!hasNumbers && words > 50) {
    actionableRecommendations.push(
      'Your accomplishments would carry greater impact if quantified. Where possible, add real numbers (e.g. team size, timeline, percentage improvement, or number of people impacted).'
    );
  }
  if (!mentionsProvider) {
    actionableRecommendations.push(
      `Your draft does not yet connect your aspirations to ${providerName}. Explain specifically why this scholarship—rather than any generic sponsor—is the ideal partner for your educational journey.`
    );
  }
  if (actionableRecommendations.length < 2) {
    actionableRecommendations.push(
      'Review your paragraph transitions. Ensure each paragraph starts with a clear topic sentence that links smoothly to the preceding point.'
    );
  }

  // Probing Questions (to spark authentic student writing without hallucinating)
  const probingQuestions: string[] = [
    'What was the exact moment or problem that first triggered your curiosity in this field?',
    'What is one project or experiment you worked on that did not go as planned, and what did you personally do to resolve it?',
    `How do you hope your degree will enable you to solve a pressing challenge in Malaysia?`,
  ];

  // Flow Issues
  const flowIssues: string[] = [];
  if (lowerDraft.includes('deeply passionate') || lowerDraft.includes('since i was a child')) {
    flowIssues.push(
      'Contains generic scholarship cliches (e.g., "deeply passionate" or "since I was a child"). Replace these with a concrete milestone or problem you observed.'
    );
  }
  if (words < 50) {
    flowIssues.push('The draft is currently brief and relies on summary statements rather than detailed narrative.');
  }

  // Structure Evaluation
  const structureEvaluation: StructureSectionEvaluation[] = [
    {
      section: 'Opening & Hook',
      status: words > 30 ? 'covered' : 'partial',
      feedback:
        words > 30
          ? 'Introduces your topic. Ensure it opens with a vivid moment or problem rather than a generic statement.'
          : 'Opening is very brief; needs a clearer entry point into your journey.',
    },
    {
      section: 'Evidence & Project Milestones',
      status: hasProject ? 'covered' : 'missing',
      feedback: hasProject
        ? 'References concrete work. Ensure you detail your personal contribution rather than just what the team did.'
        : 'Not currently supported by your draft. Add a genuine experience from your own academic or extracurricular background.',
    },
    {
      section: 'Connection to Scholarship & Mission',
      status: mentionsProvider ? 'covered' : 'missing',
      feedback: mentionsProvider
        ? `Explicitly mentions ${providerName}.`
        : `Your draft does not currently explain why ${scholarshipName} is the right fit for your ambitions.`,
    },
    {
      section: 'Future Goals & Vision for Malaysia',
      status: hasFutureGoals ? 'covered' : 'partial',
      feedback: hasFutureGoals
        ? 'Outlines future aspirations.'
        : 'Needs a clearer, more grounded statement of how your studies will translate into societal or industry impact.',
    },
  ];

  // Suggested Paragraph Architecture
  const suggestedOutline: string[] = [
    'Paragraph 1 (The Hook): A specific moment or real-world problem that ignited your curiosity in this field.',
    'Paragraph 2 (The Proof Point): Detailed breakdown of a standout project or academic hurdle using the STAR framework.',
    'Paragraph 3 (The Alignment): Why this specific scholarship and how you connect to the sponsor’s mission.',
    'Paragraph 4 (The Vision): Concrete 5-year outlook on how you will contribute to Malaysia’s development.',
  ];

  // Tone & Clarity Checks
  const toneAndClarityIssues: ToneAndClarityIssue[] = [];
  if (lowerDraft.includes('i am deeply passionate')) {
    toneAndClarityIssues.push({
      originalSnippet: 'I am deeply passionate about...',
      issue: 'Overused clichéd phrasing that adds little substance.',
      suggestedImprovement: 'State the specific question, project, or problem that absorbs your attention instead.',
    });
  }
  if (lowerDraft.includes('make a meaningful impact')) {
    toneAndClarityIssues.push({
      originalSnippet: 'make a meaningful impact',
      issue: 'Vague assertion that lacks specific direction.',
      suggestedImprovement: 'Specify the exact industry, technology, or community group you want to advance.',
    });
  }

  // Word Count Analysis
  let wordCountAnalysis = `Current word count: ${words} words.`;
  if (config.wordLimit) {
    const diff = config.wordLimit - words;
    wordCountAnalysis += ` Target limit: ${config.wordLimit} words. (${
      diff >= 0 ? `${diff} words remaining` : `${Math.abs(diff)} words over limit`
    })`;
  }

  let overallAssessment = '';
  if (action === 'brainstorm') {
    overallAssessment = `Brainstorming analysis for ${scholarshipName}: Use the probing questions below to uncover real stories from your own life. Do not force generic corporate buzzwords; your genuine projects and honest reflections make the strongest impression.`;
  } else if (action === 'structure') {
    overallAssessment = `Structural review for ${scholarshipName}: Your draft has a ${readinessLabel.toLowerCase()} status. Check the prompt coverage below to see which requirements are well-supported and which still need real personal evidence.`;
  } else {
    overallAssessment = `Tone & clarity review for ${scholarshipName}: Aim for clean, active language that sounds like your authentic voice. Avoid inflated scholarship clichés and focus on clear, direct sentences.`;
  }

  return {
    mode: action,
    scholarshipName,
    essayPrompt,
    readiness,
    readinessLabel,
    readinessDescription,
    overallAssessment,
    promptCoverage: { covered, needsSupport },
    structureEvaluation,
    flowIssues,
    strengths,
    actionableRecommendations,
    probingQuestions,
    suggestedOutline,
    toneAndClarityIssues,
    wordCountAnalysis,
  };
}
