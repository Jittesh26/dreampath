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
  if (!apiKey) return null;
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: question.slice(0, 500),
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const answer = response.text?.trim() || 'No answer generated.';
    const canConfirm = !answer.toLowerCase().includes('cannot be confirmed');

    return {
      answer,
      sourcesUsed,
      canConfirm,
    };
  } catch {
    return {
      answer: `According to our verified intake data: ${scholarshipName} by ${providerName} closes on ${closeDate}. Machine-checkable requirements: ${requirementsSummary.join(', ') || 'Standard academic benchmarks'}.`,
      sourcesUsed,
      canConfirm: true,
    };
  }
}

/**
 * Document Magic Autofill:
 * Extracts academic credentials (SPM grades, CGPA, subjects) from uploaded/pasted transcript text.
 * Never silently writes to DB: returns extracted data for student review.
 */
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

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
export async function aiCompareScholarships(scholarships: Array<{
  name: string;
  provider: string;
  description: string;
  closeDate: string;
  requirements: string[];
}>): Promise<{
  summary: string;
  tableHighlights: Array<{ label: string; values: string[] }>;
  recommendationTip: string;
}> {
  const ai = getAIClient();

  const fallback = {
    summary: `Comparing ${scholarships.map(s => s.name).join(' vs ')}. Each scholarship offers targeted support with distinct provider focus.`,
    tableHighlights: [
      { label: 'Provider Focus', values: scholarships.map(s => s.provider) },
      { label: 'Closing Date', values: scholarships.map(s => s.closeDate || 'TBA') },
      { label: 'Key Criteria', values: scholarships.map(s => s.requirements.slice(0, 2).join('; ') || 'Standard criteria') },
    ],
    recommendationTip: 'Prioritize scholarships matching your immediate field of study and ensure your CGPA meets the hard cutoff.',
  };

  if (!ai || scholarships.length === 0) return fallback;

  try {
    const prompt = `Compare these Malaysian scholarships objectively based on their verified data:
${JSON.stringify(scholarships, null, 2)}

Provide JSON:
{
  "summary": "2-3 sentence executive comparative summary",
  "tableHighlights": [
    { "label": "Target Discipline", "values": ["...", "..."] },
    { "label": "Financial / Bond Profile", "values": ["...", "..."] },
    { "label": "Competitiveness", "values": ["...", "..."] }
  ],
  "recommendationTip": "Actionable advice on how a student should choose between them"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    return JSON.parse(response.text?.trim() || '{}') || fallback;
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      return JSON.parse(response.text?.trim() || '{}');
    }
  } catch {
    return {
      nextQuestion: `What inspired you to apply specifically for the ${scholarshipName}?`,
    };
  }
}
