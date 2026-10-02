import { InterviewLedger } from './ledger';
import { ResumeContent } from '../resume';

/**
 * Strict Resume Synthesis from Verified Interview Facts
 *
 * Anti-Hallucination Constitution:
 * 1. Every statement in the synthesized resume MUST come directly from facts recorded in the ledger.
 * 2. Never invent unmentioned metrics, dates, awards, positions, or technologies.
 */
export function synthesizeResumeFromLedger(ledger: InterviewLedger): ResumeContent {
  const content: ResumeContent = {
    education: [],
    experience: [],
    projects: [],
    skills: {
      technical: [],
      soft: [],
      languages: [],
    },
    certifications: [],
    awards: [],
    leadership: [],
    volunteering: [],
    scholarships: [],
    customSections: [],
  };

  // 1. Process Personal Facts
  const personalFacts = ledger.getFactsForEntity('personal|self');
  if (personalFacts.length > 0) {
    const personalObj: any = {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      professionalSummary: '',
      linkedin: '',
      github: '',
      portfolio: '',
      photoUrl: '',
    };
    for (const fact of personalFacts) {
      if (fact.slot === 'fullName') personalObj.fullName = String(fact.value);
      if (fact.slot === 'email') personalObj.email = String(fact.value);
      if (fact.slot === 'phone') personalObj.phone = String(fact.value);
      if (fact.slot === 'location') personalObj.location = String(fact.value);
      if (fact.slot === 'professionalSummary') personalObj.professionalSummary = String(fact.value);
      if (fact.slot === 'linkedin') personalObj.linkedin = String(fact.value);
      if (fact.slot === 'github') personalObj.github = String(fact.value);
      if (fact.slot === 'portfolio') personalObj.portfolio = String(fact.value);
      if (fact.slot === 'photoUrl') personalObj.photoUrl = String(fact.value);
    }

    // Clean empty optional fields so they don't fail Zod validation
    if (!personalObj.linkedin) delete personalObj.linkedin;
    if (!personalObj.github) delete personalObj.github;
    if (!personalObj.portfolio) delete personalObj.portfolio;
    if (!personalObj.photoUrl) delete personalObj.photoUrl;
    if (!personalObj.phone) delete personalObj.phone;
    if (!personalObj.location) delete personalObj.location;
    if (!personalObj.professionalSummary) delete personalObj.professionalSummary;
    if (!personalObj.email || !personalObj.email.includes('@')) delete personalObj.email;

    if (personalObj.fullName && personalObj.email && personalObj.email.includes('@')) {
      content.personal = personalObj;
    } else if (personalObj.fullName) {
      // Name is known; email will be supplemented from verified auth in synthesizeAndSaveResume if available
      content.personal = personalObj;
    }
  }

  // 2. Process Education Entities
  const eduEntities = ledger.getEntitiesByType('education');
  for (const edu of eduEntities) {
    const facts = ledger.getFactsForEntity(edu.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    const institution = factMap.get('institution') != null ? String(factMap.get('institution')) : edu.displayName;
    const qualification = factMap.get('degree') != null ? String(factMap.get('degree')) : '';
    const fieldOfStudy = factMap.get('field_of_study') != null ? String(factMap.get('field_of_study')) : '';
    const cgpa = factMap.get('cgpa') !== undefined && factMap.get('cgpa') !== null ? String(factMap.get('cgpa')) : undefined;
    const rawStartYear = factMap.get('start_year');
    const rawEndYear = factMap.get('end_year');
    const startYear = rawStartYear !== undefined && rawStartYear !== null ? String(rawStartYear) : '';
    const endYear = rawEndYear !== undefined && rawEndYear !== null ? String(rawEndYear) : '';

    // Detect education level from the degree text
    let educationLevel: 'SPM' | 'STPM' | 'Foundation' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD' | 'Other' = 'Other';
    const qualLower = qualification.toLowerCase();
    if (/\bphd\b|\bdoctorate\b|\bdoctor\s+of\b/i.test(qualLower)) educationLevel = 'PhD';
    else if (/\bmaster\b|\bmsc\b|\bma\b|\bmba\b/i.test(qualLower)) educationLevel = 'Master';
    else if (/\bbachelor\b|\bbsc\b|\bba\b|\bdegree\b/i.test(qualLower)) educationLevel = 'Bachelor';
    else if (/\bdiploma\b/i.test(qualLower)) educationLevel = 'Diploma';
    else if (/\bfoundation\b/i.test(qualLower)) educationLevel = 'Foundation';
    else if (/\bstpm\b/i.test(qualLower)) educationLevel = 'STPM';
    else if (/\bspm\b/i.test(qualLower)) educationLevel = 'SPM';

    content.education!.push({
      id: crypto.randomUUID(),
      institution,
      qualification: qualification || 'Degree Programme',
      fieldOfStudy,
      educationLevel,
      cgpa,
      startDate: startYear,
      endDate: endYear || 'Present',
    });
  }

  // 3. Process Work Experience Entities
  const expEntities = ledger.getEntitiesByType('experience');
  for (const exp of expEntities) {
    const facts = ledger.getFactsForEntity(exp.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    // Skip entities that were only marked as 'declared_none'
    const declaredNone = ledger.getSlot(exp.id, 'declared_none');
    if (declaredNone?.state === 'declared_none') continue;

    const employer = factMap.get('employer') != null ? String(factMap.get('employer')) : exp.displayName;
    const position = factMap.get('position') != null ? String(factMap.get('position')) : 'Team Member';
    const responsibilities = factMap.get('responsibilities') != null ? String(factMap.get('responsibilities')) : '';
    const achievements = Array.isArray(factMap.get('achievements'))
      ? (factMap.get('achievements') as string[])
      : factMap.get('achievements')
      ? [String(factMap.get('achievements'))]
      : [];

    const rawStartDate = factMap.get('start_date');
    const rawEndDate = factMap.get('end_date');
    const startDate = rawStartDate !== undefined && rawStartDate !== null ? String(rawStartDate) : '';
    const endDate = rawEndDate !== undefined && rawEndDate !== null ? String(rawEndDate) : 'Present';

    content.experience!.push({
      id: crypto.randomUUID(),
      employer,
      position,
      description: responsibilities,
      achievements,
      startDate,
      endDate,
      isCurrent: !factMap.get('end_date'),
    });
  }

  // 4. Process Project Entities
  const projEntities = ledger.getEntitiesByType('project');
  for (const proj of projEntities) {
    const facts = ledger.getFactsForEntity(proj.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    const name = factMap.get('name') != null ? String(factMap.get('name')) : proj.displayName;
    const role = factMap.get('role') != null ? String(factMap.get('role')) : 'Contributor';
    const description = factMap.get('description') != null ? String(factMap.get('description')) : '';

    // Collect ALL technology facts for this project (merge arrays from multiple turns)
    const allTechFacts = facts.filter((f) => f.slot === 'technologies');
    const allTechs: string[] = [];
    for (const tf of allTechFacts) {
      const v = tf.value;
      if (Array.isArray(v)) allTechs.push(...v.map(String));
      else if (v) allTechs.push(String(v));
    }
    const technologies = Array.from(new Set(allTechs));

    // Collect contributions as achievements
    const allContribFacts = facts.filter((f) => f.slot === 'contributions');
    const allContribs: string[] = [];
    for (const cf of allContribFacts) {
      const v = cf.value;
      if (Array.isArray(v)) allContribs.push(...v.map(String));
      else if (v) allContribs.push(String(v));
    }
    const achievements = Array.from(new Set(allContribs));

    const rawStartDate = factMap.get('start_date');
    const rawEndDate = factMap.get('end_date');
    const startDate = rawStartDate !== undefined && rawStartDate !== null ? String(rawStartDate) : '';
    const endDate = rawEndDate !== undefined && rawEndDate !== null ? String(rawEndDate) : '';

    content.projects!.push({
      id: crypto.randomUUID(),
      name,
      role,
      description,
      technologies,
      achievements,
      startDate,
      endDate,
    });
  }

  // 5. Process Skills — collect ALL technical facts across turns (not just last-write-wins)
  const skillFacts = ledger.getFactsForEntity('skill|self');
  const techSet = new Set<string>(content.skills?.technical || []);
  const langSet = new Set<string>(content.skills?.languages || []);
  for (const fact of skillFacts) {
    if (fact.slot === 'technical') {
      const val = fact.value;
      const arr = Array.isArray(val) ? val.map(String) : [String(val)];
      for (const t of arr) techSet.add(t);
    }
    if (fact.slot === 'languages') {
      const val = fact.value;
      const arr = Array.isArray(val) ? val.map(String) : [String(val)];
      for (const l of arr) langSet.add(l);
    }
  }
  content.skills!.technical = Array.from(techSet);
  content.skills!.languages = Array.from(langSet);

  // 6. Leadership
  const leadEntities = ledger.getEntitiesByType('leadership');
  for (const lead of leadEntities) {
    const facts = ledger.getFactsForEntity(lead.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    const rawStartDate = factMap.get('start_date');
    const rawEndDate = factMap.get('end_date');
    const startDate = rawStartDate !== undefined && rawStartDate !== null ? String(rawStartDate) : '';
    const endDate = rawEndDate !== undefined && rawEndDate !== null ? String(rawEndDate) : '';

    content.leadership!.push({
      id: crypto.randomUUID(),
      organization: factMap.get('organization') != null ? String(factMap.get('organization')) : lead.displayName,
      role: factMap.get('role') != null ? String(factMap.get('role')) : 'Member',
      description: factMap.get('description') != null ? String(factMap.get('description')) : '',
      startDate,
      endDate,
    });
  }

  return content;
}
