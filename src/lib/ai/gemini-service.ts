import { aiRouter } from './router';
import { GoogleGenAI } from '@google/genai';

/**
 * Server-side Gemini AI Service for DreamPath
 * Adheres strictly to the DreamPath Architectural Rule:
 * The Authoritative Layer (database, verified rules, deterministic engine) is supreme.
 * The Intelligence Layer provides natural-language search, explanations, Q&A, and guidance.
 * All Gemini API calls are server-side only.
 */

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.NODE_ENV === 'test' || process.env.VITEST) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface DiscoveredFilter {
  query?: string;
  studyLevel?: string;
  fieldOfStudy?: string;
  b40Only?: boolean;
  minCgpa?: number;
  providerName?: string;
  summary: string;
}

/**
 * AI Scholarship Discovery:
 * Converts natural-language student queries into structured filter constraints.
 */
export async function aiDiscoverFilters(userPrompt: string): Promise<DiscoveredFilter> {
  const ai = getAIClient();
  const lower = userPrompt.toLowerCase();

  // Intelligent fallback parser if Gemini API key is absent or offline
  const fallbackFilter: DiscoveredFilter = {
    summary: 'Analyzed your profile criteria to match verified opportunities.',
  };

  if (lower.includes('degree') || lower.includes('undergraduate') || lower.includes('bachelor') || lower.includes('ijazah')) {
    fallbackFilter.studyLevel = 'Undergraduate Degree';
  } else if (lower.includes('diploma')) {
    fallbackFilter.studyLevel = 'Diploma';
  } else if (lower.includes('foundation') || lower.includes('asasi') || lower.includes('matrikulasi') || lower.includes('pre-u')) {
    fallbackFilter.studyLevel = 'Pre-University / Foundation';
  } else if (lower.includes('masters') || lower.includes('phd') || lower.includes('postgraduate')) {
    fallbackFilter.studyLevel = 'Postgraduate';
  } else if (lower.includes('spm')) {
    fallbackFilter.studyLevel = 'SPM Leaver';
  }

  if (lower.includes('engineering') || lower.includes('kejuruteraan')) {
    fallbackFilter.fieldOfStudy = 'Engineering';
  } else if (lower.includes('computer') || lower.includes('software') || lower.includes('tech') || lower.includes('it') || lower.includes('ai')) {
    fallbackFilter.fieldOfStudy = 'Computer Science / Tech';
  } else if (lower.includes('medicine') || lower.includes('medical') || lower.includes('doctor') || lower.includes('pharmacy')) {
    fallbackFilter.fieldOfStudy = 'Medicine / Healthcare';
  } else if (lower.includes('business') || lower.includes('accounting') || lower.includes('finance') || lower.includes('economics')) {
    fallbackFilter.fieldOfStudy = 'Business / Economics';
  }

  if (lower.includes('b40') || lower.includes('needy') || lower.includes('low income') || lower.includes('underprivileged')) {
    fallbackFilter.b40Only = true;
  }

  // Check CGPA mention
  const cgpaMatch = userPrompt.match(/(\d\.\d{1,2})/);
  if (cgpaMatch) {
    const val = parseFloat(cgpaMatch[1]);
    if (val >= 2.0 && val <= 4.0) {
      fallbackFilter.minCgpa = val;
    }
  }

  // Check provider alias
  if (lower.includes('gamuda')) fallbackFilter.providerName = 'Gamuda';
  else if (lower.includes('petronas')) fallbackFilter.providerName = 'PETRONAS';
  else if (lower.includes('jpa')) fallbackFilter.providerName = 'JPA';
  else if (lower.includes('bank rakyat') || lower.includes('ybr')) fallbackFilter.providerName = 'Yayasan Bank Rakyat';
  else if (lower.includes('tm') || lower.includes('ytm') || lower.includes('telekom')) fallbackFilter.providerName = 'Yayasan TM';
  else if (lower.includes('khazanah')) fallbackFilter.providerName = 'Yayasan Khazanah';
  else if (lower.includes('bank negara') || lower.includes('bnm')) fallbackFilter.providerName = 'Bank Negara Malaysia';
  else if (lower.includes('mara')) fallbackFilter.providerName = 'MARA';
  else if (lower.includes('maxis')) fallbackFilter.providerName = 'Maxis';

  if (!ai) {
    return fallbackFilter;
  }

  try {
    const prompt = `You are the DreamPath search intelligence engine for Malaysian scholarships.
A student wrote this search query: "${userPrompt.slice(0, 500)}"

Extract structured filter fields in JSON format:
{
  "studyLevel": "SPM Leaver" | "Pre-University / Foundation" | "Diploma" | "Undergraduate Degree" | "Postgraduate" | null,
  "fieldOfStudy": "Engineering" | "Computer Science / Tech" | "Business / Economics" | "Medicine / Healthcare" | "Built Environment" | "General" | null,
  "b40Only": boolean,
  "minCgpa": number | null,
  "providerName": string | null,
  "summary": "1 sentence explanation of what we are filtering for"
}
Output only pure JSON.`;

    const result = await aiRouter.generateText({
      prompt: prompt,
      systemPrompt: undefined,
      jsonSchema: true,
      timeoutMs: 6000
    });
    if (result.error) throw new Error(result.error);
    const response = { text: result.text };

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      query: userPrompt,
      studyLevel: parsed.studyLevel || fallbackFilter.studyLevel,
      fieldOfStudy: parsed.fieldOfStudy || fallbackFilter.fieldOfStudy,
      b40Only: parsed.b40Only ?? fallbackFilter.b40Only,
      minCgpa: parsed.minCgpa ?? fallbackFilter.minCgpa,
      providerName: parsed.providerName || fallbackFilter.providerName,
      summary: parsed.summary || fallbackFilter.summary,
    };
  } catch {
    return fallbackFilter;
  }
}

