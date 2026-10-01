import { NextRequest, NextResponse } from 'next/server';
import { aiExtractAcademicData } from '@/lib/ai/gemini-service';

import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text or transcript content is required' }, { status: 400 });
    }

    const data = await aiExtractAcademicData(text);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Autofill extraction error' }, { status: 500 });
  }
}
