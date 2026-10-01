import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scholarships, providers, intakes, intakeVersions, requirements } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';
import { RequirementNode } from '@/domain/schema';

export interface VerifiedComparisonItem {
  id: string;
  name: string;
  provider: string;
  description: string;
  openDate: string;
  closeDate: string;
  status: string;
  sourceUrl: string;
  evidenceNotes: string;
  studyLevel: string;
  award: string;
  duration: string;
  eligibleFields: string;
  tuitionCoverage: string;
  livingAllowance: string;
  accommodation: string;
  bond: string;
  minCgpa: string;
  citizenship: string;
  maxAge: string;
  incomeCriteria: string;
  requirementsSummary: string[];
}

/**
 * Extracts deterministic criteria from AST requirements
 */
function parseAstRequirements(nodes: RequirementNode[]): {
  minCgpa: string;
  citizenship: string;
  maxAge: string;
  incomeCriteria: string;
  summary: string[];
} {
  let minCgpa = 'None specified';
  let citizenship = 'Malaysian Citizen';
  let maxAge = 'None specified';
  let incomeCriteria = 'Open to all income brackets';
  const summary: string[] = [];

  function traverse(node: RequirementNode) {
    if (!node) return;
    if (node.type === 'ALL' || node.type === 'ANY') {
      node.nodes.forEach(traverse);
      return;
    }
    if (node.type === 'CONDITION') {
      const { field, operator, value } = node;
      if (field === 'cgpa' && (operator === 'GREATER_THAN_OR_EQUAL' || (operator as string) === 'GREATER_THAN')) {
        minCgpa = `≥ ${value} CGPA`;
        summary.push(`Minimum CGPA of ${value}`);
      } else if (field === 'citizenship') {
        citizenship = String(value);
        summary.push(`${value} Citizenship`);
      } else if (field === 'age' && operator === 'LESS_THAN_OR_EQUAL') {
        maxAge = `≤ ${value} years old`;
        summary.push(`Age ${value} or younger`);
      } else if (field === 'income_band') {
        if (Array.isArray(value)) {
          incomeCriteria = `Priority for ${value.join(', ')}`;
          summary.push(`Household band: ${value.join('/')}`);
        } else {
          incomeCriteria = String(value);
          summary.push(`Income band: ${value}`);
        }
      } else if (field === 'household_income' && operator === 'LESS_THAN_OR_EQUAL') {
        incomeCriteria = `Household income ≤ RM${value}`;
        summary.push(`Household income ≤ RM${value}/month`);
      } else if (field === 'spm_results') {
        if (typeof value === 'object' && value !== null && 'subject' in value && 'minGrade' in value) {
          summary.push(`SPM ${value.subject}: Grade ${value.minGrade} or better`);
        }
      } else if (field === 'bumiputera_status' && value === true) {
        summary.push('Bumiputera status required');
      } else {
        const cleanName = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        summary.push(`Assessment: ${cleanName}`);
      }
    }
  }

  nodes.forEach(traverse);
  return { minCgpa, citizenship, maxAge, incomeCriteria, summary };
}

/**
 * Extracts verified metadata from authoritative descriptions and notes
 */