/**
 * Grounded Scholarship Q&A:
 * Answers a student's question strictly grounded in verified scholarship data.
 * Lists sources used and states clearly when information is unavailable.
 */
export async function aiGroundedScholarshipQA(params: {
  question: string;
  scholarshipName: string;
  providerName: string;
  description: string;
  sourceUrl: string;
  openDate: string;
  closeDate: string;
  requirementsSummary: string[];
}): Promise<{ answer: string; sourcesUsed: string[]; canConfirm: boolean }> {
  const { question, scholarshipName, providerName, description, sourceUrl, openDate, closeDate, requirementsSummary } = params;
  const ai = getAIClient();

  const sourcesUsed = [
    `Official Source: ${sourceUrl || providerName + ' Portal'}`,
    `DreamPath Verified Intake: Cycle ${openDate} - ${closeDate}`,
    'Authoritative Eligibility AST Engine Rules',
  ];

  if (!ai) {
    return {
      answer: `Based on official records for ${scholarshipName} by ${providerName}: The application cycle runs from ${openDate} to ${closeDate}. Verified requirements: ${requirementsSummary.join(', ') || 'Refer to the requirements panel'}. For details outside our verified database, please consult the official source at ${sourceUrl}.`,
      sourcesUsed,
      canConfirm: true,
    };
  }

  try {
    const systemPrompt = `You are the DreamPath Grounded Scholarship Intelligence Assistant.
You MUST answer questions strictly using the provided authoritative context.
NEVER fabricate dates, amounts, bond terms, or requirements.
If the information is not present in the provided context, state clearly: "This information cannot be confirmed from our official verified record. Please check the official provider portal directly."

Authoritative Context:
Scholarship: ${scholarshipName}
Provider: ${providerName}
Overview: ${description}
Official Source: ${sourceUrl}
Intake Dates: Open ${openDate}, Closes ${closeDate}
Verified Requirements:
${requirementsSummary.map((r) => `- ${r}`).join('\n') || '- Machine-checkable criteria mapped in database'}
`;

    const result = await aiRouter.generateText({
      prompt: question.slice(0, 500),
      systemPrompt: systemPrompt,
      jsonSchema: false,
      timeoutMs: 6000
    });
    if (result.error) throw new Error(result.error);
    const response = { text: result.text };

    if (result.isFallback) sourcesUsed.push('Using a backup AI provider');
    const answer = response.text?.trim() || 'No answer generated.';
    const canConfirm = !answer.toLowerCase().includes('cannot be confirmed');

    return {
      answer,
      sourcesUsed,
      canConfirm,
    };
  } catch {
    return {
      answer: 'DreamPath AI is temporarily unavailable. Please try again in a moment.',
      sourcesUsed: ['Offline fallback'],
      canConfirm: false,
    };
  }
}

/**
 * Document Magic Autofill:
 * Extracts academic credentials (SPM grades, CGPA, subjects) from uploaded/pasted transcript text.
 * Never silently writes to DB: returns extracted data for student review.
 */
/**
 * Streamed version of Grounded Scholarship QA
 */
