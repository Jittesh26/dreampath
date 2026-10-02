import { NextRequest, NextResponse } from 'next/server';
import { aiCompareScholarships } from '@/lib/ai/gemini-service';
import { db } from '@/db';
import { scholarships as scholarshipsTable, providers, intakes } from '@/db/schema';
import { inArray, eq, desc } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { scholarships } = await req.json();
    if (!scholarships || !Array.isArray(scholarships) || scholarships.length === 0) {
      return NextResponse.json({ error: 'Scholarships list is required' }, { status: 400 });
    }

    const ids = scholarships.map((s: any) => (typeof s === 'string' ? s : s?.id)).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Valid scholarship IDs are required' }, { status: 400 });
    }

    // Resolve authoritative data from the database
    const dbRows = await db
      .select({
        id: scholarshipsTable.id,
        name: scholarshipsTable.name,
        provider: providers.name,
        description: scholarshipsTable.description,
        intakeId: intakes.id,
        openDate: intakes.openDate,
        closeDate: intakes.closeDate,
      })
      .from(scholarshipsTable)
      .innerJoin(providers, eq(scholarshipsTable.providerId, providers.id))
      .innerJoin(intakes, eq(scholarshipsTable.id, intakes.scholarshipId))
      .where(inArray(scholarshipsTable.id, ids))
      .orderBy(desc(intakes.createdAt));

    const uniqueMap = new Map<string, any>();
    for (const r of dbRows) {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r);
      }
    }

    const authoritativeScholarships = Array.from(uniqueMap.values()).map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      description: r.description || '',
      openDate: r.openDate || 'TBA',
      closeDate: r.closeDate || 'TBA',
    }));

    if (authoritativeScholarships.length === 0) {
      return NextResponse.json({ error: 'No matching authoritative scholarships found' }, { status: 404 });
    }

    const comparison = await aiCompareScholarships(authoritativeScholarships);
    return NextResponse.json(comparison);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Comparison error' }, { status: 500 });
  }
}

