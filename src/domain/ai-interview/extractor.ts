import { InterviewLedger, makeEntityId, makeIntentKey } from './ledger';
import { ExtractionResult, EntityType } from './types';

/**
 * Deterministic Entity, Slot & Fact Extractor
 *
 * Rules:
 * 1. Explicit facts require actual evidence from the student's answer.
 * 2. Information volunteered about CampusFind attaches ONLY to project|campusfind.
 * 3. Information volunteered about Health Lane attaches ONLY to experience|health_lane.
 * 4. Never invent unsupported skills, metrics, or frameworks.
 * 5. Declared none (e.g. "I don't have any work experience") cleanly marks the slot 'declared_none'.
 */

export class DeterministicExtractor {
  public extract(answer: string, ledger: InterviewLedger): ExtractionResult {
    const text = answer.trim();
    const lower = text.toLowerCase();

    const entities: any[] = [];
    const slots: any[] = [];
    const facts: any[] = [];
    const resolvedIntentKeys: string[] = [];
    const declaredNoneCategories: EntityType[] = [];

    // -------------------------------------------------------------
    // 1. DECLARED NONE DETECTION (e.g. Work Experience)
    // -------------------------------------------------------------
    const noExpPatterns = [
      /\bno\s+work\s+experience\b/i,
      /\bdon'?t\s+have\s+(?:any\s+)?(?:work\s+)?experience\b/i,
      /\bno\s+experience\s+yet\b/i,
      /\bhaven'?t\s+worked\s+yet\b/i,
      /\bnever\s+worked\b/i,
    ];

    if (noExpPatterns.some((p) => p.test(text))) {
      ledger.getOrCreateEntity('experience', 'general', 'Work Experience');
      const slot = ledger.setSlot('experience|general', 'declared_none', 'declared_none', true);
      slots.push(slot);
      ledger.resolveIntent('experience|general|overview');
      declaredNoneCategories.push('experience');
      resolvedIntentKeys.push('experience|general|overview');
    }

    // -------------------------------------------------------------
    // 2. EDUCATION EXTRACTION
    // -------------------------------------------------------------
    // Match common Malaysian Universities or general terms
    const uniPatterns: Array<{ name: string; key: string; regex: RegExp }> = [
      { name: 'Universiti Pertahanan Nasional Malaysia (UPNM)', key: 'upnm', regex: /\b(?:universiti\s+pertahanan\s+nasional\s+malaysia|upnm)\b/i },
      { name: 'Universiti Malaya (UM)', key: 'um', regex: /\b(?:universiti\s+malaya|um)\b/i },
      { name: 'Universiti Teknologi Malaysia (UTM)', key: 'utm', regex: /\b(?:universiti\s+teknologi\s+malaysia|utm)\b/i },
      { name: 'Universiti Sains Malaysia (USM)', key: 'usm', regex: /\b(?:universiti\s+sains\s+malaysia|usm)\b/i },
      { name: 'Universiti Kebangsaan Malaysia (UKM)', key: 'ukm', regex: /\b(?:universiti\s+kebangsaan\s+malaysia|ukm)\b/i },
      { name: 'Universiti Putra Malaysia (UPM)', key: 'upm', regex: /\b(?:universiti\s+putra\s+malaysia|upm)\b/i },
      { name: 'Taylor\'s University', key: 'taylors', regex: /\b(?:taylor'?s(?:\s+university)?)\b/i },
      { name: 'Sunway University', key: 'sunway', regex: /\b(?:sunway(?:\s+university)?)\b/i },
      { name: 'Universiti Tenaga Nasional (UNITEN)', key: 'uniten', regex: /\b(?:uniten|universiti\s+tenaga\s+nasional)\b/i },
      { name: 'Multimedia University (MMU)', key: 'mmu', regex: /\b(?:mmu|multimedia\s+university)\b/i },
    ];

    let matchedUni: { name: string; key: string } | null = null;
    for (const uni of uniPatterns) {
      if (uni.regex.test(text)) {
        matchedUni = { name: uni.name, key: uni.key };
        break;
      }
    }

    // Generic university match if named e.g. "Universiti ..."
    if (!matchedUni) {
      const genUniMatch = text.match(/\b(Universiti\s+[A-Za-z\s]+|University\s+of\s+[A-Za-z\s]+|[A-Za-z\s]+\s+University|[A-Za-z\s]+\s+College)\b/i);
      if (genUniMatch) {
        const raw = genUniMatch[1].trim();
        matchedUni = { name: raw, key: raw.toLowerCase().replace(/[^a-z0-9]+/g, '_') };
      }
    }

    // Degree matching
    const degreeMatch = text.match(/\b(Bachelor(?:\s+of)?(?:\s+[A-Za-z\s]+)?(?:\s+with\s+Honours|\s+with\s+Hons)?|Diploma(?:\s+in)?\s+[A-Za-z\s]+|Master(?:\s+of)?\s+[A-Za-z\s]+|PhD(?:\s+in)?\s+[A-Za-z\s]+|Foundation(?:\s+in)?\s+[A-Za-z\s]+)\b/i);

    // CGPA matching (e.g. 3.98 or CGPA is 3.98)
    const cgpaMatch = text.match(/\b(?:cgpa|gpa|pngk)?\s*(?:is|of|:)?\s*([2-4]\.\d{1,2})\b/i);

    // Start Year matching (e.g. 2025, started in 2025)
    const yearMatch = text.match(/\b(?:started|enrolled|commenced|since|in)?\s*(20[12]\d)\b/i);

    // Field of study matching
    const fieldMatch = text.match(/\b(?:in|of)\s+(Computer\s+Science|Information\s+Technology|Software\s+Engineering|Electrical\s+Engineering|Mechanical\s+Engineering|Civil\s+Engineering|Accounting|Finance|Business\s+Administration|Data\s+Science|Artificial\s+Intelligence)\b/i);

    if (matchedUni || degreeMatch || cgpaMatch) {
      const uniKey = matchedUni ? matchedUni.key : (ledger.getEntitiesByType('education')[0]?.normalizedKey || 'primary');
      const uniName = matchedUni ? matchedUni.name : (ledger.getEntitiesByType('education')[0]?.displayName || 'University');
      const eduEntity = ledger.getOrCreateEntity('education', uniKey, uniName);
      entities.push(eduEntity);

      // Institution slot
      if (matchedUni) {
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'institution',
          value: matchedUni.name,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'institution'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'institution');
        ledger.resolveIntent(intentKey);
        resolvedIntentKeys.push(intentKey);
      }

      // Degree slot
      if (degreeMatch) {
        const degValue = degreeMatch[0].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'degree',
          value: degValue,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'degree'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'degree');
        ledger.resolveIntent(intentKey);
        resolvedIntentKeys.push(intentKey);

        // Also extract field of study if in degree title
        if (!fieldMatch && /Computer Science/i.test(degValue)) {
          ledger.addFact({
            entityId: eduEntity.id,
            slot: 'field_of_study',
            value: 'Computer Science',
            rawEvidence: degValue,
          });
          ledger.resolveIntent(makeIntentKey('education', eduEntity.normalizedKey, 'field_of_study'));
        }
      }

      // Field of study slot
      if (fieldMatch) {
        const fieldValue = fieldMatch[1].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'field_of_study',
          value: fieldValue,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'field_of_study'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'field_of_study');
        ledger.resolveIntent(intentKey);
        resolvedIntentKeys.push(intentKey);
      }

      // Start year slot
      if (yearMatch) {
        const startYear = yearMatch[1];
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'start_year',
          value: startYear,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'start_year'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'start_year');
        ledger.resolveIntent(intentKey);
        resolvedIntentKeys.push(intentKey);
      }