export async function* aiGroundedScholarshipQAStream(params: {
  question: string;
  scholarshipName: string;
  providerName: string;
  description: string;
  sourceUrl: string;
  openDate: string;
  closeDate: string;
  requirementsSummary: string[];
}): AsyncGenerator<{ token?: string; status?: string; done?: boolean; sources?: string[] }, void, unknown> {
  const { question, scholarshipName, providerName, description, sourceUrl, openDate, closeDate, requirementsSummary } = params;

  const sourcesUsed = [
    `Official Source: ${sourceUrl || providerName + ' Portal'}`,
    `DreamPath Verified Intake: Cycle ${openDate} - ${closeDate}`,
    'Authoritative Eligibility AST Engine Rules',
  ];

  const systemPrompt = `You are the DreamPath Grounded Scholarship Intelligence Assistant.
You MUST answer questions strictly using the provided authoritative context.
NEVER fabricate dates, amounts, bond terms, or requirements.
If the information is not present in the provided context, state clearly: "This information cannot be confirmed from our official verified record. Please check the official provider portal directly."

Authoritative Context:
Scholarship: ${scholarshipName}
Provider: ${providerName}
Overview: ${description}
Official Source: ${sourceUrl}
Intake Dates: Open ${openDate}, Closes ${closeDate}
Verified Requirements:
${requirementsSummary.map((r) => '- ' + r).join('\n') || '- Machine-checkable criteria mapped in database'}
`;

  const stream = aiRouter.streamText({
    feature: 'scholarship-qa',
    prompt: question.slice(0, 500),
    systemPrompt,
    timeoutMs: 6000,
    thinkingBudget: 0,
  });

  for await (const chunk of stream) {
    if (chunk.token) yield { token: chunk.token };
    if (chunk.status) yield { status: chunk.status };
    if (chunk.done) {
      yield { done: true, sources: sourcesUsed };
      return;
    }
    if (chunk.error) {
      yield { token: chunk.error, done: true, sources: ['Offline fallback'] };
      return;
    }
  }

  yield { done: true, sources: sourcesUsed };
}

export interface ExtractedAcademicData {
  cgpa?: string;
  qualificationLevel?: string;
  institution?: string;
  spmGrades: Record<string, string>;
  confidence: number;
  notes: string;
}

export async function aiExtractAcademicData(inputText: string): Promise<ExtractedAcademicData> {
  const ai = getAIClient();

  // Basic regex fallback
  const fallbackGrades: Record<string, string> = {};
  const spmRegex = /(Bahasa Melayu|Bahasa Inggeris|English|Mathematics|Matematik|Additional Mathematics|Matematik Tambahan|Physics|Fizik|Chemistry|Kimia|Biology|Biologi|Sejarah|Pendidikan Islam|Moral)\s*[:=-]?\s*([A-E][+-]?|[1-9][A-G])/gi;
  let match;
  while ((match = spmRegex.exec(inputText)) !== null) {
    const subject = match[1].trim();
    const grade = match[2].trim().toUpperCase();
    fallbackGrades[subject] = grade;
  }

  const cgpaRegex = /(?:CGPA|PNGK|GPA)\s*[:=-]?\s*([0-4]\.\d{2})/i;
  const cgpaMatch = inputText.match(cgpaRegex);

  const fallback: ExtractedAcademicData = {
    cgpa: cgpaMatch ? cgpaMatch[1] : undefined,
    spmGrades: fallbackGrades,
    confidence: Object.keys(fallbackGrades).length > 0 || cgpaMatch ? 0.75 : 0.4,
    notes: 'Parsed using deterministic pattern extraction. Please inspect and confirm every field.',
  };

  if (!ai) return fallback;

  try {
    const prompt = `You are the DreamPath academic document parser for Malaysian student transcripts.
Extract academic results from this transcript text:
"""
${inputText.slice(0, 3000)}
"""

Extract into JSON format:
{
  "cgpa": "3.85" or null,
  "qualificationLevel": "SPM" | "STPM" | "Foundation / Matriculation" | "Diploma" | "Undergraduate" | null,
  "institution": "Name of school / university" or null,
  "spmGrades": {
    "Bahasa Melayu": "A+",
    "Bahasa Inggeris": "A",
    "Mathematics": "A+",
    "Additional Mathematics": "A",
    "Physics": "A",
    "Chemistry": "A-",
    "Biology": "A",
    "Sejarah": "A+"
  },
  "confidence": 0.95,
  "notes": "Short summary of extracted items"
}
Use standard Malaysian SPM subject names where applicable. Output only pure JSON.`;

    const result = await aiRouter.generateText({
      prompt: prompt,
      systemPrompt: undefined,
      jsonSchema: true,
      timeoutMs: 6000
    });
    if (result.error) throw new Error(result.error);
    const response = { text: result.text };

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      cgpa: parsed.cgpa || fallback.cgpa,
      qualificationLevel: parsed.qualificationLevel,
      institution: parsed.institution,
      spmGrades: parsed.spmGrades && Object.keys(parsed.spmGrades).length > 0 ? parsed.spmGrades : fallback.spmGrades,
      confidence: parsed.confidence || fallback.confidence,
      notes: parsed.notes || 'Please review every extracted subject and score carefully before confirming.',
    };
  } catch {
    return fallback;
  }
}

