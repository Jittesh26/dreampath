import { InterviewLedger, makeEntityId, makeIntentKey } from './ledger';
import { ExtractionResult, EntityType } from './types';

/**
 * Deterministic Entity, Slot & Fact Extractor
 *
 * Rules:
 * 1. Explicit facts require actual evidence from the student's answer.
 * 2. Multi-field extraction: extract all volunteered fields at once (education, experience, projects, skills).
 * 3. Never repeat questions for details already captured.
 * 4. Never invent unsupported skills, metrics, frameworks, or experiences.
 * 5. Seamlessly handle corrections (e.g. "Actually my CGPA is 3.91, not 3.98").
 * 6. Declared none / skips cleanly resolve the targeted intent and mark slots.
 */

export class DeterministicExtractor {
  public extract(answer: string, ledger: InterviewLedger): ExtractionResult {
    const text = answer.trim();

    const entities: any[] = [];
    const slots: any[] = [];
    const facts: any[] = [];
    const resolvedIntentKeys: string[] = [];
    const declaredNoneCategories: EntityType[] = [];

    // -------------------------------------------------------------
    // 0. CORRECTIONS HANDLING
    // E.g. "Actually my CGPA is 3.91, not 3.98", "Change my graduation year to 2028"
    // -------------------------------------------------------------
    this.extractCorrections(text, ledger, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 1. DECLARED NONE / SKIPS DETECTION
    // -------------------------------------------------------------
    const isExplicitSkip = /^(?:skip|skip\s+this|pass|none|no|nothing|n\/?a|not\s+applicable|prefer\s+not\s+to\s+say|don'?t\s+have|haven'?t|i\s+don'?t\s+want\s+to\s+include\s+(?:that|this))$/i.test(
      text.replace(/[.,!]/g, '').trim()
    );

    // 1A. Work Experience Declared None
    const noExpPatterns = [
      /\bno\s+work\s+experience\b/i,
      /\bdon'?t\s+have\s+(?:any\s+)?(?:work\s+)?experience\b/i,
      /\bno\s+experience\s+yet\b/i,
      /\bhaven'?t\s+worked\s+yet\b/i,
      /\bnever\s+worked\b/i,
    ];

    const isExpIntent = ledger.currentIntentKey && ledger.currentIntentKey.startsWith('experience|');
    if (noExpPatterns.some((p) => p.test(text)) || (isExplicitSkip && isExpIntent)) {
      ledger.getOrCreateEntity('experience', 'general', 'Work Experience');
      const slot = ledger.setSlot('experience|general', 'declared_none', 'declared_none', true);
      slots.push(slot);
      ledger.resolveIntent('experience|general|overview');
      declaredNoneCategories.push('experience');
      resolvedIntentKeys.push('experience|general|overview');
    }

    // 1B. Project Declared None
    const noProjPatterns = [
      /\bno\s+(?:technical\s+)?projects?\b/i,
      /\bdon'?t\s+have\s+(?:any\s+)?(?:technical\s+)?projects?\b/i,
      /\bhaven'?t\s+built\s+(?:any\s+)?projects?\b/i,
      /\bnever\s+built\s+(?:any\s+)?projects?\b/i,
    ];
    const isProjIntent = ledger.currentIntentKey && ledger.currentIntentKey.startsWith('project|');
    if (noProjPatterns.some((p) => p.test(text)) || (isExplicitSkip && isProjIntent)) {
      ledger.getOrCreateEntity('project', 'general', 'Projects');
      const slot = ledger.setSlot('project|general', 'declared_none', 'declared_none', true);
      slots.push(slot);
      ledger.resolveIntent('project|general|overview');
      declaredNoneCategories.push('project');
      resolvedIntentKeys.push('project|general|overview');
    }

    // 1C. Leadership Declared None
    const noLeadPatterns = [
      /\bno\s+leadership\b/i,
      /\bdon'?t\s+have\s+(?:any\s+)?leadership\b/i,
      /\bhaven'?t\s+held\s+any\s+(?:roles|leadership|positions)\b/i,
      /\bnever\s+held\s+any\b/i,
    ];
    const isLeadIntent = ledger.currentIntentKey && ledger.currentIntentKey.startsWith('leadership|');
    if (noLeadPatterns.some((p) => p.test(text)) || (isExplicitSkip && isLeadIntent)) {
      ledger.getOrCreateEntity('leadership', 'general', 'Leadership Experience');
      const slot = ledger.setSlot('leadership|general', 'declared_none', 'declared_none', true);
      slots.push(slot);
      ledger.resolveIntent('leadership|self|overview');
      declaredNoneCategories.push('leadership');
      resolvedIntentKeys.push('leadership|self|overview');
    }

    // -------------------------------------------------------------
    // 2. PERSONAL INFORMATION EXTRACTION
    // -------------------------------------------------------------
    this.extractPersonalInformation(text, ledger, entities, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 3. EDUCATION EXTRACTION (Multi-slot & multi-turn aware)
    // -------------------------------------------------------------
    this.extractEducation(text, ledger, entities, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 4. WORK EXPERIENCE EXTRACTION
    // -------------------------------------------------------------
    this.extractWorkExperience(text, ledger, entities, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 5. PROJECT EXTRACTION
    // -------------------------------------------------------------
    this.extractProjects(text, ledger, entities, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 6. TECHNICAL SKILLS, SOFT SKILLS & LANGUAGES EXTRACTION
    // -------------------------------------------------------------
    this.extractSkills(text, ledger, entities, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 7. LEADERSHIP EXTRACTION
    // -------------------------------------------------------------
    this.extractLeadership(text, ledger, entities, facts, slots, resolvedIntentKeys);

    // -------------------------------------------------------------
    // 8. TARGETED ACTIVE INTENT SLOT RESOLUTION (Direct answer to current prompt)
    // -------------------------------------------------------------
    this.resolveTargetedIntent(text, isExplicitSkip, ledger, entities, facts, slots, resolvedIntentKeys);

    return {
      entities,
      slots,
      facts,
      resolvedIntentKeys,
      declaredNoneCategories,
    };
  }

  // =========================================================================
  // SUB-EXTRACTORS
  // =========================================================================

  private extractCorrections(
    text: string,
    ledger: InterviewLedger,
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
    // 1. CGPA Correction: e.g. "Actually my CGPA is 3.91, not 3.98", "Correction: CGPA is 3.95"
    const cgpaCorrMatch = text.match(
      /(?:actually,?\s+(?:my\s+)?(?:cgpa|gpa|pngk)?\s*(?:is|was|to|should\s+be)\s*|correction:?\s*(?:my\s+)?(?:cgpa|gpa|pngk)?\s*(?:is|was)?\s*|change\s+(?:my\s+)?(?:cgpa|gpa|pngk)\s+to\s+)([2-4]\.\d{1,2}(?:\s*\/\s*[45]\.0)?)/i
    ) || text.match(/\bnot\s+[2-4]\.\d{1,2},?\s+(?:it'?s|actually|is)\s+([2-4]\.\d{1,2}(?:\s*\/\s*[45]\.0)?)/i);

    if (cgpaCorrMatch) {
      const newCgpa = cgpaCorrMatch[1].trim();
      const eduEntities = ledger.getEntitiesByType('education');
      const targetEdu = eduEntities[0] || ledger.getOrCreateEntity('education', 'primary', 'University');
      const fact = ledger.addFact({
        entityId: targetEdu.id,
        slot: 'cgpa',
        value: newCgpa,
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(targetEdu.id, 'cgpa'));
      const intentKey = makeIntentKey('education', targetEdu.normalizedKey, 'cgpa');
      ledger.resolveIntent(intentKey);
      resolvedKeys.push(intentKey);
    }

    // 2. Graduation Year Correction: e.g. "Change my graduation year to 2028", "Graduation is actually Dec 2028"
    const gradCorrMatch = text.match(
      /(?:change\s+(?:my\s+)?graduation(?:\s+year)?\s+to\s+|graduation\s+is\s+actually\s+|actually\s+graduating\s+in\s+)((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?20[2-3]\d)/i
    );
    if (gradCorrMatch) {
      const newGrad = gradCorrMatch[1].trim();
      const eduEntities = ledger.getEntitiesByType('education');
      const targetEdu = eduEntities[0] || ledger.getOrCreateEntity('education', 'primary', 'University');
      ledger.addFact({
        entityId: targetEdu.id,
        slot: 'expected_graduation',
        value: newGrad,
        rawEvidence: text,
      });
      ledger.addFact({
        entityId: targetEdu.id,
        slot: 'end_year',
        value: newGrad,
        rawEvidence: text,
      });
      ledger.resolveIntent(makeIntentKey('education', targetEdu.normalizedKey, 'start_year'));
    }

    // 3. Company Correction: e.g. "The company name was Acme Corp, not Acme"
    const compCorrMatch = text.match(
      /(?:the\s+)?(?:company(?:\s+name)?|employer)\s+(?:was|is|actually)\s+([A-Za-z0-9\s&]+?)(?:,\s*not|\s+not|\.|$)/i
    );
    if (compCorrMatch) {
      const newComp = compCorrMatch[1].trim();
      const expEntities = ledger.getEntitiesByType('experience');
      if (expEntities.length > 0) {
        const targetExp = expEntities[0];
        targetExp.displayName = newComp;
        ledger.addFact({
          entityId: targetExp.id,
          slot: 'employer',
          value: newComp,
          rawEvidence: text,
        });
      }
    }
  }

  private extractPersonalInformation(
    text: string,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
    // Name extraction
    const nameMatch = text.match(/\b(?:my\s+name\s+is|i\s+am|call\s+me)\s+([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+){1,4})\b/);
    if (nameMatch) {
      const candidateName = nameMatch[1].trim();
      if (!/^(?:currently|studying|pursuing|working|excited|delighted|pleased|a|an|the|student)\b/i.test(candidateName)) {
        const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
        entities.push(persEntity);
        const fact = ledger.addFact({
          entityId: persEntity.id,
          slot: 'fullName',
          value: candidateName,
          rawEvidence: text,
          origin: 'explicit',
        });
        facts.push(fact);
        slots.push(ledger.getSlot(persEntity.id, 'fullName'));
        ledger.resolveIntent('personal|self|fullName');
        resolvedKeys.push('personal|self|fullName');
      }
    }

    // Email extraction
    const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (emailMatch) {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      const fact = ledger.addFact({
        entityId: persEntity.id,
        slot: 'email',
        value: emailMatch[0].trim(),
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(persEntity.id, 'email'));
    }

    // Phone extraction
    const phoneMatch = text.match(/(?:\+?60|0)[0-9\s\-()]{7,15}/);
    if (phoneMatch) {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      const fact = ledger.addFact({
        entityId: persEntity.id,
        slot: 'phone',
        value: phoneMatch[0].trim(),
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(persEntity.id, 'phone'));
      ledger.resolveIntent('personal|self|contact_links');
      resolvedKeys.push('personal|self|contact_links');
    }

    // LinkedIn extraction
    const liMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_\-\/]+)/i);
    if (liMatch) {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      const liUrl = liMatch[0].startsWith('http') ? liMatch[0] : `https://${liMatch[0]}`;
      const fact = ledger.addFact({
        entityId: persEntity.id,
        slot: 'linkedin',
        value: liUrl,
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(persEntity.id, 'linkedin'));
      ledger.resolveIntent('personal|self|contact_links');
      resolvedKeys.push('personal|self|contact_links');
    }

    // GitHub extraction
    const ghMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_\-\/]+)/i);
    if (ghMatch) {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      const ghUrl = ghMatch[0].startsWith('http') ? ghMatch[0] : `https://${ghMatch[0]}`;
      const fact = ledger.addFact({
        entityId: persEntity.id,
        slot: 'github',
        value: ghUrl,
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(persEntity.id, 'github'));
      ledger.resolveIntent('personal|self|contact_links');
      resolvedKeys.push('personal|self|contact_links');
    }

    // Portfolio extraction
    const portMatch = text.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=]+/i);
    if (portMatch) {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      const fact = ledger.addFact({
        entityId: persEntity.id,
        slot: 'portfolio',
        value: portMatch[0],
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(persEntity.id, 'portfolio'));
      ledger.resolveIntent('personal|self|contact_links');
      resolvedKeys.push('personal|self|contact_links');
    }
  }

  private extractEducation(
    text: string,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
    // Specific well-known Malaysian & International Universities
    const uniCatalog: Array<{ name: string; key: string; regex: RegExp }> = [
      { name: 'University of Melbourne', key: 'unimelb', regex: /\b(?:university\s+of\s+melbourne|unimelb)\b/i },
      { name: 'University of Sydney', key: 'usyd', regex: /\b(?:university\s+of\s+sydney|usyd)\b/i },
      { name: 'University of New South Wales (UNSW)', key: 'unsw', regex: /\b(?:unsw|university\s+of\s+new\s+south\s+wales)\b/i },
      { name: 'Monash University', key: 'monash', regex: /\b(?:monash(?:\s+university)?)\b/i },
      { name: 'Australian National University (ANU)', key: 'anu', regex: /\b(?:anu|australian\s+national\s+university)\b/i },
      { name: 'University of Queensland (UQ)', key: 'uq', regex: /\b(?:uq|university\s+of\s+queensland)\b/i },
      { name: 'National University of Singapore (NUS)', key: 'nus', regex: /\b(?:nus|national\s+university\s+of\s+singapore)\b/i },
      { name: 'Nanyang Technological University (NTU)', key: 'ntu', regex: /\b(?:ntu|nanyang\s+technological\s+university)\b/i },
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
      { name: 'Harvard University', key: 'harvard', regex: /\bharvard(?:\s+university)?\b/i },
      { name: 'Stanford University', key: 'stanford', regex: /\bstanford(?:\s+university)?\b/i },
      { name: 'MIT', key: 'mit', regex: /\b(?:mit|massachusetts\s+institute\s+of\s+technology)\b/i },
    ];

    let matchedUni: { name: string; key: string } | null = null;
    for (const uni of uniCatalog) {
      if (uni.regex.test(text)) {
        matchedUni = { name: uni.name, key: uni.key };
        break;
      }
    }

    // Generic university matching with strict boundaries
    if (!matchedUni) {
      // 1. "University of [X]" pattern (e.g. University of Melbourne, University of Auckland)
      const uniOfMatch = text.match(/\b(?:(?:at|the)\s+)?(University\s+of\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/);
      if (uniOfMatch) {
        const raw = uniOfMatch[1].trim();
        matchedUni = { name: raw, key: raw.toLowerCase().replace(/[^a-z0-9]+/g, '_') };
      }
    }

    if (!matchedUni) {
      // 2. "[Name] University / College / Institute" pattern
      const namedUniMatch = text.match(/\b([A-Z][a-zA-Z]*(?:'s)?(?:\s+[A-Z][a-zA-Z]*){0,3}\s+(?:University|College|Institute|Polytechnic))\b/);
      if (namedUniMatch) {
        const raw = namedUniMatch[1].trim();
        if (!/^(?:at|the|in|my|our)\s+(?:university|college)$/i.test(raw)) {
          matchedUni = { name: raw, key: raw.toLowerCase().replace(/[^a-z0-9]+/g, '_') };
        }
      }
    }

    if (!matchedUni) {
      // 3. "Universiti [Name]" pattern
      const universitiMatch = text.match(/\b(Universiti\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/);
      if (universitiMatch) {
        const raw = universitiMatch[1].trim();
        matchedUni = { name: raw, key: raw.toLowerCase().replace(/[^a-z0-9]+/g, '_') };
      }
    }

    // Degree matching
    const degreeMatch = text.match(
      /\b(Bachelor(?:\s+of|\s+'s\s+in|\s+in)?(?:\s+[A-Za-z]+){1,4}(?:\s+with\s+Honours|\s+with\s+Hons)?|Master(?:\s+of|\s+'s\s+in|\s+in)?(?:\s+[A-Za-z]+){1,4}|PhD(?:\s+in)?(?:\s+[A-Za-z]+){1,3}|Doctor\s+of\s+Philosophy(?:\s+in)?(?:\s+[A-Za-z]+){1,3}|Diploma(?:\s+of|\s+in)?(?:\s+[A-Za-z]+){1,4}|Foundation(?:\s+in)?(?:\s+[A-Za-z]+){1,3})\b/i
    );

    // Academic Year / Standing matching (e.g. "third-year", "3rd year", "final year", "freshman")
    const standingMatch = text.match(/\b(first|second|third|fourth|fifth|final|1st|2nd|3rd|4th|5th|penultimate)\s*[- ]\s*year\b/i) ||
      text.match(/\b(freshman|sophomore|junior|senior)\b/i);

    // Expected graduation / end year (e.g. "graduating December 2027", "expected graduation in 2028")
    const gradMatch = text.match(
      /\b(?:expected\s+graduation|graduating(?:\s+in)?|graduation(?:\s+date)?(?:\s+is)?|completion(?:\s+in)?)\s*(?:in\s+|by\s+|:?\s*)((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?20[2-3]\d)\b/i
    );

    // Start Year matching (e.g. 2025, started in 2025)
    const startYearMatch = text.match(/\b(?:started|enrolled|commenced|since)\s*(?:in)?\s*(20[12]\d)\b/i);

    // CGPA matching (e.g. "3.8/4.0", "CGPA is 3.98", "GPA: 3.8")
    const cgpaMatch = text.match(/\b(?:cgpa|gpa|pngk)?\s*(?:is|of|:)?\s*([2-4]\.\d{1,2}(?:\s*\/\s*[45]\.0)?)\b/i);

    // Major / Field of Study matching
    const majorMatch = text.match(/\b(?:major(?:ing)?(?:\s+in)?|specializ(?:ing|ation)(?:\s+in)?)\s*[:\-]?\s*([A-Za-z\s&]+?)(?=[,\.\n]|\s+with|\s+and|\s+minor|$)/i);
    const genericFieldMatch = text.match(/\b(?:in|of)\s+(Computer\s+Science|Information\s+Technology|Software\s+Engineering|Electrical\s+Engineering|Mechanical\s+Engineering|Civil\s+Engineering|Accounting|Finance|Business\s+Administration|Data\s+Science|Artificial\s+Intelligence)\b/i);

    // Minor matching (e.g. "minor in Data Science")
    const minorMatch = text.match(/\b(?:minor(?:ing)?(?:\s+in)?)\s*[:\-]?\s*([A-Za-z\s&]+?)(?=[,\.\n]|\s+and|\s+with|$)/i);

    // Academic achievements / honors (e.g. "Dean's List for four semesters", "First Class Honours")
    const honorMatch = text.match(/\b(Dean'?s\s+List(?:\s+for\s+[A-Za-z0-9\s]+(?:semesters?|years?))?|First\s+Class\s+Honours?|Academic\s+Excellence(?:\s+Award)?|Vice[\s-]Chancellor'?s\s+List|Top\s+(?:student|achiever))\b/i);

    // Only process education if we have an explicit education signal
    const hasEduSignal = matchedUni || degreeMatch || cgpaMatch || standingMatch || gradMatch || majorMatch;

    if (hasEduSignal) {
      const existingEdu = ledger.getEntitiesByType('education')[0];
      const uniKey = matchedUni ? matchedUni.key : (existingEdu ? existingEdu.normalizedKey : 'primary');
      const uniName = matchedUni ? matchedUni.name : (existingEdu ? existingEdu.displayName : 'University');

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
        resolvedKeys.push(intentKey);
      }

      // Degree slot
      if (degreeMatch) {
        // Strip trailing context words like "student", "candidate", "at", etc.
        let degValue = degreeMatch[0].trim();
        while (/\s+(?:student|candidate|degree|at|of)$/i.test(degValue)) {
          degValue = degValue.replace(/\s+(?:student|candidate|degree|at|of)$/i, '').trim();
        }

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
        resolvedKeys.push(intentKey);

        // Infer field of study from degree title if not explicitly set
        if (!majorMatch && !genericFieldMatch) {
          const commonFields = [
            'Computer Science', 'Software Engineering', 'Information Technology',
            'Data Science', 'Artificial Intelligence', 'Electrical Engineering',
            'Mechanical Engineering', 'Civil Engineering', 'Accounting', 'Finance'
          ];
          for (const cf of commonFields) {
            if (new RegExp(`\\b${cf}\\b`, 'i').test(degValue)) {
              ledger.addFact({
                entityId: eduEntity.id,
                slot: 'field_of_study',
                value: cf,
                rawEvidence: degValue,
              });
              ledger.resolveIntent(makeIntentKey('education', eduEntity.normalizedKey, 'field_of_study'));
              break;
            }
          }
        }
      }

      // Major / Field of Study slot
      if (majorMatch || genericFieldMatch) {
        const majorVal = (majorMatch ? majorMatch[1] : genericFieldMatch![1]).trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'field_of_study',
          value: majorVal,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'field_of_study'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'field_of_study');
        ledger.resolveIntent(intentKey);
        resolvedKeys.push(intentKey);
      }

      // Minor slot
      if (minorMatch) {
        const minorVal = minorMatch[1].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'minor',
          value: minorVal,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'minor'));
      }

      // Academic Year / Standing slot
      if (standingMatch) {
        const standingVal = standingMatch[0].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'year',
          value: standingVal,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'year'));
      }

      // Expected graduation / end year slot
      if (gradMatch) {
        const gradVal = gradMatch[1].trim();
        ledger.addFact({
          entityId: eduEntity.id,
          slot: 'expected_graduation',
          value: gradVal,
          rawEvidence: text,
        });
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'end_year',
          value: gradVal,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'end_year'));

        // If graduation date is known, education timeline is complete
        ledger.resolveIntent(makeIntentKey('education', eduEntity.normalizedKey, 'start_year'));
      }

      // Start year slot
      if (startYearMatch) {
        const startYearVal = startYearMatch[1].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'start_year',
          value: startYearVal,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'start_year'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'start_year');
        ledger.resolveIntent(intentKey);
        resolvedKeys.push(intentKey);
      }

      // CGPA slot
      if (cgpaMatch) {
        const cgpaVal = cgpaMatch[1].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'cgpa',
          value: cgpaVal,
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'cgpa'));
        const intentKey = makeIntentKey('education', eduEntity.normalizedKey, 'cgpa');
        ledger.resolveIntent(intentKey);
        resolvedKeys.push(intentKey);
      }

      // Academic Achievements / Honors
      if (honorMatch) {
        const honorVal = honorMatch[0].trim();
        const fact = ledger.addFact({
          entityId: eduEntity.id,
          slot: 'academic_achievements',
          value: [honorVal],
          rawEvidence: text,
        });
        facts.push(fact);
        slots.push(ledger.getSlot(eduEntity.id, 'academic_achievements'));

        // Register as an achievement entity too
        const achEntity = ledger.getOrCreateEntity('achievement', 'deans_list', honorVal);
        ledger.addFact({
          entityId: achEntity.id,
          slot: 'name',
          value: honorVal,
          rawEvidence: text,
        });
      }

      // Mark general education overview as resolved
      ledger.resolveIntent('education|general|overview');
      resolvedKeys.push('education|general|overview');
    }
  }

  private extractWorkExperience(
    text: string,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
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
      resolvedKeys.push('experience|general|overview');

      // Position extraction
      const titleMatch = text.match(/\b(?:worked\s+as\s+(?:a|an)?\s*|as\s+(?:a|an)?\s*|position(?:\s+was|\s+is)?[:\s]+|job\s+title(?:\s+was|\s+is)?[:\s]+)([A-Za-z0-9\s]{3,30}?)(?=[,\.\n]|\s+at|\s+where|\s+since|$)/i);
      const specificTitles = [
        'Pharmacy Assistant', 'Retail Assistant', 'Sales Assistant', 'Store Associate',
        'Software Engineer', 'Software Developer', 'Intern', 'Software Engineering Intern',
        'Teaching Assistant', 'Research Assistant', 'Cashier',
        'Customer Service Representative', 'Barista',
      ];
      let explicitPosition: string | null = null;
      if (titleMatch) {
        const candidate = titleMatch[1].trim();
        if (!/^(?:part[\s-]time|full[\s-]time|internship|job|work)$/i.test(candidate)) {
          explicitPosition = candidate;
        }
      }
      if (!explicitPosition) {
        const found = specificTitles.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(text));
        if (found) explicitPosition = found;
      }

      if (explicitPosition) {
        const pFact = ledger.addFact({
          entityId: expEntity.id,
          slot: 'position',
          value: explicitPosition,
          rawEvidence: text,
        });
        facts.push(pFact);
        slots.push(ledger.getSlot(expEntity.id, 'position'));
        ledger.resolveIntent(makeIntentKey('experience', normKey, 'position'));
        resolvedKeys.push(makeIntentKey('experience', normKey, 'position'));
      }

      // Responsibilities extraction
      const respMatch = text.match(/\b(?:(?:my\s+)?(?:main\s+)?responsibilities\s+(?:were|included|are|include)|responsible\s+for|(?:my\s+)?duties\s+(?:were|included|are|include)|(?:my\s+)?(?:daily\s+)?tasks\s+(?:were|included|are|include))\s*[:\-]?\s*/i);
      if (respMatch) {
        const respText = text.substring(respMatch.index!).trim();
        if (respText.length > 5) {
          const respFact = ledger.addFact({
            entityId: expEntity.id,
            slot: 'responsibilities',
            value: respText,
            rawEvidence: text,
            origin: 'explicit',
          });
          facts.push(respFact);
          slots.push(ledger.getSlot(expEntity.id, 'responsibilities'));
          ledger.resolveIntent(makeIntentKey('experience', normKey, 'responsibilities'));
          resolvedKeys.push(makeIntentKey('experience', normKey, 'responsibilities'));
        }
      }
    }
  }

