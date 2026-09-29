import { NextRequest, NextResponse } from 'next/server';
import { aiGroundedScholarshipQA } from '@/lib/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, scholarshipName, providerName, description, sourceUrl, openDate, closeDate, requirementsSummary } = body;

    if (!question || !scholarshipName) {
      return NextResponse.json({ error: 'Question and scholarship details are required' }, { status: 400 });
    }

    const result = await aiGroundedScholarshipQA({
      question,
      scholarshipName,
      providerName: providerName || 'Official Provider',
      description: description || '',
      sourceUrl: sourceUrl || '',
      openDate: openDate || 'TBA',
      closeDate: closeDate || 'TBA',
      requirementsSummary: Array.isArray(requirementsSummary) ? requirementsSummary : [],
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'QA error' }, { status: 500 });
  }
}
