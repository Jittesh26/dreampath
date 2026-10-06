/**
 * DreamPath Interview Simulator Domain Engine
 *
 * Provides:
 * 1. Strict duplicate detection (exact and semantic/near-duplicate detection).
 * 2. Adaptive category coverage and scholarship-specific question banking.
 * 3. Honest, realistic answer evaluationrubrics.
 * 4. End-of-interview comprehensive report synthesis.
 * 5. State management and serialization.
 */

export type InterviewCategory =
  | 'introduction'
  | 'scholarship_motivation'
  | 'organisation_alignment'
  | 'project_experience'
  | 'problem_solving'
  | 'teamwork_conflict'
  | 'leadership_initiative'
  | 'failure_resilience'
  | 'career_vision'
  | 'situational_ethics';

export interface InterviewFeedback {
  clarityScore: number; // 1-10
  structureScore: number; // 1-10
  starMethodUsed: boolean;
  overallAssessment: string;
  strengths: string[]; // 2-4 points
  improvements: string[]; // 2-4 points
  interviewerImpression: string;
  improvementGuidance: string;
  sampleBetterAnswer?: string;
}

export interface InterviewRound {
  questionNumber: number;
  category: InterviewCategory;
  question: string;
  answer?: string;
  feedback?: InterviewFeedback;
}

export interface InterviewFinalReport {
  overallPerformance: string;
  strongestAreas: string[];
  areasToImprove: string[];
  communicationRating: string;
  answerQuality: string;
  specificityRating: string;
  professionalism: string;
  scholarshipMotivation: string;
  examplesAndEvidence: string;
  recommendedPracticeAreas: string[];
}

export interface QuestionBankItem {
  id: string;
  category: InterviewCategory;
  question: string;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'you', 'your', 'we', 'our', 'i', 'my', 'me', 'can', 'could',
  'would', 'should', 'do', 'does', 'did', 'please', 'tell', 'us', 'about',
  'share', 'what', 'why', 'how', 'when', 'where', 'which', 'who', 'this',
]);

const FILLER_PREFIXES = [
  /^please introduce yourself(?: and)?/i,
  /^could you introduce yourself(?: and)?/i,
  /^can you introduce yourself(?: and)?/i,
  /^tell us about/i,
  /^share with us/i,
  /^what inspired you to/i,
  /^why did you choose to/i,
  /^what attracted you to/i,
  /^why do you want to/i,
  /^could you explain/i,
  /^can you describe/i,
  /^describe a/i,
  /^walk us through/i,
];

/**
 * Normalizes question string for exact & token-level comparisons
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim().toLowerCase();
  for (const prefix of FILLER_PREFIXES) {
    cleaned = cleaned.replace(prefix, '').trim();
  }
  return cleaned
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts meaningful content tokens for similarity measurement
 */
