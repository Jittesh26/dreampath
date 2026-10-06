import { NextRequest, NextResponse } from 'next/server';
import { aiEssayAssistant } from '@/lib/ai/gemini-service';

import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { action, scholarshipName, providerName, essayPrompt, studentDraft } = body;

    const trimmedDraft = (studentDraft || '').trim();
    if (!trimmedDraft) {
      return NextResponse.json(
        { error: 'Add some notes, rough ideas, or a draft first so the assistant can analyze your writing.' },
        { status: 400 }
      );
    }

    const result = await aiEssayAssistant({
      action: action || 'brainstorm',
      scholarshipName: scholarshipName || 'Malaysian Tertiary Scholarship',
      providerName: providerName || 'Scholarship Provider',
      essayPrompt: essayPrompt || 'Personal Statement',
      studentDraft: trimmedDraft,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "We couldn't analyse your draft right now. Your draft has not been lost. Please try again." },
      { status: 500 }
    );
  }
}
