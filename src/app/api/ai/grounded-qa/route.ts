import { NextRequest, NextResponse } from 'next/server';
import { aiGroundedScholarshipQA, aiGroundedScholarshipQAStream } from '@/lib/ai/gemini-service';
import { db } from '@/db';
import { scholarships, providers, intakes, intakeVersions, requirements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, scholarshipId, scholarshipName, stream } = body;

    if (!question || (!scholarshipId && !scholarshipName)) {
      return NextResponse.json({ error: 'Question and scholarship reference are required' }, { status: 400 });
    }

    // Resolve authoritative data from the database
    let scholarshipRecord: any = null;
    let providerRecord: any = null;

    if (scholarshipId) {
      const [res] = await db
        .select()
        .from(scholarships)
        .innerJoin(providers, eq(scholarships.providerId, providers.id))
        .where(eq(scholarships.id, scholarshipId));
      if (res) {
        scholarshipRecord = res.scholarships;
        providerRecord = res.providers;
      }
    } else if (scholarshipName) {
      const [res] = await db
        .select()
        .from(scholarships)
        .innerJoin(providers, eq(scholarships.providerId, providers.id))
        .where(eq(scholarships.name, scholarshipName));
      if (res) {
        scholarshipRecord = res.scholarships;
        providerRecord = res.providers;
      }
    }

    if (!scholarshipRecord) {
      return NextResponse.json(
        { error: 'Authoritative scholarship record not found. AI grounding requires verified database data.' },
        { status: 404 }
      );
    }

    // Fetch active intake version and requirements
    const [activeIntake] = await db
      .select()
      .from(intakes)
      .where(eq(intakes.scholarshipId, scholarshipRecord.id))
      .orderBy(desc(intakes.createdAt))
      .limit(1);

    let latestVersion: any = null;
    let reqRows: any[] = [];
    if (activeIntake) {
      const [v] = await db
        .select()
        .from(intakeVersions)
        .where(eq(intakeVersions.intakeId, activeIntake.id))
        .orderBy(desc(intakeVersions.versionNum))
        .limit(1);
      latestVersion = v;
      if (latestVersion) {
        reqRows = await db
          .select()
          .from(requirements)
          .where(eq(requirements.intakeVersionId, latestVersion.id));
      }
    }

    const params = {
      question,
      scholarshipName: scholarshipRecord.name,
      providerName: providerRecord?.name || 'Verified Provider',
      description: scholarshipRecord.description || '',
      sourceUrl: latestVersion?.sourceUrl || providerRecord?.url || '',
      openDate: activeIntake?.openDate || 'TBA',
      closeDate: activeIntake?.closeDate || 'TBA',
      requirementsSummary: reqRows.map((r) => r.name),
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