/**
 * Scholarship Comparison Intelligence:
 * Provides structured comparative insights across 2-4 selected scholarships.
 */
export interface ScholarshipComparisonOutput {
  summary: string;
  keyDifferences: string[];
  perScholarship: Array<{
    name: string;
    strengths: string[];
    considerations: string[];
  }>;
  tableHighlights?: Array<{ label: string; values: string[] }>;
}

function buildDeterministicComparisonFallback(
  scholarships: Array<{
    name: string;
    provider: string;
    description?: string;
    closeDate?: string;
    award?: string;
    tuitionCoverage?: string;
    livingAllowance?: string;
    bond?: string;
    minCgpa?: string;
    requirements?: string[];
  }>
): ScholarshipComparisonOutput {
  const keyDifferences: string[] = [];

  if (scholarships.length >= 2) {
    const s1 = scholarships[0];
    const s2 = scholarships[1];

    if (s1.minCgpa && s2.minCgpa && s1.minCgpa !== s2.minCgpa) {
      keyDifferences.push(`${s1.name} lists ${s1.minCgpa}, whereas ${s2.name} lists ${s2.minCgpa}.`);
    }

    if (s1.bond && s2.bond && s1.bond !== s2.bond) {
      keyDifferences.push(`${s1.name} has "${s1.bond}", while ${s2.name} has "${s2.bond}".`);
    }

    if (s1.closeDate && s2.closeDate && s1.closeDate !== s2.closeDate) {
      keyDifferences.push(`${s1.name} application cycle closes on ${s1.closeDate}, compared to ${s2.closeDate} for ${s2.name}.`);
    }

    if (s1.award && s2.award && s1.award !== s2.award) {
      keyDifferences.push(`${s1.name} is structured as ${s1.award}, whereas ${s2.name} is ${s2.award}.`);
    }
  }

  const perScholarship = scholarships.map((s) => {
    const text = `${s.name} ${s.description || ''} ${s.bond || ''} ${s.award || ''}`.toLowerCase();
    const strengths: string[] = [];
    const considerations: string[] = [];

    if (text.includes('full') || text.includes('100%') || text.includes('tuition')) {
      strengths.push('Offers full or substantial academic tuition coverage.');
    }
    if (text.includes('living allowance') || text.includes('stipend') || text.includes('allowance')) {
      strengths.push('Includes monthly living allowance / educational stipend.');
    }
    if (text.includes('placement') || text.includes('career') || text.includes('mentorship')) {
      strengths.push('Includes structured provider corporate development or mentorship track.');
    }
    if (strengths.length === 0) {
      strengths.push(`Direct institutional sponsorship supported by ${s.provider}.`);
    }

    if (s.bond && !s.bond.toLowerCase().includes('no service bond')) {
      considerations.push(`Contains service obligation: ${s.bond}.`);
    } else {
      considerations.push('No mandatory corporate bond specified in verified intake.');
    }

    if (s.minCgpa && s.minCgpa !== 'None specified') {
      considerations.push(`Strict minimum academic cutoff: ${s.minCgpa}.`);
    }

    return {
      name: s.name,
      strengths: strengths.slice(0, 3),
      considerations: considerations.slice(0, 3),
    };
  });

  return {
    summary: `Objective side-by-side comparison across ${scholarships.length} verified Malaysian scholarships. Every comparison point is grounded in verified provider terms.`,
    keyDifferences: keyDifferences.slice(0, 5),
    perScholarship,
    tableHighlights: [
      { label: 'Provider Focus', values: scholarships.map((s) => s.provider) },
      { label: 'Closing Date', values: scholarships.map((s) => s.closeDate || 'TBA') },
    ],
  };
}