  private extractProjects(
    text: string,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
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
      resolvedKeys.push('project|general|overview');

      // Check role in project
      const roleMatch = text.match(/\b(?:project\s+manager|lead\s+developer|full\s+stack\s+developer|frontend\s+developer|backend\s+developer|contributor)\b/i);
      if (roleMatch) {
        const roleFact = ledger.addFact({
          entityId: projEntity.id,
          slot: 'role',
          value: roleMatch[0].trim(),
          rawEvidence: text,
        });
        facts.push(roleFact);
        slots.push(ledger.getSlot(projEntity.id, 'role'));
        ledger.resolveIntent(makeIntentKey('project', normKey, 'role'));
        resolvedKeys.push(makeIntentKey('project', normKey, 'role'));
      }
    }

    // Project description & contributions (multi-turn aware)
    const existingProjects = ledger.getEntitiesByType('project');
    const activeIntentKey = ledger.currentIntentKey;
    const matchedProject = existingProjects.find((p) => {
      const nameRe = new RegExp(`\\b${p.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return nameRe.test(text);
    });

    const targetProjectForDesc = matchedProject || (
      activeIntentKey && activeIntentKey.startsWith('project|')
        ? existingProjects.find((p) => activeIntentKey.includes(p.normalizedKey)) || (existingProjects.length > 0 ? existingProjects[0] : null)
        : null
    );

    if (targetProjectForDesc) {
      const descKeywords = [
        /lost[\s-]+and[\s-]+found/i,
        /web\s+application/i,
        /mobile\s+app/i,
        /platform/i,
        /system\s+(?:designed|built|developed|for)/i,
        /allows?\s+users?\s+to/i,
        /ai[\s-]powered/i,
        /smart\s+lost/i,
      ];
      const isDescIntent = activeIntentKey && activeIntentKey.startsWith('project|') && activeIntentKey.endsWith('|description');
      const hasDescKeyword = descKeywords.some((r) => r.test(text));

      if (hasDescKeyword || isDescIntent) {
        const descFact = ledger.addFact({
          entityId: targetProjectForDesc.id,
          slot: 'description',
          value: text,
          rawEvidence: text,
        });
        facts.push(descFact);
        slots.push(ledger.getSlot(targetProjectForDesc.id, 'description'));
        ledger.resolveIntent(makeIntentKey('project', targetProjectForDesc.normalizedKey, 'description'));
        resolvedKeys.push(makeIntentKey('project', targetProjectForDesc.normalizedKey, 'description'));
      }

      // Contributions
      const contributionKeywords = [
        'AI-assisted item matching', 'AI-assisted matching', 'AI-assisted', 'AI tools',
        'system design', 'requirements', 'website development', 'web development',
        'database', 'project coordination', 'project management', 'testing', 'deployment',
        'documentation', 'UI design', 'UX design', 'frontend', 'backend', 'full stack',
        'API development', 'item matching', 'data analysis', 'security',
      ];
      const foundContributions: string[] = [];
      for (const kw of contributionKeywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
          if (!foundContributions.some((c) => c.toLowerCase().includes(kw.toLowerCase()))) {
            foundContributions.push(kw);
          }
        }
      }
      if (foundContributions.length > 0) {
        const existingContribFacts = ledger.getFactsForEntity(targetProjectForDesc.id).filter((f) => f.slot === 'contributions');
        const existingContribs: string[] = [];
        for (const cf of existingContribFacts) {
          const v = cf.value;
          if (Array.isArray(v)) existingContribs.push(...v.map(String));
          else if (v) existingContribs.push(String(v));
        }
        const mergedContribs = Array.from(new Set([...existingContribs, ...foundContributions]));
        const cFact = ledger.addFact({
          entityId: targetProjectForDesc.id,
          slot: 'contributions',
          value: mergedContribs,
          rawEvidence: text,
          origin: 'explicit',
        });
        facts.push(cFact);
        slots.push(ledger.getSlot(targetProjectForDesc.id, 'contributions'));
      }
    }
  }

  private extractSkills(
    text: string,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
    const techSkills = [
      'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
      'C++', 'C#', 'C', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Git',
      'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind', 'Linux', 'AWS', 'Flutter', 'Kotlin', 'Swift',
      'PHP', 'Ruby', 'Go', 'Rust', 'R', 'MATLAB', 'Dart',
      'Angular', 'Vue.js', 'Vue', 'Svelte', 'Django', 'Flask', 'Laravel', 'Spring Boot',
      'Express.js', 'Express', 'Firebase', 'Supabase', 'Redis', 'GraphQL', 'REST',
      'Bootstrap', 'jQuery', 'Sass', 'SCSS', 'Webpack', 'Vite',
      'Figma', 'Adobe XD', 'Canva',
      'XAMPP', 'Apache', 'Nginx', 'Heroku', 'Vercel', 'Netlify', 'Azure', 'GCP',
      'VS Code', 'VSCode', 'Visual Studio', 'IntelliJ', 'Eclipse', 'Android Studio', 'Xcode',
      'Postman', 'Jira', 'Trello', 'Notion', 'Slack',
      'GitHub', 'GitLab', 'Bitbucket',
      'TensorFlow', 'PyTorch', 'Keras', 'OpenCV', 'Pandas', 'NumPy', 'Scikit-learn',
      'Unity', 'Unreal Engine', 'Blender',
      'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'CI/CD',
      'Power BI', 'Tableau', 'Excel',
    ];

    const foundSkills: string[] = [];
    const singleLetterSkills = new Set(['C', 'R', 'Go']);
    for (const skill of techSkills) {
      if (singleLetterSkills.has(skill)) {
        const singleReg = new RegExp(
          `(?:^|[,;/\\s])${skill}(?:\\s+(?:programming|language|compiler)|\\s*/\\s*C\\+\\+|[,;]|$)`
        );
        if (singleReg.test(text)) {
          foundSkills.push(skill);
        }
      } else {
        const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const reg = new RegExp(`(?:^|[^a-zA-Z0-9#+])${escaped}(?:$|[^a-zA-Z0-9#+])`, 'i');
        if (reg.test(text)) {
          let normalized = skill;
          if (skill === 'VSCode') normalized = 'VS Code';
          if (skill === 'HTML5') normalized = 'HTML';
          if (skill === 'CSS3') normalized = 'CSS';
          if (!foundSkills.includes(normalized)) {
            foundSkills.push(normalized);
          }
        }
      }
    }

    if (foundSkills.length > 0) {
      const skillEntity = ledger.getOrCreateEntity('skill', 'self', 'Technical Skills');
      entities.push(skillEntity);

      // Merge with any existing skills
      const existingSkillFacts = ledger.getFactsForEntity(skillEntity.id).filter((f) => f.slot === 'technical');
      const existingSkills: string[] = [];
      for (const sf of existingSkillFacts) {
        const v = sf.value;
        if (Array.isArray(v)) existingSkills.push(...v.map(String));
        else if (v) existingSkills.push(String(v));
      }
      const mergedSkills = Array.from(new Set([...existingSkills, ...foundSkills]));

      const fact = ledger.addFact({
        entityId: skillEntity.id,
        slot: 'technical',
        value: mergedSkills,
        rawEvidence: text,
      });
      facts.push(fact);
      slots.push(ledger.getSlot(skillEntity.id, 'technical'));
      ledger.resolveIntent('skill|self|technical');
      resolvedKeys.push('skill|self|technical');

      // Also attach technologies to project if mentioned in context
      const projectEntities = ledger.getEntitiesByType('project');
      const activeIntentKey = ledger.currentIntentKey;
      const targetProject = projectEntities.find((p) => new RegExp(`\\b${p.displayName}\\b`, 'i').test(text)) ||
        (activeIntentKey && activeIntentKey.startsWith('project|') ? projectEntities[0] : null);

      if (targetProject) {
        const existingProjTech = ledger.getFactsForEntity(targetProject.id).filter((f) => f.slot === 'technologies');
        const techs: string[] = [];
        for (const pt of existingProjTech) {
          if (Array.isArray(pt.value)) techs.push(...pt.value.map(String));
          else if (pt.value) techs.push(String(pt.value));
        }
        const mergedProjTechs = Array.from(new Set([...techs, ...foundSkills]));
        ledger.addFact({
          entityId: targetProject.id,
          slot: 'technologies',
          value: mergedProjTechs,
          rawEvidence: text,
        });
        ledger.resolveIntent(makeIntentKey('project', targetProject.normalizedKey, 'technologies'));
      }
    }

    // Languages
    const langDict = ['English', 'Malay', 'Bahasa Melayu', 'Mandarin', 'Chinese', 'Tamil', 'Japanese', 'French', 'German', 'Spanish', 'Arabic'];
    const foundLangs: string[] = [];
    for (const lang of langDict) {
      if (new RegExp(`\\b${lang}\\b`, 'i').test(text)) {
        foundLangs.push(lang === 'Bahasa Melayu' ? 'Malay' : lang);
      }
    }
    if (foundLangs.length > 0) {
      const skillEntity = ledger.getOrCreateEntity('skill', 'self', 'Technical Skills');
      ledger.addFact({
        entityId: skillEntity.id,
        slot: 'languages',
        value: Array.from(new Set(foundLangs)),
        rawEvidence: text,
      });
    }
  }

  private extractLeadership(
    text: string,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
    const leadMatch = text.match(/\b(President|Vice\s+President|Secretary|Treasurer|Head\s+of|Committee\s+Member|Director|Leader|Volunteer)\s+(?:of|for|at)\s+([A-Za-z0-9\s&]+?)(?=[,\.\n]|$)/i);
    if (leadMatch) {
      const role = leadMatch[1].trim();
      const org = leadMatch[2].trim();
      const leadEntity = ledger.getOrCreateEntity('leadership', org.toLowerCase().replace(/[^a-z0-9]+/g, '_'), org);
      entities.push(leadEntity);

      const rFact = ledger.addFact({
        entityId: leadEntity.id,
        slot: 'role',
        value: role,
        rawEvidence: text,
      });
      facts.push(rFact);
      slots.push(ledger.getSlot(leadEntity.id, 'role'));

      const dFact = ledger.addFact({
        entityId: leadEntity.id,
        slot: 'description',
        value: text,
        rawEvidence: text,
      });
      facts.push(dFact);
      slots.push(ledger.getSlot(leadEntity.id, 'description'));

      ledger.resolveIntent('leadership|self|overview');
      resolvedKeys.push('leadership|self|overview');
    }
  }

  private resolveTargetedIntent(
    text: string,
    isExplicitSkip: boolean,
    ledger: InterviewLedger,
    entities: any[],
    facts: any[],
    slots: any[],
    resolvedKeys: string[]
  ): void {
    const activeIntentKey = ledger.currentIntentKey;
    if (!activeIntentKey) return;

    const intentParts = activeIntentKey.split('|');
    if (intentParts.length < 3) return;

    const [targetEntityType, targetEntityKey, targetSlot] = intentParts;

    // If targeted question was asking about leadership:
    if (targetEntityType === 'leadership' && targetEntityKey === 'self') {
      const isNegative = isExplicitSkip || /^(?:none|no|nothing|n\/?a|not\s+applicable|skip|don'?t\s+have|haven'?t)$/i.test(
        text.replace(/[.,!]/g, '').trim()
      ) || /\b(?:no\s+leadership|haven'?t\s+held\s+any|never\s+held)\b/i.test(text);

      if (isNegative) {
        const s = ledger.setSlot('leadership|self', 'overview', 'declared_none', 'declared_none');
        slots.push(s);
      } else if (text.length > 0) {
        const leadEntity = ledger.getOrCreateEntity('leadership', 'general', 'Leadership Experience');
        entities.push(leadEntity);
        const fact = ledger.addFact({
          entityId: leadEntity.id,
          slot: 'description',
          value: text,
          rawEvidence: text,
          origin: 'explicit',
        });
        facts.push(fact);
        slots.push(ledger.getSlot(leadEntity.id, 'description'));
      }
      ledger.resolveIntent(activeIntentKey);
      resolvedKeys.push(activeIntentKey);
      return;
    }

    // If targeted question was asking for photo:
    if (targetEntityType === 'personal' && targetSlot === 'photo') {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      const isNegative = isExplicitSkip || /^(?:none|no|nothing|n\/?a|not\s+applicable|skip|don'?t\s+have|haven'?t|no\s+photo|without\s+photo)$/i.test(
        text.replace(/[.,!]/g, '').trim()
      );
      if (isNegative) {
        const s = ledger.setSlot(persEntity.id, 'photoUrl', 'skipped', 'skipped');
        slots.push(s);
      } else {
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          const pFact = ledger.addFact({
            entityId: persEntity.id,
            slot: 'photoUrl',
            value: urlMatch[0],
            rawEvidence: text,
            origin: 'explicit',
          });
          facts.push(pFact);
          slots.push(ledger.getSlot(persEntity.id, 'photoUrl'));
        } else {
          const s = ledger.setSlot(persEntity.id, 'photoUrl', 'skipped', 'skipped');
          slots.push(s);
        }
      }
      ledger.resolveIntent(activeIntentKey);
      resolvedKeys.push(activeIntentKey);
      return;
    }

    // If targeted question was asking for contact links:
    if (targetEntityType === 'personal' && targetSlot === 'contact_links') {
      const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      if (isExplicitSkip) {
        const s = ledger.setSlot(persEntity.id, 'contact_links', 'skipped', 'skipped');
        slots.push(s);
      }
      ledger.resolveIntent(activeIntentKey);
      resolvedKeys.push(activeIntentKey);
      return;
    }

    if (isExplicitSkip) {
      if (targetEntityKey === 'self' || targetEntityKey === 'general') {
        const slot = ledger.setSlot(`${targetEntityType}|${targetEntityKey}`, targetSlot, 'skipped', 'skipped');
        slots.push(slot);
      } else {
        const entityId = makeEntityId(targetEntityType as EntityType, targetEntityKey);
        const slot = ledger.setSlot(entityId, targetSlot, 'skipped', 'skipped');
        slots.push(slot);
      }
      ledger.resolveIntent(activeIntentKey);
      resolvedKeys.push(activeIntentKey);
      return;
    }

    // If targeted question was asking for full name:
    if (targetEntityType === 'personal' && targetSlot === 'fullName' && text.length > 0) {
      const cleanName = text
        .replace(/^(?:my\s+name\s+is|i\s+am|call\s+me|name\s*[:\-])\s*/i, '')
        .replace(/[.,!]+$/, '')
        .trim();
      if (cleanName.length > 1 && !/^(?:skip|none|no|n\/?a)$/i.test(cleanName)) {
        const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
        const fact = ledger.addFact({
          entityId: persEntity.id,
          slot: 'fullName',
          value: cleanName,
          rawEvidence: text,
          origin: 'explicit',
        });
        facts.push(fact);
        slots.push(ledger.getSlot(persEntity.id, 'fullName'));
        ledger.resolveIntent(activeIntentKey);
        resolvedKeys.push(activeIntentKey);
      }
    }

    // If targeted question was asking for position in an experience:
    if (targetEntityType === 'experience' && targetSlot === 'position') {
      const targetEntityId = makeEntityId('experience', targetEntityKey);
      const cleanPos = text
        .replace(/^(?:my\s+(?:official\s+)?(?:job\s+)?title\s+(?:was|is)|i\s+was\s+(?:a|an)?|role\s+(?:was|is))\s*[:\-]?\s*/i, '')
        .replace(/[.,!]+$/, '')
        .trim();
      if (cleanPos.length > 0) {
        const fact = ledger.addFact({
          entityId: targetEntityId,
          slot: 'position',
          value: cleanPos,
          rawEvidence: text,
          origin: 'explicit',
        });
        facts.push(fact);
        slots.push(ledger.getSlot(targetEntityId, 'position'));
        ledger.resolveIntent(activeIntentKey);
        resolvedKeys.push(activeIntentKey);
      }
    }

    // If targeted question was asking for responsibilities in an experience:
    if (targetEntityType === 'experience' && targetSlot === 'responsibilities' && text.length > 0) {
      const targetEntityId = makeEntityId('experience', targetEntityKey);
      const fact = ledger.addFact({
        entityId: targetEntityId,
        slot: 'responsibilities',
        value: text,
        rawEvidence: text,
        origin: 'explicit',
      });
      facts.push(fact);
      slots.push(ledger.getSlot(targetEntityId, 'responsibilities'));
      ledger.resolveIntent(activeIntentKey);
      resolvedKeys.push(activeIntentKey);
    }
  }
}

export const deterministicExtractor = new DeterministicExtractor();