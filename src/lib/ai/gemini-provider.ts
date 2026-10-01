/**
 * UnifiedResumeAIProvider (Production Gemini Flash Implementation with Cascade & Fallback)
 *
 * All AI calls are server-side only via AIRouter.
 * Adheres strictly to the DreamPath Anti-Hallucination Policy:
 * The AI MUST NEVER invent grades, qualifications, positions, metrics, or technologies.
 * Only facts with verifiable student provenance are permitted in the resume.
 */
import {
  ResumeAIProvider,
  ChatMessage,
  ExtractedFact,
  GeneratedWording,
  InterviewTurnResult,
  extractedFactSchema,
} from '../../domain/ai-interview';
import { ResumeContent } from '../../domain/resume';
import { aiRouter } from './router';

const MAX_HISTORY_MESSAGES = 15;
const MAX_ANSWER_LENGTH = 3000;
const MAX_QUESTION_LENGTH = 500;
const MAX_FACTS_PER_CALL = 12;

// Schema for Unified Conversational Turn (Question + Background Entity Extraction)
const UNIFIED_TURN_SCHEMA = {
  type: 'object',
  properties: {
    nextQuestion: {
      type: 'string',
      description: 'A natural, encouraging conversational follow-up question, or a celebratory concluding message if complete.',
    },
    isComplete: {
      type: 'boolean',
      description: 'True ONLY when sufficient information has been gathered across Education, Experience/Projects, and Skills, or if the student asked to finish.',
    },
    topic: {
      type: 'string',
      description: 'Current section focus: education, experience, projects, skills, leadership, achievements, or completion.',
    },
    extractedEntities: {
      type: 'array',
      description: 'Factual entities explicitly stated in the student answer. Never guess or fabricate. Do not emit empty objects.',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: [
              'personal',
              'education',
              'experience',
              'project',
              'skills',
              'certifications',
              'awards',
              'leadership',
              'volunteering',
              'scholarships',
              'general',
            ],
          },
          data: {
            type: 'object',
            properties: {
              fullName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              location: { type: 'string' },
              linkedin: { type: 'string' },
              github: { type: 'string' },
              portfolio: { type: 'string' },
              professionalSummary: { type: 'string' },
              institution: { type: 'string' },
              qualification: { type: 'string' },
              fieldOfStudy: { type: 'string' },
              educationLevel: {
                type: 'string',
                enum: ['SPM', 'STPM', 'Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Other'],
              },
              cgpa: { type: 'string' },
              spmSubjects: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    subject: { type: 'string' },
                    grade: { type: 'string' },
                  },
                  required: ['subject', 'grade'],
                },
              },
              employer: { type: 'string' },
              position: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              isCurrent: { type: 'boolean' },
              description: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              organization: { type: 'string' },
              issuer: { type: 'string' },
              year: { type: 'string' },
              date: { type: 'string' },
              projectUrl: { type: 'string' },
              credentialUrl: { type: 'string' },
              technical: { type: 'array', items: { type: 'string' } },
              soft: { type: 'array', items: { type: 'string' } },
              languages: { type: 'array', items: { type: 'string' } },
              technologies: { type: 'array', items: { type: 'string' } },
              achievements: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        required: ['category', 'data'],
      },
    },
  },
  required: ['nextQuestion', 'isComplete', 'extractedEntities'],
};

