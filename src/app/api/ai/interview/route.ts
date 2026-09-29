import { NextRequest, NextResponse } from 'next/server';
import { aiInterviewSimulator } from '@/lib/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, scholarshipName, providerName, questionHistory, currentAnswer } = body;

    const result = await aiInterviewSimulator({
      action: action || 'next_question',
      scholarshipName: scholarshipName || 'Malaysian Scholarship',
      providerName: providerName || 'Scholarship Foundation',
      questionHistory: Array.isArray(questionHistory) ? questionHistory : [],
      currentAnswer,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Interview simulator error' }, { status: 500 });
  }
}
