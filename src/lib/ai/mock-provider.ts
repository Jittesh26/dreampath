import { ResumeAIProvider, ChatMessage, ExtractedFact, GeneratedWording } from '@/domain/ai-interview';

export class MockResumeAIProvider implements ResumeAIProvider {
  async generateNextQuestion(history: ChatMessage[]): Promise<string> {
    const studentMessageCount = history.filter(m => m.role === 'student').length;
    
    // Deterministic mock flow
    if (studentMessageCount === 0) {
      return "Hi there! Let's build your resume. To start, what are you currently studying and where?";
    }
    
    if (studentMessageCount === 1) {
      return "Great! What is your current CGPA, and what year are you in?";
    }

    if (studentMessageCount === 2) {
      return "Awesome. Could you tell me about a recent project you worked on?";
    }
    
    return "Thank you for sharing! Let's review the facts we've gathered so far.";
  }

  async extractFacts(history: ChatMessage[], latestAnswer: string): Promise<ExtractedFact[]> {
    // Deterministic mock extraction based on typical answers for our flow
    const lowerAnswer = latestAnswer.toLowerCase();
    const facts: ExtractedFact[] = [];
    
    if (lowerAnswer.includes('computer science') || lowerAnswer.includes('studying')) {
      facts.push({
        id: crypto.randomUUID(),
        category: 'education',
        originalAnswer: latestAnswer,
        structuredData: {
          category: 'education',
          data: {
            institution: 'Universiti Pertahanan Nasional Malaysia',
            qualification: 'Bachelor of Computer Science',
            educationLevel: 'Bachelor'
          }
        },
        isConfirmed: false
      });
    } else if (lowerAnswer.includes('cgpa') || lowerAnswer.includes('3.')) {
      facts.push({
        id: crypto.randomUUID(),
        category: 'education',
        originalAnswer: latestAnswer,
        structuredData: {
          category: 'education',
          data: {
            cgpa: '3.98'
          }
        },
        isConfirmed: false
      });
    } else if (lowerAnswer.includes('project') || lowerAnswer.includes('built')) {
      facts.push({
        id: crypto.randomUUID(),
        category: 'project',
        originalAnswer: latestAnswer,
        structuredData: {
          category: 'project',
          data: {
            name: 'CampusFind',
            description: 'Developed the CampusFind website with a four-person team.',
            technologies: ['React', 'Next.js']
          }
        },
        isConfirmed: false
      });
    }
    
    return facts;
  }

  async generateProfessionalWording(confirmedFacts: ExtractedFact[]): Promise<GeneratedWording> {
    const generated: GeneratedWording = {
      education: [],
      projects: []
    };
    
    for (const fact of confirmedFacts) {
      if (!fact.isConfirmed) continue; // Safety check
      
      if (fact.category === 'education' && fact.structuredData.category === 'education') {
        generated.education!.push({
          id: crypto.randomUUID(),
          institution: fact.structuredData.data.institution || 'Unknown',
          qualification: fact.structuredData.data.qualification || 'Unknown',
          educationLevel: fact.structuredData.data.educationLevel || 'Other',
          ...fact.structuredData.data
        });
      } else if (fact.category === 'project' && fact.structuredData.category === 'project') {
        generated.projects!.push({
          id: crypto.randomUUID(),
          name: fact.structuredData.data.name || 'Unknown',
          ...fact.structuredData.data,
          achievements: ['Developed the CampusFind application using Next.js and PostgreSQL.']
        });
      }
    }
    
    return generated;
  }

  async processInterviewTurn(params: {
    history: ChatMessage[];
    latestAnswer: string;
  }): Promise<{
    nextQuestion: string;
    isComplete: boolean;
    topic?: string;
    extractedFacts: ExtractedFact[];
  }> {
    const studentCount = params.history.filter(m => m.role === 'student').length;
    const extractedFacts = await this.extractFacts(params.history, params.latestAnswer);
    const isComplete = studentCount >= 3;
    const nextQuestion = isComplete
      ? "Great — I have gathered sufficient information to build a standout resume for you!"
      : await this.generateNextQuestion([...params.history, { id: crypto.randomUUID(), role: 'student', content: params.latestAnswer, timestamp: new Date() }]);

    return {
      nextQuestion,
      isComplete,
      topic: isComplete ? 'completion' : 'general',
      extractedFacts,
    };
  }
}
