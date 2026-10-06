import { NextRequest, NextResponse } from 'next/server';
import { aiInterviewSimulator } from '@/lib/ai/gemini-service';

import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { action, scholarshipName, providerName, questionHistory, currentAnswer, askedQuestions, rounds } = body;

    const result = await aiInterviewSimulator({
      action: action || 'next_question',
      scholarshipName: scholarshipName || 'Malaysian Scholarship',
      providerName: providerName || 'Scholarship Foundation',
      questionHistory: Array.isArray(questionHistory) ? questionHistory : [],
      currentAnswer,
      askedQuestions: Array.isArray(askedQuestions) ? askedQuestions : undefined,
      rounds: Array.isArray(rounds) ? rounds : undefined,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Interview simulator error' }, { status: 500 });
  }
}