      // CGPA slot
      if (cgpaMatch) {
        const cgpaValue = cgpaMatch[1];
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'cgpa',
          value: cgpaValue,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'cgpa'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'cgpa');
        ledger.resolveIntent(intentKey);
        resolvedIntentKeys.push(intentKey);
      }

      ledger.resolveIntent('education|general|overview');
      resolvedIntentKeys.push('education|general|overview');
    }

    // -------------------------------------------------------------
    // 3. WORK EXPERIENCE EXTRACTION (e.g. Health Lane Family Pharmacy)
    // -------------------------------------------------------------
    const healthLaneMatch = text.match(/\b(Health\s+Lane(?:\s+Family)?(?:\s+Pharmacy)?)\b/i);
    const genericWorkMatch = text.match(/\b(?:worked\s+at|work\s+at|employed\s+at|intern\s+at|internship\s+at)\s+([A-Za-z0-9\s&]+?)(?=[,\.\n]|\s+as|\s+where|\s+since|$)/i);

    if (healthLaneMatch || genericWorkMatch) {
      const employerName = healthLaneMatch ? 'Health Lane Family Pharmacy' : genericWorkMatch![1].trim();
      const normKey = healthLaneMatch ? 'health_lane' : employerName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

      const expEntity = ledger.getOrCreateEntity('experience', normKey, employerName);
      entities.push(expEntity);

      const fact = ledger.addFact({
        entityId: expEntity.id,
        slot: 'employer',
        value: employerName,
        rawEvidence: text,
      });
      facts.push(fact);
      slots.push(ledger.getSlot(expEntity.id, 'employer'));
      ledger.resolveIntent(makeIntentKey('experience', normKey, 'employer'));
      ledger.resolveIntent('experience|general|overview');

      // Check if position was also mentioned (e.g. part-time, pharmacy assistant)
      if (/part-time/i.test(text)) {
        ledger.addFact({
          entityId: expEntity.id,
          slot: 'position',
          value: 'Part-time Associate',
          rawEvidence: text,
        });
        ledger.resolveIntent(makeIntentKey('experience', normKey, 'position'));
      }
    }

    // -------------------------------------------------------------
    // 4. PROJECT EXTRACTION (e.g. CampusFind)
    // -------------------------------------------------------------
    const campusFindMatch = text.match(/\b(CampusFind)\b/i);
    const genericProjectMatch = text.match(/\b(?:project\s+called|project\s+named|worked\s+on\s+a\s+project\s+called|developed\s+a\s+project\s+called)\s+([A-Za-z0-9\s]+?)(?=[,\.\n]|\s+where|\s+which|$)/i);

    if (campusFindMatch || genericProjectMatch) {
      const projectName = campusFindMatch ? 'CampusFind' : genericProjectMatch![1].trim();
      const normKey = campusFindMatch ? 'campusfind' : projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

      const projEntity = ledger.getOrCreateEntity('project', normKey, projectName);
      entities.push(projEntity);

      const nameFact = ledger.addFact({
        entityId: projEntity.id,
        slot: 'name',
        value: projectName,
        rawEvidence: text,
      });
      facts.push(nameFact);
      slots.push(ledger.getSlot(projEntity.id, 'name'));
      ledger.resolveIntent(makeIntentKey('project', normKey, 'name'));
      ledger.resolveIntent('project|general|overview');

      // Check role in project (e.g. project manager)
      const pmMatch = text.match(/\b(?:project\s+manager|lead\s+developer|full\s+stack\s+developer|frontend\s+developer|backend\s+developer)\b/i);
      if (pmMatch) {
        const roleFact = ledger.addFact({
          entityId: projEntity.id,
          slot: 'role',
          value: pmMatch[0].trim(),
          rawEvidence: text,
        });
        facts.push(roleFact);
        slots.push(ledger.getSlot(projEntity.id, 'role'));
        ledger.resolveIntent(makeIntentKey('project', normKey, 'role'));
      }

      // Check description (e.g. university lost and found system)
      const descMatch = text.match(/\b(university\s+lost\s+and\s+found\s+system|lost\s+and\s+found\s+system|web\s+application|mobile\s+app)\b/i);
      if (descMatch) {
        const descFact = ledger.addFact({
          entityId: projEntity.id,
          slot: 'description',
          value: descMatch[0].trim(),
          rawEvidence: text,
        });
        facts.push(descFact);
        slots.push(ledger.getSlot(projEntity.id, 'description'));
        ledger.resolveIntent(makeIntentKey('project', normKey, 'description'));
      }
    }

    // -------------------------------------------------------------
    // 5. TECHNICAL SKILLS EXTRACTION
    // -------------------------------------------------------------
    const techSkills = [
      'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
      'C++', 'C#', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Git',
      'HTML', 'CSS', 'Tailwind', 'Linux', 'AWS', 'Flutter', 'Kotlin', 'Swift'
    ];

    const foundSkills: string[] = [];
    for (const skill of techSkills) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
      if (reg.test(text)) {
        foundSkills.push(skill);
      }
    }

    if (foundSkills.length > 0) {
      const skillEntity = ledger.getOrCreateEntity('skill', 'self', 'Technical Skills');
      const fact = ledger.addFact({
        entityId: skillEntity.id,
        slot: 'technical',
        value: foundSkills,
        rawEvidence: text,
      });
      facts.push(fact);
      slots.push(ledger.getSlot(skillEntity.id, 'technical'));
      ledger.resolveIntent('skill|self|technical');
      resolvedIntentKeys.push('skill|self|technical');
    }

    return {
      entities,
      slots,
      facts,
      resolvedIntentKeys,
      declaredNoneCategories,
    };
  }
}

export const deterministicExtractor = new DeterministicExtractor();
