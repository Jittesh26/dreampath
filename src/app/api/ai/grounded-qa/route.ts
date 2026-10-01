import { NextRequest, NextResponse } from 'next/server';
import { aiGroundedScholarshipQA, aiGroundedScholarshipQAStream } from '@/lib/ai/gemini-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, scholarshipName, providerName, description, sourceUrl, openDate, closeDate, requirementsSummary, stream } = body;

    if (!question || !scholarshipName) {
      return NextResponse.json({ error: 'Question and scholarship details are required' }, { status: 400 });
    }

    const params = {
      question,
      scholarshipName,
      providerName: providerName || 'Official Provider',
      description: description || '',
      sourceUrl: sourceUrl || '',
      openDate: openDate || 'TBA',
      closeDate: closeDate || 'TBA',
      requirementsSummary: Array.isArray(requirementsSummary) ? requirementsSummary : [],
    };

    // If client requested streaming
    if (stream) {
      const generator = aiGroundedScholarshipQAStream(params);
      const encoder = new TextEncoder();

      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              const dataStr = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(dataStr));
            }
          } catch (streamErr: any) {
            const errStr = `data: ${JSON.stringify({ error: streamErr?.message || 'Streaming error' })}\n\n`;
            controller.enqueue(encoder.encode(errStr));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Default: synchronous JSON response
    const result = await aiGroundedScholarshipQA(params);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'QA error' }, { status: 500 });
  }
}