export async function aiCompareScholarships(scholarships: Array<{
  name: string;
  provider: string;
  description: string;
  closeDate: string;
  award?: string;
  tuitionCoverage?: string;
  livingAllowance?: string;
  bond?: string;
  minCgpa?: string;
  requirements?: string[];
}>): Promise<ScholarshipComparisonOutput> {
  const fallback = buildDeterministicComparisonFallback(scholarships);

  if (!scholarships || scholarships.length === 0) return fallback;
  const ai = getAIClient();
  if (!ai) return fallback;

  try {
    const prompt = `You are the DreamPath Objective Scholarship Comparative Intelligence Engine.
Analyze and contrast these verified Malaysian scholarships:
${JSON.stringify(scholarships, null, 2)}

STRICT OBJECTIVITY RULES:
1. NEVER declare an overall winner or use subjective superlatives like "better", "best", "winner".
2. NEVER invent a score out of 100, percentage match, or recommendation ranking.
3. Every strength, consideration, and key difference MUST be derived strictly from the provided verified data (e.g. tuition, living allowances, bonds, CGPA thresholds, closing dates).
4. For "keyDifferences", write 3 to 5 concise bullet points directly highlighting factual trade-offs (e.g. "Scholarship A requires minimum 3.3 CGPA while Scholarship B requires 3.67.").

Output MUST be valid JSON adhering to:
{
  "summary": "2-3 sentence grounded comparative synthesis of coverage and provider scopes",
  "keyDifferences": [
    "Difference statement 1",
    "Difference statement 2",
    "Difference statement 3"
  ],
  "perScholarship": [
    {
      "name": "Exact scholarship name",
      "strengths": ["Factual strength 1", "Factual strength 2"],
      "considerations": ["Factual consideration 1", "Factual trade-off 2"]
    }
  ]
}`;

    const result = await aiRouter.generateText({
      feature: 'scholarship-compare',
      prompt,
      systemPrompt: 'You are an objective scholarship comparative analyst for Malaysian students. Compare strictly based on verified facts without subjective ranking.',
      jsonSchema: true,
      timeoutMs: 8000,
      thinkingBudget: 0,
      temperature: 0.1,
    });

    if (result.error || !result.text) {
      return fallback;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed || !Array.isArray(parsed.keyDifferences)) {
      return fallback;
    }

    return {
      summary: parsed.summary || fallback.summary,
      keyDifferences: parsed.keyDifferences && parsed.keyDifferences.length > 0 ? parsed.keyDifferences : fallback.keyDifferences,
      perScholarship: parsed.perScholarship && parsed.perScholarship.length > 0 ? parsed.perScholarship : fallback.perScholarship,
      tableHighlights: fallback.tableHighlights,
    };
  } catch {
    return fallback;
  }
}

/**
 * AI Essay / Personal Statement Assistant:
 * Helps students brainstorm, structure, or refine their scholarship personal statements.
 * Never fabricates student achievements or life stories.
 */
export async function aiEssayAssistant(params: {
  action: 'brainstorm' | 'structure' | 'review';
  scholarshipName: string;
  providerName: string;
  essayPrompt?: string;
  studentDraft?: string;
}): Promise<{
  feedback: string;
  suggestedOutline?: string[];
  strengths?: string[];
  improvements?: string[];
}> {
  const { action, scholarshipName, providerName, essayPrompt, studentDraft } = params;
  const ai = getAIClient();

  if (!ai) {
    return {
      feedback: `For ${scholarshipName} by ${providerName}: Ensure your essay directly addresses their organizational mission (e.g. nation building, technology leadership, community impact). Frame your draft around specific challenges you overcame and clear future goals.`,
      suggestedOutline: [
        'Hook & Personal Motivation: Why this specific discipline matters to you',
        'Academic & Project Milestones: Concrete evidence of your dedication',
        'Leadership & Overcoming Obstacles: Demonstrating resilience and team orientation',
        'Future Vision: How the scholarship enables you to give back to Malaysia',
      ],
      strengths: ['Clear alignment with provider values'],
      improvements: ['Ensure every claim is backed with concrete examples rather than vague statements'],
    };
  }

  try {
    const prompt = `You are the DreamPath Scholarship Essay Preparation Advisor.
Context:
Scholarship: ${scholarshipName}
Provider: ${providerName}
Prompt: ${essayPrompt || 'Personal Statement / Statement of Purpose'}
Action requested: ${action}
Student Draft / Notes:
"""
${(studentDraft || 'No draft provided yet. Provide guidance and structure.').slice(0, 3000)}
"""

Rules:
1. NEVER invent student achievements, personal trauma, or leadership positions.
2. Focus on structure, clarity, impact metrics, and alignment with the scholarship provider.
3. Return pure JSON:
{
  "feedback": "Comprehensive, constructive guidance text",
  "suggestedOutline": ["Step 1...", "Step 2..."],
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}`;

    const result = await aiRouter.generateText({
      prompt: prompt,
      systemPrompt: undefined,
      jsonSchema: true,
      timeoutMs: 6000
    });
    if (result.error) throw new Error(result.error);
    const response = { text: result.text };

    return JSON.parse(response.text?.trim() || '{}');
  } catch {
    return {
      feedback: 'Focus on clear paragraph structure, active verbs, and specific examples that demonstrate your readiness for this scholarship.',
    };
  }
}

