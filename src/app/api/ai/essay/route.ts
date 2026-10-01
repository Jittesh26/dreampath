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