// Standard JSON Schema for Complete Resume Synthesis
const WORDING_SCHEMA = {
  type: 'object',
  properties: {
    personal: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' },
        portfolio: { type: 'string' },
        professionalSummary: { type: 'string' },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          institution: { type: 'string' },
          qualification: { type: 'string' },
          fieldOfStudy: { type: 'string' },
          educationLevel: {
            type: 'string',
            enum: ['SPM', 'STPM', 'Foundation', 'Diploma', 'Bachelor', 'Master', 'PhD', 'Other'],
          },
          cgpa: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          spmSubjects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                subject: { type: 'string' },
                grade: { type: 'string' },
              },
              required: ['subject', 'grade'],
            },
          },
        },
        required: ['id', 'institution', 'qualification', 'educationLevel'],
      },
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          employer: { type: 'string' },
          position: { type: 'string' },
          location: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          isCurrent: { type: 'boolean' },
          description: { type: 'string' },
          achievements: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'employer', 'position'],
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          description: { type: 'string' },
          technologies: { type: 'array', items: { type: 'string' } },
          achievements: { type: 'array', items: { type: 'string' } },
          projectUrl: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['id', 'name'],
      },
    },
    skills: {
      type: 'object',
      properties: {
        technical: { type: 'array', items: { type: 'string' } },
        soft: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' },
          credentialUrl: { type: 'string' },
        },
        required: ['id', 'name', 'issuer'],
      },
    },
    awards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id', 'name', 'issuer'],
      },
    },
    leadership: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          organization: { type: 'string' },
          role: { type: 'string' },
          description: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['id', 'organization', 'role'],
      },
    },
    volunteering: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          organization: { type: 'string' },
          role: { type: 'string' },
          description: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
        required: ['id', 'organization', 'role'],
      },
    },
    scholarships: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          issuer: { type: 'string' },
          year: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['id', 'name'],
      },
    },
  },
};

