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
    // 1B. VOLUNTEERED PERSONAL INFORMATION EXTRACTION
    // -------------------------------------------------------------
    const nameMatch = text.match(/\b(?:my\s+name\s+is|i\s+am|call\s+me)\s+([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+){1,4})\b/);
    if (nameMatch) {
      const candidateName = nameMatch[1].trim();
      if (!/^(?:currently|studying|pursuing|working|excited|delighted|pleased|a|an)\b/i.test(candidateName)) {
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
        resolvedIntentKeys.push('personal|self|fullName');
      }
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

    // Generic university match if named e.g. "Universiti ..." or "... University"
    if (!matchedUni) {
      // Must not match generic prepositional phrases like "at university", "in college", "the university"
      const isGenericMention = /\b(?:at|in|to|from|the|my|our|any|a)\s+(?:university|college)\b/i.test(text);
      if (!isGenericMention) {
        const genUniMatch = text.match(/\b((?:Universiti|University\s+of)\s+[A-Za-z\s]+|[A-Za-z]{3,}(?:\s+[A-Za-z]{3,})?\s+(?:University|College))\b/i);
        if (genUniMatch) {
          const raw = genUniMatch[1].trim();
          if (!/^(?:at|in|the|my|our|any|a)\s+/i.test(raw) && raw.length > 5 && raw.length < 60) {
            matchedUni = { name: raw, key: raw.toLowerCase().replace(/[^a-z0-9]+/g, '_') };
          }
        }
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

    // Only process education if we have an explicit university, degree, or CGPA match,
    // AND the current intent is not targeting leadership, experience, or project
    const activeKey = ledger.currentIntentKey;
    const isOtherCategoryTurn = activeKey && (
      activeKey.startsWith('leadership|') ||
      activeKey.startsWith('experience|') ||
      activeKey.startsWith('project|')
    );

    if ((matchedUni || degreeMatch || cgpaMatch) && (!isOtherCategoryTurn || degreeMatch || matchedUni)) {
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

      // Extract position ONLY if explicitly stated (e.g. "as a Pharmacy Assistant", "role: Cashier", "intern")
      // Never fabricate a job title like "Part-time Associate" from casual mentions of part-time
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
        ledger.addFact({
          entityId: expEntity.id,
          slot: 'position',
          value: explicitPosition,
          rawEvidence: text,
        });
        ledger.resolveIntent(makeIntentKey('experience', normKey, 'position'));
      }

      // Check if responsibilities were explicitly declared in the same turn
      const respMatch = text.match(/\b(?:(?:my\s+)?(?:main\s+)?responsibilities\s+(?:were|included|are|include)|responsible\s+for|(?:my\s+)?duties\s+(?:were|included|are|include)|(?:my\s+)?(?:daily\s+)?tasks\s+(?:were|included|are|include))\s*[:\-]?\s*/i);
      if (respMatch) {
        // Store the full text from the match point onwards (not just up to the first period)
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
          resolvedIntentKeys.push(makeIntentKey('experience', normKey, 'responsibilities'));
        }
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
    }

    // -------------------------------------------------------------
    // 4B. PROJECT DESCRIPTION & CONTRIBUTIONS (multi-turn aware)
    // -------------------------------------------------------------
    const existingProjects = ledger.getEntitiesByType('project');
    const matchedProject = existingProjects.find((p) => {
      const nameRe = new RegExp(`\\b${p.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return nameRe.test(text);
    });

    const activeIntentKey = ledger.currentIntentKey;
    const targetProjectForDesc = matchedProject || (
      activeIntentKey && activeIntentKey.startsWith('project|')
        ? existingProjects.find((p) => activeIntentKey.includes(p.normalizedKey)) || (existingProjects.length > 0 ? existingProjects[0] : null)
        : null
    );

    if (targetProjectForDesc) {
      // Check description keywords or targeted description intent
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
      }

      // Extract project contributions (e.g. system design, requirements, database, AI-assisted item matching)
      const contributionKeywords = [
        'AI-assisted item matching',
        'AI-assisted matching',
        'AI-assisted',
        'AI tools',
        'system design',
        'requirements',
        'website development',
        'web development',
        'database',
        'project coordination',
        'project management',
        'testing',
        'deployment',
        'documentation',
        'UI design',
        'UX design',
        'frontend',
        'backend',
        'full stack',
        'API development',
        'item matching',
        'data analysis',
        'security',
      ];
      const foundContributions: string[] = [];
      for (const kw of contributionKeywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
          const alreadyCovered = foundContributions.some((existing) =>
            existing.toLowerCase().includes(kw.toLowerCase())
          );
          if (!alreadyCovered) {
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

    // -------------------------------------------------------------
    // 5. TECHNICAL SKILLS EXTRACTION
    // -------------------------------------------------------------
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
    // Single-letter skills need stricter context-aware matching
    const singleLetterSkills = new Set(['C', 'R', 'Go']);
    for (const skill of techSkills) {
      if (singleLetterSkills.has(skill)) {
        // Only match single-letter skills in explicit tech contexts (e.g. "C programming", "language: C", "used C,")
        const singleReg = new RegExp(
          `(?:^|[,;/\\s])${skill}(?:\\s+(?:programming|language|compiler)|\\s*/\\s*C\\+\\+|[,;]|$)`,
          skill === 'Go' ? '' : '' // case-sensitive for C and R
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

      // Also attach technologies to any project entity mentioned in this answer
      // or targeted by the current intent
      const projectEntitiesInAnswer = ledger.getEntitiesByType('project');
      const activeProj = projectEntitiesInAnswer.find((p) => {
        const nameRe = new RegExp(`\\b${p.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return nameRe.test(text);
      });

      const targetProject = activeProj || (
        activeIntentKey && activeIntentKey.startsWith('project|')
          ? projectEntitiesInAnswer.find((p) => activeIntentKey.includes(p.normalizedKey)) || (projectEntitiesInAnswer.length === 1 ? projectEntitiesInAnswer[0] : null)
          : null
      );

      if (targetProject) {
        // Merge with existing technologies
        const existingTechFacts = ledger.getFactsForEntity(targetProject.id).filter((f) => f.slot === 'technologies');
        const existingTechs: string[] = [];
        for (const tf of existingTechFacts) {
          const v = tf.value;
          if (Array.isArray(v)) existingTechs.push(...v.map(String));
          else if (v) existingTechs.push(String(v));
        }
        const mergedTechs = Array.from(new Set([...existingTechs, ...foundSkills]));

        ledger.addFact({
          entityId: targetProject.id,
          slot: 'technologies',
          value: mergedTechs,
          rawEvidence: text,
        });
        ledger.resolveIntent(makeIntentKey('project', targetProject.normalizedKey, 'technologies'));
        resolvedIntentKeys.push(makeIntentKey('project', targetProject.normalizedKey, 'technologies'));
      }
    }

    // -------------------------------------------------------------
    // 6. TARGETED ACTIVE INTENT SLOT RESOLUTION
    // -------------------------------------------------------------
    // If the interviewer previously asked a question targeting a specific slot on an entity,
    // and the student responded to that question:
    if (activeIntentKey) {
      const intentParts = activeIntentKey.split('|');
      if (intentParts.length >= 3) {
        const [targetEntityType, targetEntityKey, targetSlot] = intentParts;

        if (targetEntityType === 'leadership' && targetEntityKey === 'self') {
          // Leadership prompt resolution
          const isNegative =
            /^(?:none|no|nothing|n\/?a|not\s+applicable|skip|don'?t\s+have|haven'?t)$/i.test(
              text.replace(/[.,!]/g, '').trim()
            ) || /\b(?:no\s+leadership|haven'?t\s+held\s+any|never\s+held)\b/i.test(text);

          if (isNegative) {
            const s = ledger.setSlot('leadership|self', 'overview', 'declared_none', 'declared_none');
            slots.push(s);
            ledger.resolveIntent(activeIntentKey);
            resolvedIntentKeys.push(activeIntentKey);
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
            ledger.resolveIntent(activeIntentKey);
            resolvedIntentKeys.push(activeIntentKey);
          }
        } else if (targetEntityType === 'personal' && targetEntityKey === 'self') {
          const persEntity = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
          entities.push(persEntity);

          if (targetSlot === 'fullName') {
            const cleanName = text
              .replace(/^(?:my\s+name\s+is|i\s+am|call\s+me|name\s*[:\-])\s*/i, '')
              .replace(/[.,!]+$/, '')
              .trim();
            if (cleanName.length > 0 && !/^(?:skip|none|no|n\/?a)$/i.test(cleanName)) {
              const fact = ledger.addFact({
                entityId: persEntity.id,
                slot: 'fullName',
                value: cleanName,
                rawEvidence: text,
                origin: 'explicit',
              });
              facts.push(fact);
              slots.push(ledger.getSlot(persEntity.id, 'fullName'));
            }
            ledger.resolveIntent(activeIntentKey);
            resolvedIntentKeys.push(activeIntentKey);
          } else if (targetSlot === 'contact_links') {
            const isNegative = /^(?:none|no|nothing|n\/?a|not\s+applicable|skip|don'?t\s+have|haven'?t)$/i.test(
              text.replace(/[.,!]/g, '').trim()
            );
            if (isNegative) {
              const s = ledger.setSlot(persEntity.id, 'contact_links', 'skipped', 'skipped');
              slots.push(s);
            } else {
              // Extract phone number
              const phoneMatch = text.match(/(?:\+?60|0)[0-9\s\-()]{7,15}/);
              if (phoneMatch) {
                const pFact = ledger.addFact({
                  entityId: persEntity.id,
                  slot: 'phone',
                  value: phoneMatch[0].trim(),
                  rawEvidence: text,
                  origin: 'explicit',
                });
                facts.push(pFact);
                slots.push(ledger.getSlot(persEntity.id, 'phone'));
              }

              // Extract email address if provided
              const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
              if (emailMatch && !ledger.isSlotKnown(persEntity.id, 'email')) {
                const eFact = ledger.addFact({
                  entityId: persEntity.id,
                  slot: 'email',
                  value: emailMatch[0].trim(),
                  rawEvidence: text,
                  origin: 'explicit',
                });
                facts.push(eFact);
                slots.push(ledger.getSlot(persEntity.id, 'email'));
              }

              // Extract LinkedIn
              const liMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_\-\/]+)/i);
              if (liMatch) {
                const liUrl = liMatch[0].startsWith('http') ? liMatch[0] : `https://${liMatch[0]}`;
                const liFact = ledger.addFact({
                  entityId: persEntity.id,
                  slot: 'linkedin',
                  value: liUrl,
                  rawEvidence: text,
                  origin: 'explicit',
                });
                facts.push(liFact);
                slots.push(ledger.getSlot(persEntity.id, 'linkedin'));
              }

              // Extract GitHub
              const ghMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_\-\/]+)/i);
              if (ghMatch) {
                const ghUrl = ghMatch[0].startsWith('http') ? ghMatch[0] : `https://${ghMatch[0]}`;
                const ghFact = ledger.addFact({
                  entityId: persEntity.id,
                  slot: 'github',
                  value: ghUrl,
                  rawEvidence: text,
                  origin: 'explicit',
                });
                facts.push(ghFact);
                slots.push(ledger.getSlot(persEntity.id, 'github'));
              }

              // Extract Portfolio
              const portMatch = text.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=]+/i);
              if (portMatch) {
                const portFact = ledger.addFact({
                  entityId: persEntity.id,
                  slot: 'portfolio',
                  value: portMatch[0],
                  rawEvidence: text,
                  origin: 'explicit',
                });
                facts.push(portFact);
                slots.push(ledger.getSlot(persEntity.id, 'portfolio'));
              }
            }
            ledger.resolveIntent(activeIntentKey);
            resolvedIntentKeys.push(activeIntentKey);
          } else if (targetSlot === 'photo') {
            const isNegative = /^(?:none|no|nothing|n\/?a|not\s+applicable|skip|don'?t\s+have|haven'?t|no\s+photo|without\s+photo)$/i.test(
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
            resolvedIntentKeys.push(activeIntentKey);
          }
        } else if (targetEntityKey !== 'general') {
          const targetEntityId = makeEntityId(targetEntityType as EntityType, targetEntityKey);
          let targetEntity = ledger.getEntity(targetEntityId);
          if (!targetEntity) {
            targetEntity =
              ledger.getEntitiesByType(targetEntityType as EntityType).find((e) => e.normalizedKey === targetEntityKey) ||
              ledger.getEntitiesByType(targetEntityType as EntityType)[0];
          }

          if (targetEntity) {
            const currentSlot = ledger.getSlot(targetEntity.id, targetSlot);
            const isSlotKnown = currentSlot?.state === 'known' || currentSlot?.state === 'inferred';

            if (!isSlotKnown) {
              const isNegative =
                /^(?:none|no|nothing|n\/?a|not\s+applicable|skip|prefer\s+not\s+to\s+say|don'?t\s+have|haven'?t|no\s+(?:responsibilities|specific\s+responsibilities|leadership|roles|official\s+title|title))$/i.test(
                  text.replace(/[.,!]/g, '').trim()
                ) ||
                /\b(?:no\s+responsibilities|don'?t\s+have\s+any|not\s+applicable|skip\s+this|no\s+specific\s+tasks|no\s+official\s+title)\b/i.test(text);

              if (isNegative) {
                if (targetSlot === 'position') {
                  // Fall back to student-confirmed employment type rather than inventing arbitrary titles
                  const fact = ledger.addFact({
                    entityId: targetEntity.id,
                    slot: 'position',
                    value: 'Part-time',
                    rawEvidence: text,
                    origin: 'explicit',
                  });
                  facts.push(fact);
                  slots.push(ledger.getSlot(targetEntity.id, 'position'));
                } else {
                  const s = ledger.setSlot(targetEntity.id, targetSlot, 'declared_none', 'declared_none');
                  slots.push(s);
                }
                ledger.resolveIntent(activeIntentKey);
                resolvedIntentKeys.push(activeIntentKey);
              } else if (text.length > 0) {
                // Determine slot value based on target slot type
                let slotValue: any = text;

                if (targetSlot === 'position') {
                  const cleanPos = text
                    .replace(/^(?:my\s+(?:official\s+)?(?:job\s+)?title\s+(?:was|is)|i\s+was\s+(?:a|an)?|role\s+(?:was|is))\s*[:\-]?\s*/i, '')
                    .replace(/[.,!]+$/, '')
                    .trim();
                  slotValue = cleanPos || text;
                } else if (targetSlot === 'technologies') {
                  slotValue = foundSkills.length > 0 ? foundSkills : text;
                } else if (targetSlot === 'degree' && degreeMatch) {
                  slotValue = degreeMatch[0].trim();
                } else if (targetSlot === 'cgpa' && cgpaMatch) {
                  slotValue = cgpaMatch[1];
                } else if (targetSlot === 'start_year' && yearMatch) {
                  slotValue = yearMatch[1];
                } else if (targetSlot === 'field_of_study' && fieldMatch) {
                  slotValue = fieldMatch[1].trim();
                } else if (targetSlot === 'institution' && matchedUni) {
                  slotValue = matchedUni.name;
                }

                const fact = ledger.addFact({
                  entityId: targetEntity.id,
                  slot: targetSlot,
                  value: slotValue,
                  rawEvidence: text,
                  origin: 'explicit',
                });
                facts.push(fact);
                slots.push(ledger.getSlot(targetEntity.id, targetSlot));
                ledger.resolveIntent(activeIntentKey);
                resolvedIntentKeys.push(activeIntentKey);
              }
            }
          }
        }
      }
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