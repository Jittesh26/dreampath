import { NextRequest, NextResponse } from 'next/server';
import { aiEssayAssistant } from '@/lib/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, scholarshipName, providerName, essayPrompt, studentDraft } = body;

    const result = await aiEssayAssistant({
      action: action || 'brainstorm',
      scholarshipName: scholarshipName || 'Malaysian Tertiary Scholarship',
      providerName: providerName || 'Scholarship Provider',
      essayPrompt,
      studentDraft,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Essay assistant error' }, { status: 500 });
  }
}
