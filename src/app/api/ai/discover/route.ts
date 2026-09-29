import { NextRequest, NextResponse } from 'next/server';
import { aiDiscoverFilters } from '@/lib/ai/gemini-service';
import { db } from '@/db';
import { scholarships, providers, intakes } from '@/db/schema';
import { ilike, or, and, inArray, desc, eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const filters = await aiDiscoverFilters(prompt);

    // Build database query
    let whereClause: any = inArray(intakes.status, ['published', 'closed']);

    const conditions = [];

    if (filters.providerName) {
      conditions.push(ilike(providers.name, `%${filters.providerName}%`));
    }

    if (filters.fieldOfStudy && filters.fieldOfStudy !== 'General') {
      conditions.push(
        or(
          ilike(scholarships.description, `%${filters.fieldOfStudy}%`),
          ilike(scholarships.name, `%${filters.fieldOfStudy}%`)
        )
      );
    }

    if (conditions.length > 0) {
      whereClause = and(whereClause, or(...conditions));
    }

    const results = await db
      .select({
        id: scholarships.id,
        scholarshipName: scholarships.name,
        providerName: providers.name,
        description: scholarships.description,
        status: intakes.status,
        openDate: intakes.openDate,
        closeDate: intakes.closeDate,
      })
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
      .where(whereClause)
      .orderBy(desc(intakes.createdAt))
      .limit(9);

    // Deduplicate
    const unique = new Map();
    for (const r of results) {
      if (!unique.has(r.id)) {
        unique.set(r.id, r);
      }
    }

    return NextResponse.json({
      filters,
      scholarships: Array.from(unique.values()),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Discovery error' }, { status: 500 });
  }
}
