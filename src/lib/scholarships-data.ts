import { db } from '../db';
import { scholarships, providers, intakes, intakeVersions, requirements } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RequirementNode } from '../domain/schema';

export interface ScholarshipWithRules {
  id: string;
  name: string;
  description: string;
  providerId: string;
  providerName: string;
  providerUrl?: string;
  intakeId: string;
  intakeStatus: string;
  openDate: string | null;
  closeDate: string | null;
  intakeYear?: number;
  versionId?: string;
  versionNum?: number;
  ruleAst: RequirementNode | null;
  requirementName: string | null;
}

/**
 * Fetches all published scholarships along with their latest intake,
 * intake version, and parsed JSONB requirement rule AST.
 * Works across both production PostgreSQL and preview in-memory DB.
 */
export async function getPublishedScholarshipsWithRules(): Promise<ScholarshipWithRules[]> {
  try {
    // 1. Fetch scholarships with provider information
    const scholarshipList = await db
      .select({
        id: scholarships.id,
        name: scholarships.name,
        description: scholarships.description,
        providerId: scholarships.providerId,
        providerName: providers.name,
        providerUrl: providers.url,
      })
      .from(scholarships)
      .innerJoin(providers, eq(scholarships.providerId, providers.id));

    // 2. Fetch all intakes
    const intakeList = await db.select().from(intakes);

    // 3. Fetch all intake versions
    const versionList = await db.select().from(intakeVersions);

    // 4. Fetch all requirements
    const requirementList = await db.select().from(requirements);

    // Index mappings: strictly only published, open, or closed intakes (DRAFT, IN_REVIEW, ARCHIVED, SUPERSEDED excluded)
    const VALID_STATUSES = new Set(['published', 'open', 'closed']);
    const intakeByScholarshipId = new Map<string, any>();
    for (const item of intakeList) {
      if (VALID_STATUSES.has(item.status)) {
        const existing = intakeByScholarshipId.get(item.scholarshipId);
        // Prefer published/open over closed, or the more recently created intake
        if (!existing || (existing.status === 'closed' && item.status !== 'closed')) {
          intakeByScholarshipId.set(item.scholarshipId, item);
        }
      }
    }

    const versionByIntakeId = new Map<string, any>();
    for (const ver of versionList) {
      const existing = versionByIntakeId.get(ver.intakeId);
      if (!existing || (ver.versionNum && existing.versionNum && ver.versionNum > existing.versionNum)) {
        versionByIntakeId.set(ver.intakeId, ver);
      }
    }

    const reqByVersionId = new Map<string, any>();
    for (const req of requirementList) {
      reqByVersionId.set(req.intakeVersionId, req);
    }

    const result: ScholarshipWithRules[] = [];

    for (const s of scholarshipList) {
      const intake = intakeByScholarshipId.get(s.id);
      if (!intake) continue;

      const version = versionByIntakeId.get(intake.id);
      const req = version ? reqByVersionId.get(version.id) : null;

      result.push({
        id: s.id,
        name: s.name,
        description: s.description || '',
        providerId: s.providerId,
        providerName: s.providerName,
        providerUrl: s.providerUrl || undefined,
        intakeId: intake.id,
        intakeStatus: intake.status,
        openDate: intake.openDate,
        closeDate: intake.closeDate,
        intakeYear: intake.year,
        versionId: version?.id,
        versionNum: version?.versionNum,
        ruleAst: (req?.ruleAst as RequirementNode) || null,
        requirementName: req?.name || null,
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to load published scholarships with rules:', error);
    return [];
  }
}