/**
 * Scholarship Interview Simulator:
 * Interactive mock interview roleplaying an official scholarship panel.
 */
export async function aiInterviewSimulator(params: {
  action: 'next_question' | 'evaluate_answer';
  scholarshipName: string;
  providerName: string;
  questionHistory: Array<{ role: 'interviewer' | 'student'; content: string }>;
  currentAnswer?: string;
}): Promise<{
  nextQuestion?: string;
  feedback?: {
    clarityScore: number; // 1-10
    structureScore: number; // 1-10
    starMethodUsed: boolean;
    strengths: string[];
    improvements: string[];
    sampleBetterAnswer: string;
  };
}> {
  const { action, scholarshipName, providerName, questionHistory, currentAnswer } = params;
  const ai = getAIClient();

  if (!ai) {
    if (action === 'next_question') {
      const defaultQuestions = [
        `Welcome to the ${scholarshipName} interview. Could you introduce yourself and explain why you chose this field of study?`,
        `How do you plan to contribute to ${providerName}'s mission after graduating?`,
        'Describe a significant challenge you faced in a team project and how you resolved it.',
        'Where do you see yourself in five years within Malaysia’s developing economy?',
      ];
      const nextIdx = Math.min(questionHistory.filter(q => q.role === 'interviewer').length, defaultQuestions.length - 1);
      return { nextQuestion: defaultQuestions[nextIdx] };
    } else {
      return {
        feedback: {
          clarityScore: 8,
          structureScore: 7,
          starMethodUsed: true,
          strengths: ['Direct response to the prompt', 'Relevant academic focus'],
          improvements: ['Quantify results using concrete data', 'Link personal aspirations back to provider values'],
          sampleBetterAnswer: 'Use the STAR format: Situation, Task, Action you took, and the quantifiable Result achieved.',
        },
      };
    }
  }

  try {
    if (action === 'next_question') {
      const prompt = `You are a distinguished panelist interviewing a Malaysian student for the ${scholarshipName} by ${providerName}.
Past interview dialogue:
${JSON.stringify(questionHistory, null, 2)}

Provide the next realistic interview question in pure JSON:
{
  "nextQuestion": "The question text"
}`;

      const result = await aiRouter.generateText({
      prompt: prompt,
      systemPrompt: undefined,
      jsonSchema: true,
      timeoutMs: 6000
    });
    if (result.error) throw new Error(result.error);
    const response = { text: result.text };
      return JSON.parse(response.text?.trim() || '{}');
    } else {
      const prompt = `You are a scholarship interview coach evaluating a student's answer for the ${scholarshipName} (${providerName}).
Question and answer context:
${JSON.stringify(questionHistory, null, 2)}
Student's latest answer:
"${currentAnswer || ''}"

Evaluate the answer. Return pure JSON:
{
  "feedback": {
    "clarityScore": 8,
    "structureScore": 8,
    "starMethodUsed": true,
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "sampleBetterAnswer": "A polished alternative demonstrating how to articulate the same authentic experience more effectively"
  }
}`;

      const result = await aiRouter.generateText({
      prompt: prompt,
      systemPrompt: undefined,
      jsonSchema: true,
      timeoutMs: 6000
    });
    if (result.error) throw new Error(result.error);
    const response = { text: result.text };
      return JSON.parse(response.text?.trim() || '{}');
    }
  } catch {
    return {
      nextQuestion: `What inspired you to apply specifically for the ${scholarshipName}?`,
    };
  }
}