export function extractContentTokens(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Calculates Jaccard token similarity (0.0 to 1.0)
 */
export function calculateTokenSimilarity(q1: string, q2: string): number {
  const set1 = extractContentTokens(q1);
  const set2 = extractContentTokens(q2);
  if (set1.size === 0 || set2.size === 0) return 0;

  let intersectionCount = 0;
  for (const item of set1) {
    if (set2.has(item)) intersectionCount++;
  }

  const unionSize = new Set([...set1, ...set2]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Intent classification patterns to catch semantically identical questions
 */
interface IntentPattern {
  category: InterviewCategory;
  intent: string;
  matcher: (text: string) => boolean;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    category: 'introduction',
    intent: 'self_intro',
    matcher: (t) => /introduce yourself|tell us about yourself|academic background|field of study/i.test(t),
  },
  {
    category: 'scholarship_motivation',
    intent: 'why_scholarship',
    matcher: (t) =>
      /(inspired you to apply|why did you choose|attracted you to|apply specifically for|pursue this scholarship)/i.test(
        t
      ),
  },
  {
    category: 'organisation_alignment',
    intent: 'why_organisation',
    matcher: (t) =>
      /(contribute to .* mission|alignment with .* values|role in shaping|role of the central bank|organization's vision)/i.test(
        t
      ),
  },
  {
    category: 'teamwork_conflict',
    intent: 'team_conflict',
    matcher: (t) =>
      /(disagreement with (a )?team|conflict within (your|a) team|difficult teammate|collaborat.* diverse perspectives)/i.test(
        t
      ),
  },
  {
    category: 'leadership_initiative',
    intent: 'leadership_action',
    matcher: (t) =>
      /(demonstrated leadership|took (personal )?initiative|stepped up to lead|beyond your coursework)/i.test(t),
  },
  {
    category: 'failure_resilience',
    intent: 'setback_resilience',
    matcher: (t) =>
      /(faced a failure|significant setback|constructive criticism|when things did not go as planned)/i.test(t),
  },
  {
    category: 'career_vision',
    intent: 'five_year_vision',
    matcher: (t) =>
      /(in five years|5 years|after graduation|long-term career|developing economy|future vision)/i.test(t),
  },
];

/**
 * Returns detected intent or null
 */
export function detectQuestionIntent(text: string): { category: InterviewCategory; intent: string } | null {
  for (const pattern of INTENT_PATTERNS) {
    if (pattern.matcher(text)) {
      return { category: pattern.category, intent: pattern.intent };
    }
  }
  return null;
}

/**
 * Checks whether candidate question is an exact, token-level, or intent-level duplicate of any existing question
 */
export function isExactOrSemanticDuplicate(candidate: string, existingQuestions: string[]): boolean {
  if (!candidate || existingQuestions.length === 0) return false;

  const candidateNorm = normalizeQuestionText(candidate);
  const candidateIntent = detectQuestionIntent(candidate);

  for (const existing of existingQuestions) {
    if (!existing) continue;

    // 1. Exact raw match (trimmed)
    if (candidate.trim().toLowerCase() === existing.trim().toLowerCase()) {
      return true;
    }

    // 2. Normalized prefix & punctuation match
    const existingNorm = normalizeQuestionText(existing);
    if (candidateNorm.length > 10 && candidateNorm === existingNorm) {
      return true;
    }

    // 3. High token overlap (> 0.55 Jaccard similarity)
    const tokenSim = calculateTokenSimilarity(candidate, existing);
    if (tokenSim >= 0.55) {
      return true;
    }

    // 4. Intent & category collision
    if (candidateIntent) {
      const existingIntent = detectQuestionIntent(existing);
      if (existingIntent && candidateIntent.intent === existingIntent.intent) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Scholarship Question Banks (Adaptive Fallback & Diverse Categories)
 */
export const SCHOLARSHIP_QUESTION_BANKS: Record<string, QuestionBankItem[]> = {
  'Gamuda Scholarship': [
    {
      id: 'gamuda-intro',
      category: 'introduction',
      question:
        'Welcome to the Gamuda Scholarship interview panel. Please introduce yourself, your academic background, and what drives your commitment to engineering, infrastructure, or environmental sustainability.',
    },
    {
      id: 'gamuda-motivation',
      category: 'scholarship_motivation',
      question:
        'What inspired you to apply specifically for the Gamuda Scholarship, and how do you see our nation-building engineering focus matching your aspirations?',
    },
    {
      id: 'gamuda-project',
      category: 'project_experience',
      question:
        'Can you discuss a specific technical project or extracurricular challenge you led, highlighting the hardest engineering or analytical obstacle you encountered and how you solved it?',
    },
    {
      id: 'gamuda-problem-solving',
      category: 'problem_solving',
      question:
        'Large-scale projects frequently encounter unexpected ground conditions or delays. Describe a time an academic or community project encountered a sudden disruption. How did you diagnose the root cause and adapt?',
    },
    {
      id: 'gamuda-teamwork',
      category: 'teamwork_conflict',
      question:
        'Tell us about a situation where you had to collaborate with team members holding sharply opposing viewpoints. How did you navigate the disagreement while delivering quality results?',
    },
    {
      id: 'gamuda-leadership',
      category: 'leadership_initiative',
      question:
        'Gamuda values proactive changemakers who do not wait for instructions. What is one concrete initiative you undertook outside school syllabus to solve an everyday problem?',
    },
    {
      id: 'gamuda-resilience',
      category: 'failure_resilience',
      question:
        'Walk us through a setback or critical feedback that was difficult to process. What specific lessons did you draw, and how did your execution change afterwards?',
    },
    {
      id: 'gamuda-vision',
      category: 'career_vision',
      question:
        'Where do you see yourself five years post-graduation within Malaysia’s sustainable infrastructure and digital transformation landscape?',
    },
  ],

  'Bank Negara Kijang Scholarship': [
    {
      id: 'bnm-intro',
      category: 'introduction',
      question:
        'Welcome to your mock panel for the Bank Negara Malaysia Kijang Scholarship. Please introduce yourself, your academic foundations, and why you are drawn to economics, finance, or public policy.',
    },
    {
      id: 'bnm-motivation',
      category: 'scholarship_motivation',
      question:
        'Why did you specifically choose the Kijang Scholarship, and how do you view the Central Bank’s mandate in fostering monetary stability and shared national prosperity?',
    },
    {
      id: 'bnm-project',
      category: 'project_experience',
      question:
        'Can you share an academic or analytical research project where you had to evaluate complex, incomplete data to formulate a recommendation?',
    },
    {
      id: 'bnm-ethics',
      category: 'situational_ethics',
      question:
        'Public service requires unwavering integrity. Describe an experience where you had to uphold fairness or ethical standards when it was personally inconvenient or unpopular.',
    },
    {
      id: 'bnm-teamwork',
      category: 'teamwork_conflict',
      question:
        'Describe a high-stakes group assignment where team members were under extreme pressure. How did you manage team dynamics and ensure intellectual rigor?',
    },
    {
      id: 'bnm-vision',
      category: 'career_vision',
      question:
        'In five years, what economic or socio-financial issue facing Malaysia do you hope to directly address as a Bank Negara scholar?',
    },
  ],

  'Petronas Education Sponsorship (PESP)': [
    {
      id: 'petronas-intro',
      category: 'introduction',
      question:
        'Welcome to your interview for the Petronas Education Sponsorship Programme. Please introduce yourself, your academic achievements, and your passion for your chosen degree.',
    },
    {
      id: 'petronas-motivation',
      category: 'scholarship_motivation',
      question:
        'What motivated you to apply for PESP, and how do you perceive PETRONAS’s transition toward sustainable energy and net zero carbon targets?',
    },
    {
      id: 'petronas-project',
      category: 'project_experience',
      question:
        'Describe a technical or community project you participated in where you had to innovate with limited resources or tight deadlines.',
    },
    {
      id: 'petronas-leadership',
      category: 'leadership_initiative',
      question:
        'PETRONAS values shared success. Give an example of a time you rallied your peers around a common goal when morale or participation was low.',
    },
    {
      id: 'petronas-resilience',
      category: 'failure_resilience',
      question:
        'Tell us about a time you made a significant mistake or failed to meet an expectation. How did you communicate the issue and rectify it?',
    },
    {
      id: 'petronas-vision',
      category: 'career_vision',
      question:
        'Upon completing your degree, how do you envision contributing to Malaysia’s industrial capability and technological self-reliance?',
    },
  ],

  'Yayasan Khazanah Global Scholarship': [
    {
      id: 'khazanah-intro',
      category: 'introduction',
      question:
        'Welcome to the Yayasan Khazanah mock interview panel. Please introduce yourself, your intellectual interests, and the personal ethos that drives your academic pursuit.',
    },
    {
      id: 'khazanah-motivation',
      category: 'scholarship_motivation',
      question:
        'Why have you chosen to apply for the Yayasan Khazanah Scholarship, and how does your intended study connect to Malaysia’s long-term socioeconomic advancement?',
    },
    {
      id: 'khazanah-leadership',
      category: 'leadership_initiative',
      question:
        'Khazanah seeks future leaders who think critically. Can you discuss a time when you challenged conventional thinking or proposed a novel solution to an established problem?',
    },
    {
      id: 'khazanah-teamwork',
      category: 'teamwork_conflict',
      question:
        'Tell us about a team experience where differing cultural or disciplinary perspectives created tension. How did you synthesize those views into a shared outcome?',
    },
    {
      id: 'khazanah-vision',
      category: 'career_vision',
      question:
        'Where do you envision yourself five to ten years into your career, and what systemic positive impact do you plan to create for our nation?',
    },
  ],

  'JPA Program Ijazah Dalam Negara (PIDN)': [
    {
      id: 'jpa-intro',
      category: 'introduction',
      question:
        'Selamat datang ke sesi temuduga JPA PIDN. Sila perkenalkan diri anda, latar belakang akademik, dan matlamat pendidikan anda di universiti awam tempatan.',
    },
    {
      id: 'jpa-motivation',
      category: 'scholarship_motivation',
      question:
        'Mengapakah anda memilih untuk memohon penajaan JPA, dan bagaimana anda merancang untuk berkhidmat kepada perkhidmatan awam atau pembangunan negara?',
    },
    {
      id: 'jpa-leadership',
      category: 'leadership_initiative',
      question:
        'Beri contoh penglibatan kokurikulum atau khidmat masyarakat di mana anda telah menunjukkan sifat kepimpinan yang berwibawa.',
    },
    {
      id: 'jpa-problem-solving',
      category: 'problem_solving',
      question:
        'Ceritakan situasi di mana anda terpaksa membuat keputusan kritikal di bawah kekangan masa yang mencabar.',
    },
    {
      id: 'jpa-vision',
      category: 'career_vision',
      question:
        'Apakah sumbangan utama yang ingin anda berikan kepada masyarakat Malaysia selepas menamatkan pengajian kelak?',
    },
  ],

  default: [
    {
      id: 'def-intro',
      category: 'introduction',
      question:
        'Welcome to your mock interview panel. Please introduce yourself, your academic background, and why you are passionate about this scholarship.',
    },
    {
      id: 'def-motivation',
      category: 'scholarship_motivation',
      question:
        'What specific factors motivated you to apply for this scholarship, and how does this sponsorship bridge your goals?',
    },
    {
      id: 'def-project',
      category: 'project_experience',
      question:
        'Share a standout project or extracurricular challenge where you demonstrated deep problem-solving skills and individual initiative.',
    },
    {
      id: 'def-teamwork',
      category: 'teamwork_conflict',
      question:
        'Tell us about a challenging team dynamic you experienced and how you constructively handled disagreements to achieve your goal.',
    },
    {
      id: 'def-resilience',
      category: 'failure_resilience',
      question:
        'Describe a time you encountered a significant setback or unexpected hurdle. How did you adapt your plan and persist?',
    },
    {
      id: 'def-vision',
      category: 'career_vision',
      question:
        'Looking ahead five years, how do you see yourself utilizing your education to contribute meaningfully to Malaysia’s development?',
    },
  ],
};

/**
 * Finds the matching bank for a given scholarship name
 */
export function getAdaptiveQuestionBank(scholarshipName: string): QuestionBankItem[] {
  if (SCHOLARSHIP_QUESTION_BANKS[scholarshipName]) {
    return SCHOLARSHIP_QUESTION_BANKS[scholarshipName];
  }
  for (const [key, bank] of Object.entries(SCHOLARSHIP_QUESTION_BANKS)) {
    if (scholarshipName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(scholarshipName.toLowerCase())) {
      return bank;
    }
  }
  return SCHOLARSHIP_QUESTION_BANKS.default;
}

/**
 * Selects next unused question from the bank, prioritizing unused categories and guaranteed zero duplicates
 */
export function selectNextUnusedQuestion(params: {
  scholarshipName: string;
  askedQuestions: string[];
  previousAnswer?: string;
}): { question: string; category: InterviewCategory } {
  const { scholarshipName, askedQuestions, previousAnswer } = params;
  const bank = getAdaptiveQuestionBank(scholarshipName);

  // Check if student mentioned a concrete project or initiative in their answer to craft a relevant contextual follow-up
  if (previousAnswer && previousAnswer.length > 30) {
    const lowerAns = previousAnswer.toLowerCase();
    const projectKeywords = ['project', 'built', 'developed', 'system', 'app', 'club', 'campusfind', 'competition', 'hackathon', 'research', 'experiment'];
    const hasProject = projectKeywords.some((k) => lowerAns.includes(k));

    if (hasProject) {
      const projectFollowUps = [
        `In your previous response, you highlighted your project experience. Could you elaborate on your specific personal contribution and the hardest technical decision you made?`,
        `You noted working on a project under challenging conditions. How did you validate that your solution effectively solved the problem for its intended users?`,
        `Reflecting on the project you mentioned, what is one major architectural or organizational mistake you made, and what did you learn from it?`,
      ];
      for (const f of projectFollowUps) {
        if (!isExactOrSemanticDuplicate(f, askedQuestions)) {
          return { question: f, category: 'project_experience' };
        }
      }
    }
  }

  // Iterate over bank and pick first non-duplicate question
  for (const item of bank) {
    if (!isExactOrSemanticDuplicate(item.question, askedQuestions)) {
      return { question: item.question, category: item.category };
    }
  }

  // If scholarship bank exhausted, check default bank
  for (const item of SCHOLARSHIP_QUESTION_BANKS.default) {
    if (!isExactOrSemanticDuplicate(item.question, askedQuestions)) {
      return { question: item.question, category: item.category };
    }
  }

  // Final fallback guaranteed unique
  const index = askedQuestions.length + 1;
  const dynamicFallback = `Looking ahead to your graduation, how will you leverage your degree to create measurable impact in your community and industry?`;
  if (!isExactOrSemanticDuplicate(dynamicFallback, askedQuestions)) {
    return { question: dynamicFallback, category: 'career_vision' };
  }

  return {
    question: `As question ${index} of this interview, what is an ethical challenge you expect to encounter in your future career, and how will you resolve it?`,
    category: 'situational_ethics',
  };
}

/**
 * Honest, constructive feedback generator for unit tests & fallback evaluation
 */
export function generateDeterministicFeedback(params: {
  question: string;
  answer: string;
  scholarshipName: string;
  providerName: string;
}): InterviewFeedback {
  const { answer, scholarshipName, providerName } = params;
  const trimmed = answer.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;

  const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(trimmed);
  const hasStarKeywords = /(situation|task|action|result|when i|i led|i created|i resolved|we achieved|the outcome)/i.test(
    trimmed
  );
  const mentionsProvider =
    trimmed.toLowerCase().includes(scholarshipName.toLowerCase()) ||
    trimmed.toLowerCase().includes(providerName.toLowerCase());

  // Assess depth honestly
  if (wordCount < 25) {
    return {
      clarityScore: 4,
      structureScore: 3,
      starMethodUsed: false,
      overallAssessment:
        'Your answer is too brief and lacks concrete substance. In a competitive scholarship interview, short generic assertions fail to demonstrate your genuine depth and preparation.',
      strengths: [
        'Directly attempted the prompt without going off-topic',
        'Tone is polite and conversational',
      ],
      improvements: [
        'Provide concrete evidence instead of general statements',
        'Use the STAR method (Situation, Task, Action, Result) to structure your narrative',
        'Quantify results or name specific projects, subjects, or initiatives',
      ],
      interviewerImpression:
        'The panel would likely find this response unprepared or superficial, leaving them unsure of your true capabilities and motivation.',
      improvementGuidance:
        'Flesh out your explanation with a specific real-world example from your academic or extracurricular journey. State what problem you solved and what measurable result you achieved.',
      sampleBetterAnswer:
        'I decided to apply for the Gamuda Scholarship because of its commitment to sustainable infrastructure. For instance, in my Form 5 robotics club, my team developed a low-cost automated irrigation model that reduced water wastage by 25%. This demonstrated to me how engineering directly impacts community sustainability, aligning with Gamuda’s vision.',
    };
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (hasStarKeywords) {
    strengths.push('Demonstrates structured narrative flow with clear personal actions taken');
  } else {
    improvements.push('Structure your answer more clearly using the STAR framework (Situation, Task, Action, Result)');
  }

  if (hasNumbers) {
    strengths.push('Included concrete evidence or quantifiable metrics that ground your accomplishments');
  } else {
    improvements.push('Incorporate quantifiable metrics (e.g. team size, timeline, percentage improvement) to validate your impact');
  }

  if (mentionsProvider) {
    strengths.push(`Clearly connected your response to ${providerName} and the specific scholarship objectives`);
  } else {
    improvements.push(`Explicitly connect your personal aspirations to ${providerName}’s core values or industry contributions`);
  }

  if (wordCount >= 70 && wordCount <= 220) {
    strengths.push('Well-calibrated length: detailed without becoming rambling or repetitive');
  } else if (wordCount > 220) {
    improvements.push('Aim for conciseness: avoid excessive preamble and keep your answer focused on key takeaways');
  }

  // Ensure 2-4 points for both
  if (strengths.length < 2) {
    strengths.push('Articulated genuine personal motivation without sounding overly rehearsed');
    strengths.push('Maintained a confident, professional interview tone throughout');
  }
  if (improvements.length < 2) {
    improvements.push('Elaborate on the long-term lessons learned rather than focusing solely on the immediate task');
  }

  const clarityScore = Math.min(10, Math.max(5, Math.round(5 + (wordCount > 40 ? 2 : 0) + (hasNumbers ? 2 : 0))));
  const structureScore = Math.min(10, Math.max(4, Math.round(5 + (hasStarKeywords ? 3 : 1) + (mentionsProvider ? 1 : 0))));

  return {
    clarityScore,
    structureScore,
    starMethodUsed: hasStarKeywords,
    overallAssessment:
      wordCount >= 60
        ? `A solid, articulate answer that addresses the core prompt. To stand out among top candidates, focus on tighter alignment with ${providerName}'s core values and clearer metric validation.`
        : `Your response provides a good foundation, but remains somewhat broad. Top scholarship interviewers look for concrete, vivid proof points rather than generalized claims.`,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    interviewerImpression:
      wordCount >= 60
        ? `The panel would view you as a capable and sincere candidate with authentic potential, though they may press for more technical depth or strategic vision.`
        : `The panel would view you favorably but would likely ask follow-up questions to verify whether you have hands-on experience backing your statements.`,
    improvementGuidance:
      'Practice framing each response with a 1-sentence headline answer, followed by 2-3 sentences of concrete evidence, and finishing with how that experience prepares you to excel as a scholar.',
    sampleBetterAnswer: undefined,
  };
}

/**
 * Generates comprehensive final report at end of interview
 */
export function generateDeterministicFinalReport(
  rounds: InterviewRound[],
  scholarshipName: string
): InterviewFinalReport {
  const totalRounds = rounds.length;
  const answeredRounds = rounds.filter((r) => r.answer && r.answer.trim().length > 0);
  const avgClarity =
    answeredRounds.reduce((acc, r) => acc + (r.feedback?.clarityScore || 7), 0) /
    (answeredRounds.length || 1);
  const avgStructure =
    answeredRounds.reduce((acc, r) => acc + (r.feedback?.structureScore || 7), 0) /
    (answeredRounds.length || 1);

  const starUsedCount = answeredRounds.filter((r) => r.feedback?.starMethodUsed).length;

  return {
    overallPerformance: `Completed ${totalRounds} practice interview rounds for ${scholarshipName}. You demonstrated consistent engagement, good academic clarity, and clear foundational passion for your chosen degree.`,
    strongestAreas: [
      'Genuine enthusiasm and clear academic motivation',
      'Consistent engagement across behavioral and motivational interview categories',
      starUsedCount > 1
        ? 'Effective utilization of structured storytelling across multiple rounds'
        : 'Polite, professional communication tone appropriate for corporate scholarship panels',
    ],
    areasToImprove: [
      'Incorporate more verifiable quantitative metrics (e.g. numbers, timeline, measurable impact) into your project narratives',
      'Deepen explicit knowledge of the sponsor foundation’s core initiatives and ESG commitments',
      'Synthesize key takeaways concisely to prevent unnecessary preamble',
    ],
    communicationRating: avgClarity >= 8 ? 'Strong & Articulate' : 'Clear & Developing',
    answerQuality: avgStructure >= 8 ? 'Well-Structured & Evidence-Based' : 'Thoughtful with room for greater specificity',
    specificityRating: answeredRounds.some((r) => /\b\d+\b/.test(r.answer || ''))
      ? 'Good empirical grounding'
      : 'Moderate — needs more concrete names, dates, and metrics',
    professionalism: 'High — respectful, authentic, and forward-looking',
    scholarshipMotivation: `Authentic alignment demonstrated with the mission of ${scholarshipName}.`,
    examplesAndEvidence: `${starUsedCount} of ${totalRounds} answers demonstrated STAR method storytelling structure.`,
    recommendedPracticeAreas: [
      'Prepare 3 go-to signature stories (1 technical project, 1 teamwork conflict, 1 personal setback) using the STAR framework',
      `Review ${scholarshipName}'s official newsroom and impact reports to reference specific ongoing initiatives during the actual panel`,
      'Practice timed verbal responses (60 to 90 seconds) to build concise delivery under panel pressure',
    ],
  };
}
