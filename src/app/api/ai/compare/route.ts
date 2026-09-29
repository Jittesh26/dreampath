import { NextRequest, NextResponse } from 'next/server';
import { aiCompareScholarships } from '@/lib/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const { scholarships } = await req.json();
    if (!scholarships || !Array.isArray(scholarships) || scholarships.length === 0) {
      return NextResponse.json({ error: 'Scholarships list is required' }, { status: 400 });
    }

    const comparison = await aiCompareScholarships(scholarships);
    return NextResponse.json(comparison);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Comparison error' }, { status: 500 });
  }
}