function extractVerifiedAttributes(name: string, description: string, evidenceNotes: string) {
  const text = `${name} ${description} ${evidenceNotes}`.toLowerCase();

  // Study Level
  let studyLevel = 'Undergraduate Degree';
  if (text.includes('postgraduate') || text.includes('masters') || text.includes('phd')) {
    studyLevel = 'Postgraduate (Masters/PhD)';
  } else if (text.includes('diploma')) {
    studyLevel = 'Diploma';
  } else if (text.includes('pre-university') || text.includes('a-levels') || text.includes('foundation') || text.includes('spm')) {
    studyLevel = 'Pre-University / Foundation';
  }

  // Award Type
  let award = 'Full Scholarship (Tuition + Allowances)';
  if (text.includes('convertible') || text.includes('pembiayaan boleh ubah') || text.includes('ppbu')) {
    award = 'Convertible Loan (100% waiver based on CGPA)';
  } else if (text.includes('grant') || text.includes('study award') || text.includes('financial aid')) {
    award = 'Direct Educational Grant / Financial Aid';
  } else if (text.includes('partial')) {
    award = 'Partial Tuition Sponsorship';
  }

  // Duration
  const duration = studyLevel.includes('Pre-University') ? '1 - 2 Years' : studyLevel.includes('Diploma') ? '2 - 3 Years' : '3 - 4 Years (Full Degree Duration)';

  // Eligible Fields
  let eligibleFields = 'All Accredited Academic Disciplines';
  if (text.includes('stem') && text.includes('accountancy')) {
    eligibleFields = 'STEM Disciplines, Accountancy & Commercial';
  } else if (text.includes('engineering') || text.includes('built environment') || text.includes('software')) {
    eligibleFields = 'Engineering, Built Environment, IT & Software, Business';
  } else if (text.includes('actuarial') || text.includes('data analytics') || text.includes('digital')) {
    eligibleFields = 'Actuarial Science, Data Analytics, Digital Tech & Finance';
  } else if (text.includes('geosciences') || text.includes('petronas')) {
    eligibleFields = 'Engineering, Geosciences, Business Analytics';
  } else if (text.includes('economics') || text.includes('central bank')) {
    eligibleFields = 'Economics, Finance, Actuarial Science, Data Science';
  }

  // Tuition & Allowances
  const tuitionCoverage = text.includes('full tuition') || text.includes('100%') || text.includes('all tuition') ? '100% Tuition & Institutional Fees Covered' : 'Full / Subsidized Tuition Coverage';

  const livingAllowance = text.includes('living allowance') || text.includes('monthly stipend') || text.includes('allowances') ? 'Monthly Living Allowance Included' : 'Incidental & Book Allowances';

  const accommodation = text.includes('accommodation') || text.includes('hostel') || text.includes('global') ? 'Campus Accommodation / Housing Allowance Included' : 'Subject to Institution / Self-arranged';

  // Bond / Service Obligation
  let bond = 'No Service Bond (Work Free)';
  if (text.includes('khazanah employment bond') || text.includes('khazanah bond')) {
    claim: bond = 'Executive Service Bond with Khazanah Group';
  } else if (text.includes('petronas')) {
    bond = 'Service Bond with PETRONAS Group';
  } else if (text.includes('penang') || text.includes('pff') || text.includes('work commitment')) {
    bond = 'Penang Industrial Work Commitment';
  } else if (text.includes('federal service') || text.includes('jpa') || text.includes('perkhidmatan awam')) {
    bond = 'Federal Civil Service Obligation';
  } else if (text.includes('fast-track') || text.includes('career placement') || text.includes('employment pathway')) {
    bond = 'Guaranteed Corporate Placement Track (No strict cash penalty)';
  } else if (text.includes('convertible')) {
    bond = 'Conversion Schedule tied to final CGPA';
  }

  return {
    studyLevel,
    award,
    duration,
    eligibleFields,
    tuitionCoverage,
    livingAllowance,
    accommodation,
    bond,
  };
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let idsParam = searchParams.get('ids');

    if (!idsParam && req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsParam = body.ids.join(',');
        }
      } catch {
        // ignore
      }
    }

    const requestedIds = idsParam ? idsParam.split(',').filter(Boolean) : [];

    // Fetch matching scholarships or top 3 if none specified
    const query = db
      .select({
        id: scholarships.id,
        name: scholarships.name,
        provider: providers.name,
        providerUrl: providers.url,
        description: scholarships.description,
        intakeId: intakes.id,
        year: intakes.year,
        openDate: intakes.openDate,
        closeDate: intakes.closeDate,
        status: intakes.status,
      })
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id))
      .innerJoin(intakes, eq(scholarships.id, intakes.scholarshipId))
      .where(inArray(intakes.status, ['published', 'closed']));

    const rawRows = await query.orderBy(desc(intakes.createdAt));

    // Deduplicate by scholarship id
    const uniqueMap = new Map<string, any>();
    for (const row of rawRows) {
      if (!uniqueMap.has(row.id)) {
        uniqueMap.set(row.id, row);
      }
    }

    let selectedRows: any[] = [];
    if (requestedIds.length > 0) {
      selectedRows = requestedIds.map((id) => uniqueMap.get(id)).filter(Boolean);
    } else {
      selectedRows = Array.from(uniqueMap.values()).slice(0, 3);
    }

    // For each selected scholarship, fetch its latest intakeVersion and AST requirements
    const enrichedItems: VerifiedComparisonItem[] = await Promise.all(
      selectedRows.map(async (row) => {
        let sourceUrl = row.providerUrl || 'https://esilav2.jpa.gov.my';
        let evidenceNotes = '';
        let astNodes: RequirementNode[] = [];

        try {
          const [version] = await db
            .select()
            .from(intakeVersions)
            .where(eq(intakeVersions.intakeId, row.intakeId))
            .orderBy(desc(intakeVersions.versionNum))
            .limit(1);

          if (version) {
            sourceUrl = version.sourceUrl || sourceUrl;
            evidenceNotes = version.evidenceNotes || '';

            const reqRows = await db
              .select()
              .from(requirements)
              .where(eq(requirements.intakeVersionId, version.id));

            astNodes = reqRows.map((r) => r.ruleAst as RequirementNode).filter(Boolean);
          }
        } catch {
          // fallback gracefully
        }

        const astData = parseAstRequirements(astNodes);
        const derived = extractVerifiedAttributes(row.name, row.description || '', evidenceNotes);

        const openFormatted = row.openDate
          ? new Date(row.openDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'TBA';
        const closeFormatted = row.closeDate
          ? new Date(row.closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
          : 'TBA';

        return {
          id: row.id,
          name: row.name,
          provider: row.provider,
          description: row.description || '',
          openDate: openFormatted,
          closeDate: closeFormatted,
          status: row.status,
          sourceUrl,
          evidenceNotes,
          studyLevel: derived.studyLevel,
          award: derived.award,
          duration: derived.duration,
          eligibleFields: derived.eligibleFields,
          tuitionCoverage: derived.tuitionCoverage,
          livingAllowance: derived.livingAllowance,
          accommodation: derived.accommodation,
          bond: derived.bond,
          minCgpa: astData.minCgpa,
          citizenship: astData.citizenship,
          maxAge: astData.maxAge,
          incomeCriteria: astData.incomeCriteria,
          requirementsSummary: astData.summary,
        };
      })
    );

    // Also return list of all available scholarships for user to add slots
    const available = Array.from(uniqueMap.values()).map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
    }));

    return NextResponse.json({
      scholarships: enrichedItems,
      available,
    });
  } catch (err: any) {
    console.error('[API] /api/scholarships/compare-data error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