function analyzeTopicCoverage(history: ChatMessage[], currentResume?: Partial<ResumeContent>) {
  const covered = new Set<string>();

  if (currentResume?.education && currentResume.education.length > 0) covered.add('Education');
  if (currentResume?.experience && currentResume.experience.length > 0) covered.add('Work Experience');
  if (currentResume?.projects && currentResume.projects.length > 0) covered.add('Projects');
  if (currentResume?.skills?.technical && currentResume.skills.technical.length > 0) covered.add('Technical Skills');
  if (currentResume?.certifications && currentResume.certifications.length > 0) covered.add('Certifications');
  if (currentResume?.leadership && currentResume.leadership.length > 0) covered.add('Leadership');
  if (currentResume?.volunteering && currentResume.volunteering.length > 0) covered.add('Volunteering');
  if (currentResume?.awards && currentResume.awards.length > 0) covered.add('Awards & Achievements');

  const fullText = history.map((m) => m.content.toLowerCase()).join(' ');
  if (/degree|universit|college|cgpa|spm|stpm|diploma|bachelor|master|phd|study|studying|major|faculty/i.test(fullText)) covered.add('Education');
  if (/intern|internship|worked at|employed|developer at|analyst|engineer at|assistant|job|freelance/i.test(fullText)) covered.add('Work Experience');
  if (/project|built|developed|created|github|app|system|website|bot|tool|dashboard/i.test(fullText)) covered.add('Projects');
  if (/python|react|typescript|javascript|sql|java|c\+\+|aws|docker|git|tools|figma|node|html|css|next\.js/i.test(fullText)) covered.add('Technical Skills');
  if (/lead|president|vice president|director|committee|organized|head of|mentor/i.test(fullText)) covered.add('Leadership');
  if (/volunteer|charity|campaign|community|ngo|blood donation/i.test(fullText)) covered.add('Volunteering');
  if (/award|won|champion|first place|second place|third place|hackathon|medal|dean's list|merit/i.test(fullText)) covered.add('Awards & Achievements');
  if (/certif|license|google certified|aws certified|coursera|credential/i.test(fullText)) covered.add('Certifications');

  const allTopics = [
    'Education',
    'Work Experience',
    'Projects',
    'Technical Skills',
    'Leadership',
    'Awards & Achievements',
    'Certifications',
    'Volunteering',
  ];

  const missing = allTopics.filter((t) => !covered.has(t));
  const hasCoreCoverage = covered.has('Education') && (covered.has('Work Experience') || covered.has('Projects')) && covered.has('Technical Skills');

  return {
    covered: Array.from(covered),
    missing,
    hasCoreCoverage,
  };
}

export class GeminiResumeAIProvider implements ResumeAIProvider {
  constructor() {
    if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      throw new Error('Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured.');
    }
  }

  private sanitiseInput(text: string, maxLen = MAX_ANSWER_LENGTH): string {
    return text.slice(0, maxLen).replace(/[<>]/g, '');
  }

  /**
   * Unified Turn Processing: Combines natural dialogue follow-up and background entity extraction into a single AI call
   */
  async processInterviewTurn(params: {
    history: ChatMessage[];
    latestAnswer: string;
    currentResume?: Partial<ResumeContent>;
  }): Promise<InterviewTurnResult> {
    const startedAt = Date.now();
    try {
      const coverage = analyzeTopicCoverage(params.history, params.currentResume);
      const studentTurnCount = params.history.filter((m) => m.role === 'student').length;

      const systemInstruction = [
        'You are an empathetic, world-class Malaysian university scholarship & graduate career interviewer.',
        'Your goal is to conduct a natural, engaging conversation that surfaces verifiable accomplishments for a student resume.',
        'CRITICAL RULES:',
        '1. NATURAL CONVERSATION: Acknowledge what the student just shared in 1 concise sentence, then ask ONE clear, focused follow-up question. Never interrogate.',
        '2. NO REPETITION: Never ask for information the student has already shared. Adapt to what is already known.',
        '3. MULTI-TOPIC & LONG ANSWERS: A student might share a single paragraph spanning multiple categories (e.g. Education, Internship, Projects, Leadership, Awards, Certifications, Skills). SILENTLY extract ALL of them into `extractedEntities`. Never ignore a category just because the answer was long. In your visible reply, acknowledge their diverse background and ask ONE focused follow-up on an unexplored area or a key metric.',
        '4. SHORT ANSWERS & "NOTHING": If the student gives a 1-word answer ("Java", "UTM", "none", "nothing", "skip"), never scold or treat it as an error. Acknowledge and transition smoothly to the next missing topic.',
        '5. CORRECTIONS & CONTRADICTIONS: If the student corrects a detail ("Actually it was 2025, not 2024" or "My CGPA is 3.82, not 3.6"), affirm the correction naturally in your reply and extract the updated fact so it overrides previous entries.',
        '6. NEVER EXPOSE MACHINERY: Never mention "extracted facts", "categories", "database", "JSON", "resume sections", "confirmation", or ask "should I put this under Experience?". Speak like a natural executive career coach.',
        '7. DO NOT OVER-INTERVIEW: If the student has already provided sufficient information for a solid resume (e.g. Education + Projects/Experience + Skills), DO NOT keep asking questions endlessly. Conclude warmly (e.g. "You\'ve provided wonderful context! I have everything I need to build your resume.") and set `isComplete: true`. Typically 2 to 4 turns is plenty if the student was comprehensive.',
        '8. STRICT ANTI-HALLUCINATION: In `extractedEntities`, extract ONLY facts explicitly stated by the student. Preserve exact CGPA, SPM grades, company names, and dates. Never fabricate. Do NOT emit empty `{}` data objects.',
      ].join('\n');

      const safeAnswer = this.sanitiseInput(params.latestAnswer);

      const recentHistory = params.history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
        role: (m.role === 'ai' ? 'ai' : 'user') as 'ai' | 'user',
        content: m.content,
      }));

      const prompt = [
        `Student Turn Count: ${studentTurnCount + 1}`,
        `Currently Covered Topics: ${coverage.covered.join(', ') || 'None yet'}`,
        `Unexplored Topics: ${coverage.missing.slice(0, 3).join(', ')}`,
        coverage.hasCoreCoverage ? 'NOTE: Core topics (Education, Experience/Project, Skills) have already been touched upon. If the student has answered sufficiently, wrap up and set isComplete: true.' : '',
        '',
        'Student latest response:',
        `"${safeAnswer}"`,
        '',
        'Respond with nextQuestion, isComplete status, and extractedEntities in JSON.',
      ].filter(Boolean).join('\n');

      const result = await aiRouter.generateText({
        feature: 'resume-interview',
        systemPrompt: systemInstruction,
        prompt,
        history: recentHistory,
        jsonSchema: UNIFIED_TURN_SCHEMA,
        timeoutMs: 12000,
        temperature: 0.5,
      });

      if (!result.text || result.error) {
        throw new Error(result.error || 'Failed to process interview turn');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(result.text);
      } catch {
        const match = result.text.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : {};
      }

      let nextQuestion = typeof parsed.nextQuestion === 'string' && parsed.nextQuestion.trim()
        ? parsed.nextQuestion.slice(0, MAX_QUESTION_LENGTH).trim()
        : "Thank you for sharing! Could you tell me more about any key technical skills or tools you used?";

      // Strictly sanitize nextQuestion to guarantee NO leaked JSON, code blocks, or technical tags
      nextQuestion = nextQuestion
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\{[\s\S]*?\}/g, '')
        .replace(/\b(JSON|schema|extractedEntities|ExtractedFact|resume_facts)\b/gi, '')
        .trim();

      // Determine completion: AI flag, or core coverage met after turn 3, or turn limit safeguard
      const isComplete = Boolean(parsed.isComplete) || (coverage.hasCoreCoverage && studentTurnCount >= 3) || studentTurnCount >= 6;
      const topic = typeof parsed.topic === 'string' ? parsed.topic : 'general';

      const rawEntities = Array.isArray(parsed.extractedEntities) ? parsed.extractedEntities : [];
      const validFacts: ExtractedFact[] = [];

      for (const item of rawEntities.slice(0, MAX_FACTS_PER_CALL)) {
        if (!item || typeof item !== 'object') continue;
        const cat = item.category;
        const data = item.data;

        // Skip completely empty data objects to eliminate empty fact records
        if (!cat || !data || typeof data !== 'object') continue;
        const keys = Object.keys(data).filter((k) => {
          const val = (data as Record<string, unknown>)[k];
          if (val === null || val === undefined || val === '') return false;
          if (Array.isArray(val) && val.length === 0) return false;
          return true;
        });
        if (keys.length === 0) continue;

        try {
          const parsedFact = extractedFactSchema.parse({
            id: crypto.randomUUID(),
            category: cat,
            originalAnswer: safeAnswer,
            structuredData: { category: cat, data },
            isConfirmed: true,
          });
          validFacts.push(parsedFact);
        } catch {
          // If schema mismatch, gracefully skip malformed entity
        }
      }

      console.info('[AI] processInterviewTurn', {
        provider: result.provider,
        model: result.modelUsed,
        extractedCount: validFacts.length,
        isComplete,
        durationMs: Date.now() - startedAt,
      });

      return {
        nextQuestion,
        isComplete,
        topic,
        extractedFacts: validFacts,
      };
    } catch (err: any) {
      console.error('[AI] processInterviewTurn failed', {
        durationMs: Date.now() - startedAt,
        error: err?.message,
      });

      // Graceful fallback question without crashing the interview
      return {
        nextQuestion: "That's helpful context! Could you also share any specific achievements, tools, or metrics related to that?",
        isComplete: false,
        topic: 'general',
        extractedFacts: [],
      };
    }
  }

  /**
   * Generates opening interview question
   */
  async generateNextQuestion(history: ChatMessage[]): Promise<string> {
    const studentTurns = history.filter((m) => m.role === 'student').length;
    if (studentTurns === 0) {
      return "Hello! I'm here to help you craft a standout resume. Let's start with your academic foundation: what degree or program are you studying, at which university or college, and what is your current year or CGPA?";
    }

    const latestStudentMsg = [...history].reverse().find((m) => m.role === 'student');
    const turnResult = await this.processInterviewTurn({
      history,
      latestAnswer: latestStudentMsg?.content || '',
    });
    return turnResult.nextQuestion;
  }

  /**
   * Legacy standalone fact extraction
   */
  async extractFacts(history: ChatMessage[], latestAnswer: string): Promise<ExtractedFact[]> {
    const turn = await this.processInterviewTurn({ history, latestAnswer });
    return turn.extractedFacts;
  }

  /**
   * Consolidated Batch Synthesis: Synthesizes all gathered facts into a full, coherent ResumeContent
   */
  async generateProfessionalWording(confirmedFacts: ExtractedFact[]): Promise<GeneratedWording> {
    if (confirmedFacts.length === 0) return {};

    const startedAt = Date.now();
    try {
      const systemInstruction = [
        'You are an executive resume writer and scholarship admissions expert.',
        'You will receive a complete set of facts gathered from a Malaysian university student.',
        'Your job is to synthesize these facts into a cohesive, polished, professional resume layout.',
        'CRITICAL ANTI-HALLUCINATION & PRECISION RULES:',
        '1. PRESERVE FACTUAL TRUTH: Do NOT invent metrics, user numbers, revenue, grades, dates, employers, positions, awards, or certifications.',
        '2. CHRONOLOGICAL TRUTH & CORRECTIONS: Facts are ordered chronologically. If earlier statements conflict with later statements (e.g. an updated CGPA, employer name, or graduation year), the LATER statement is the authoritative user correction. Never emit contradictory values.',
        '3. EXECUTIVE WORDING: Use strong, concise action verbs (e.g. Engineered, Spearheaded, Coordinated, Implemented, Formulated). Polish user phrasing professionally without inflating scope or responsibility.',
        '4. DO NOT EXAGGERATE: Do not turn "assisted" or "participated" into "led", or "contributed" into "founded".',
        '5. CROSS-SECTION DEDUPLICATION: Avoid repeating the exact same achievement sentence across multiple sections (e.g. Experience vs Projects vs Leadership). Map each detail to its most appropriate home.',
        '6. PRESERVE SPECIFICS: Preserve exact CGPA (e.g. 3.82) and SPM subject grades if provided.',
        '7. VALID UUIDS: Assign a valid RFC 4122 v4 UUID (e.g. 550e8400-e29b-41d4-a716-446655440000) to each item "id".',
        '8. Strictly conform to the JSON schema.',
      ].join('\n');

      const factsPayload = confirmedFacts.map((f) => ({
        category: f.category,
        data: f.structuredData.category === f.category ? f.structuredData.data : f.structuredData,
      }));

      const prompt = [
        'Synthesize these verified student facts into a complete professional resume document:',
        JSON.stringify(factsPayload, null, 2),
      ].join('\n');

      const result = await aiRouter.generateText({
        feature: 'resume-wording',
        systemPrompt: systemInstruction,
        prompt,
        jsonSchema: WORDING_SCHEMA,
        temperature: 0.2,
      });

      if (!result.text || result.error) {
        throw new Error(result.error || 'Wording synthesis failed');
      }

      let parsed: GeneratedWording;
      try {
        parsed = JSON.parse(result.text) as GeneratedWording;
      } catch {
        const match = result.text.match(/\{[\s\S]*\}/);
        parsed = match ? (JSON.parse(match[0]) as GeneratedWording) : {};
      }

      const sanitizeId = (id?: string) => {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return id && UUID_REGEX.test(id) ? id : crypto.randomUUID();
      };

      if (parsed.education) parsed.education = parsed.education.map((e) => ({ ...e, id: sanitizeId(e.id) }));
      if (parsed.experience) parsed.experience = parsed.experience.map((e) => ({ ...e, id: sanitizeId(e.id) }));
      if (parsed.projects) parsed.projects = parsed.projects.map((p) => ({ ...p, id: sanitizeId(p.id) }));
      if (parsed.certifications) parsed.certifications = parsed.certifications.map((c) => ({ ...c, id: sanitizeId(c.id) }));
      if (parsed.awards) parsed.awards = parsed.awards.map((a) => ({ ...a, id: sanitizeId(a.id) }));
      if (parsed.leadership) parsed.leadership = parsed.leadership.map((l) => ({ ...l, id: sanitizeId(l.id) }));
      if (parsed.volunteering) parsed.volunteering = parsed.volunteering.map((v) => ({ ...v, id: sanitizeId(v.id) }));
      if (parsed.scholarships) parsed.scholarships = parsed.scholarships.map((s) => ({ ...s, id: sanitizeId(s.id) }));

      console.info('[AI] generateProfessionalWording synthesis complete', {
        provider: result.provider,
        model: result.modelUsed,
        durationMs: Date.now() - startedAt,
        sectionsGenerated: Object.keys(parsed),
      });

      return parsed;
    } catch (err: any) {
      console.error('[AI] generateProfessionalWording failed', {
        durationMs: Date.now() - startedAt,
        error: err?.message,
      });
      throw new Error('AI resume synthesis failed. Please try again.');
    }
  }
}
