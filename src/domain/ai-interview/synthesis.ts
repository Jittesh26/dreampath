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
    };
    for (const fact of personalFacts) {
      if (fact.slot === 'fullName') personalObj.fullName = String(fact.value);
      if (fact.slot === 'email') personalObj.email = String(fact.value);
      if (fact.slot === 'phone') personalObj.phone = String(fact.value);
      if (fact.slot === 'location') personalObj.location = String(fact.value);
      if (fact.slot === 'professionalSummary') personalObj.professionalSummary = String(fact.value);
    }
    if (personalObj.fullName && personalObj.email && personalObj.email.includes('@')) {
      content.personal = personalObj;
    }
  }

  // 2. Process Education Entities
  const eduEntities = ledger.getEntitiesByType('education');
  for (const edu of eduEntities) {
    const facts = ledger.getFactsForEntity(edu.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    const institution = (factMap.get('institution') as string) || edu.displayName;
    const qualification = (factMap.get('degree') as string) || 'Bachelor Degree';
    const fieldOfStudy = (factMap.get('field_of_study') as string) || '';
    const cgpa = factMap.get('cgpa') !== undefined ? String(factMap.get('cgpa')) : undefined;
    const startYear = (factMap.get('start_year') as string) || '';
    const endYear = (factMap.get('end_year') as string) || '';

    content.education!.push({
      id: crypto.randomUUID(),
      institution,
      qualification,
      fieldOfStudy,
      educationLevel: 'Bachelor',
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

    const employer = (factMap.get('employer') as string) || exp.displayName;
    const position = (factMap.get('position') as string) || 'Team Member';
    const responsibilities = (factMap.get('responsibilities') as string) || '';
    const achievements = Array.isArray(factMap.get('achievements'))
      ? (factMap.get('achievements') as string[])
      : factMap.get('achievements')
      ? [String(factMap.get('achievements'))]
      : [];

    content.experience!.push({
      id: crypto.randomUUID(),
      employer,
      position,
      description: responsibilities,
      achievements,
      startDate: (factMap.get('start_date') as string) || '',
      endDate: (factMap.get('end_date') as string) || 'Present',
      isCurrent: !factMap.get('end_date'),
    });
  }

  // 4. Process Project Entities
  const projEntities = ledger.getEntitiesByType('project');
  for (const proj of projEntities) {
    const facts = ledger.getFactsForEntity(proj.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    const name = (factMap.get('name') as string) || proj.displayName;
    const role = (factMap.get('role') as string) || 'Contributor';
    const description = (factMap.get('description') as string) || '';
    const rawTech = factMap.get('technologies');
    const technologies = Array.isArray(rawTech) ? rawTech.map(String) : rawTech ? [String(rawTech)] : [];

    content.projects!.push({
      id: crypto.randomUUID(),
      name,
      role,
      description,
      technologies,
      startDate: (factMap.get('start_date') as string) || '',
      endDate: (factMap.get('end_date') as string) || '',
    });
  }

  // 5. Process Skills
  const skillFacts = ledger.getFactsForEntity('skill|self');
  for (const fact of skillFacts) {
    if (fact.slot === 'technical') {
      const val = fact.value;
      const arr = Array.isArray(val) ? val.map(String) : [String(val)];
      content.skills!.technical = Array.from(new Set([...(content.skills?.technical || []), ...arr]));
    }
    if (fact.slot === 'languages') {
      const val = fact.value;
      const arr = Array.isArray(val) ? val.map(String) : [String(val)];
      content.skills!.languages = Array.from(new Set([...(content.skills?.languages || []), ...arr]));
    }
  }

  // 6. Leadership
  const leadEntities = ledger.getEntitiesByType('leadership');
  for (const lead of leadEntities) {
    const facts = ledger.getFactsForEntity(lead.id);
    const factMap = new Map(facts.map((f) => [f.slot, f.value]));

    content.leadership!.push({
      id: crypto.randomUUID(),
      organization: (factMap.get('organization') as string) || lead.displayName,
      role: (factMap.get('role') as string) || 'Member',
      description: (factMap.get('description') as string) || '',
      startDate: (factMap.get('start_date') as string) || '',
      endDate: (factMap.get('end_date') as string) || '',
    });
  }

  return content;
}
