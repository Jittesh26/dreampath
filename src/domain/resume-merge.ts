import { ResumeContent } from './resume';
import { GeneratedWording } from './ai-interview';

function normalize(str?: string | null): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureValidUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

/**
 * For existing entities, existing non-empty scalar resume content wins over newly synthesized scalar content.
 * If the existing value is empty, null, or undefined, the new AI value is used to populate it.
 */
function mergeScalarString(oldVal?: string | null, newVal?: string | null): string | undefined {
  if (oldVal !== undefined && oldVal !== null) {
    const s = String(oldVal).trim();
    if (s !== '') return String(oldVal);
  }
  if (newVal !== undefined && newVal !== null) {
    const s = String(newVal).trim();
    if (s !== '') return String(newVal);
  }
  return oldVal !== undefined && oldVal !== null
    ? String(oldVal)
    : (newVal !== undefined && newVal !== null ? String(newVal) : undefined);
}

function mergeDateOrString(oldVal: unknown, newVal: unknown): string | undefined {
  if (oldVal !== undefined && oldVal !== null) {
    const s = String(oldVal).trim();
    if (s !== '') return s;
  }
  if (newVal !== undefined && newVal !== null) {
    const s = String(newVal).trim();
    if (s !== '') return s;
  }
  return undefined;
}

/**
 * Semantically merges AI-generated wording into an existing ResumeContent document.
 *
 * Rules:
 * 1. For existing entities, existing non-empty scalar resume content wins over newly synthesized scalar content.
 * 2. If an existing entity has an empty/unpopulated field, the AI-generated value is used.
 * 3. New entities that do not exist yet are appended cleanly.
 * 4. Existing arrays and lists (skills, achievements, technologies) continue using safe additive/deduplicating merge.
 */
export function mergeResumeContent(
  existing: ResumeContent,
  generated: GeneratedWording
): ResumeContent {
  const result: ResumeContent = JSON.parse(JSON.stringify(existing));

  // 1. Personal Information
  if (generated.personal) {
    result.personal = {
      fullName: mergeScalarString(result.personal?.fullName, generated.personal.fullName) || '',
      email: mergeScalarString(result.personal?.email, generated.personal.email) || '',
      phone: mergeScalarString(result.personal?.phone, generated.personal.phone),
      location: mergeScalarString(result.personal?.location, generated.personal.location),
      linkedin: mergeScalarString(result.personal?.linkedin, generated.personal.linkedin),
      github: mergeScalarString(result.personal?.github, generated.personal.github),
      portfolio: mergeScalarString(result.personal?.portfolio, generated.personal.portfolio),
      professionalSummary: mergeScalarString(result.personal?.professionalSummary, generated.personal.professionalSummary),
      photoUrl: mergeScalarString((result.personal as any)?.photoUrl, (generated.personal as any)?.photoUrl),
    };
  }

  // 2. Education
  if (generated.education && generated.education.length > 0) {
    const eduList = [...result.education];
    for (const newEdu of generated.education) {
      const matchIdx = eduList.findIndex(e => {
        const instMatch = normalize(e.institution) === normalize(newEdu.institution);
        const qualMatch = normalize(e.qualification) === normalize(newEdu.qualification);
        const levelMatch = e.educationLevel === newEdu.educationLevel;
        return (instMatch && qualMatch) || (instMatch && levelMatch);
      });

      if (matchIdx >= 0) {
        // Update existing entry with newer data while preserving existing manual scalars
        const old = eduList[matchIdx];
        eduList[matchIdx] = {
          ...old,
          institution: mergeScalarString(old.institution, newEdu.institution) || old.institution,
          qualification: mergeScalarString(old.qualification, newEdu.qualification) || old.qualification,
          fieldOfStudy: mergeScalarString(old.fieldOfStudy, newEdu.fieldOfStudy),
          educationLevel: old.educationLevel || newEdu.educationLevel,
          cgpa: mergeScalarString(
            old.cgpa != null ? String(old.cgpa) : undefined,
            newEdu.cgpa != null ? String(newEdu.cgpa) : undefined
          ),
          startDate: mergeDateOrString(old.startDate, newEdu.startDate),
          endDate: mergeDateOrString(old.endDate, newEdu.endDate),
          spmSubjects: old.spmSubjects && old.spmSubjects.length > 0 ? old.spmSubjects : newEdu.spmSubjects,
        };
      } else {
        eduList.push({
          ...newEdu,
          id: ensureValidUUID(newEdu.id),
          ...(newEdu.startDate != null ? { startDate: String(newEdu.startDate) } : {}),
          ...(newEdu.endDate != null ? { endDate: String(newEdu.endDate) } : {}),
          ...(newEdu.cgpa != null ? { cgpa: String(newEdu.cgpa) } : {}),
        });
      }
    }
    result.education = eduList;
  }

  // 3. Experience
  if (generated.experience && generated.experience.length > 0) {
    const expList = [...result.experience];
    for (const newExp of generated.experience) {
      const matchIdx = expList.findIndex(e => {
        const empMatch = normalize(e.employer) === normalize(newExp.employer);
        const posMatch = normalize(e.position) === normalize(newExp.position);
        return empMatch && (posMatch || !e.position);
      });

      if (matchIdx >= 0) {
        const old = expList[matchIdx];
        const mergedAchievements = Array.from(
          new Set([...(old.achievements || []), ...(newExp.achievements || [])])
        );
        expList[matchIdx] = {
          ...old,
          employer: mergeScalarString(old.employer, newExp.employer) || old.employer,
          position: mergeScalarString(old.position, newExp.position) || old.position,
          location: mergeScalarString(old.location, newExp.location),
          startDate: mergeDateOrString(old.startDate, newExp.startDate),
          endDate: mergeDateOrString(old.endDate, newExp.endDate),
          isCurrent: old.isCurrent !== undefined ? old.isCurrent : (newExp.isCurrent ?? false),
          description: mergeScalarString(old.description, newExp.description),
          achievements: mergedAchievements,
        };
      } else {
        expList.push({
          ...newExp,
          id: ensureValidUUID(newExp.id),
          ...(newExp.startDate != null ? { startDate: String(newExp.startDate) } : {}),
          ...(newExp.endDate != null ? { endDate: String(newExp.endDate) } : {}),
        });
      }
    }
    result.experience = expList;
  }

  // 4. Projects
  if (generated.projects && generated.projects.length > 0) {
    const projList = [...result.projects];
    for (const newProj of generated.projects) {
      const matchIdx = projList.findIndex(p => normalize(p.name) === normalize(newProj.name));

      if (matchIdx >= 0) {
        const old = projList[matchIdx];
        const mergedTech = Array.from(
          new Set([...(old.technologies || []), ...(newProj.technologies || [])])
        );
        const mergedAch = Array.from(
          new Set([...(old.achievements || []), ...(newProj.achievements || [])])
        );
        projList[matchIdx] = {
          ...old,
          name: mergeScalarString(old.name, newProj.name) || old.name,
          role: mergeScalarString(old.role, newProj.role),
          description: mergeScalarString(old.description, newProj.description),
          technologies: mergedTech,
          achievements: mergedAch,
          projectUrl: mergeScalarString(old.projectUrl, newProj.projectUrl),
          startDate: mergeDateOrString(old.startDate, newProj.startDate),
          endDate: mergeDateOrString(old.endDate, newProj.endDate),
        };
      } else {
        projList.push({
          ...newProj,
          id: ensureValidUUID(newProj.id),
          ...(newProj.startDate != null ? { startDate: String(newProj.startDate) } : {}),
          ...(newProj.endDate != null ? { endDate: String(newProj.endDate) } : {}),
        });
      }
    }
    result.projects = projList;
  }

  // 5. Skills
  if (generated.skills) {
    result.skills = {
      technical: Array.from(
        new Set([...(result.skills?.technical || []), ...(generated.skills.technical || [])])
      ),
      soft: Array.from(
        new Set([...(result.skills?.soft || []), ...(generated.skills.soft || [])])
      ),
      languages: Array.from(
        new Set([...(result.skills?.languages || []), ...(generated.skills.languages || [])])
      ),
    };
  }

  // 6. Certifications
  if (generated.certifications && generated.certifications.length > 0) {
    const certList = [...result.certifications];
    for (const newCert of generated.certifications) {
      const matchIdx = certList.findIndex(c => normalize(c.name) === normalize(newCert.name));
      if (matchIdx >= 0) {
        const old = certList[matchIdx];
        certList[matchIdx] = {
          ...old,
          name: mergeScalarString(old.name, newCert.name) || old.name,
          issuer: mergeScalarString(old.issuer, newCert.issuer) || old.issuer,
          date: mergeDateOrString(old.date, newCert.date),
          credentialUrl: mergeScalarString(old.credentialUrl, newCert.credentialUrl),
        };
      } else {
        certList.push({
          ...newCert,
          id: ensureValidUUID(newCert.id),
          ...(newCert.date != null ? { date: String(newCert.date) } : {}),
        });
      }
    }
    result.certifications = certList;
  }

  // 7. Awards
  if (generated.awards && generated.awards.length > 0) {
    const awardList = [...result.awards];
    for (const newAward of generated.awards) {
      const matchIdx = awardList.findIndex(a => normalize(a.name) === normalize(newAward.name));
      if (matchIdx >= 0) {
        const old = awardList[matchIdx];
        awardList[matchIdx] = {
          ...old,
          name: mergeScalarString(old.name, newAward.name) || old.name,
          issuer: mergeScalarString(old.issuer, newAward.issuer) || old.issuer,
          date: mergeDateOrString(old.date, newAward.date),
          description: mergeScalarString(old.description, newAward.description),
        };
      } else {
        awardList.push({
          ...newAward,
          id: ensureValidUUID(newAward.id),
          ...(newAward.date != null ? { date: String(newAward.date) } : {}),
        });
      }
    }
    result.awards = awardList;
  }

  // 8. Leadership
  if (generated.leadership && generated.leadership.length > 0) {
    const leadList = [...result.leadership];
    for (const newLead of generated.leadership) {
      const matchIdx = leadList.findIndex(l => 
        normalize(l.organization) === normalize(newLead.organization) &&
        normalize(l.role) === normalize(newLead.role)
      );
      if (matchIdx >= 0) {
        const old = leadList[matchIdx];
        leadList[matchIdx] = {
          ...old,
          organization: mergeScalarString(old.organization, newLead.organization) || old.organization,
          role: mergeScalarString(old.role, newLead.role) || old.role,
          description: mergeScalarString(old.description, newLead.description),
          startDate: mergeDateOrString(old.startDate, newLead.startDate),
          endDate: mergeDateOrString(old.endDate, newLead.endDate),
        };
      } else {
        leadList.push({
          ...newLead,
          id: ensureValidUUID(newLead.id),
          ...(newLead.startDate != null ? { startDate: String(newLead.startDate) } : {}),
          ...(newLead.endDate != null ? { endDate: String(newLead.endDate) } : {}),
        });
      }
    }
    result.leadership = leadList;
  }

  // 9. Volunteering
  if (generated.volunteering && generated.volunteering.length > 0) {
    const volList = [...result.volunteering];
    for (const newVol of generated.volunteering) {
      const matchIdx = volList.findIndex(v => normalize(v.organization) === normalize(newVol.organization));
      if (matchIdx >= 0) {
        const old = volList[matchIdx];
        volList[matchIdx] = {
          ...old,
          organization: mergeScalarString(old.organization, newVol.organization) || old.organization,
          role: mergeScalarString(old.role, newVol.role) || old.role,
          description: mergeScalarString(old.description, newVol.description),
          startDate: mergeDateOrString(old.startDate, newVol.startDate),
          endDate: mergeDateOrString(old.endDate, newVol.endDate),
        };
      } else {
        volList.push({
          ...newVol,
          id: ensureValidUUID(newVol.id),
          ...(newVol.startDate != null ? { startDate: String(newVol.startDate) } : {}),
          ...(newVol.endDate != null ? { endDate: String(newVol.endDate) } : {}),
        });
      }
    }
    result.volunteering = volList;
  }

  // 10. Scholarships
  if (generated.scholarships && generated.scholarships.length > 0) {
    const scholList = [...result.scholarships];
    for (const newSchol of generated.scholarships) {
      const matchIdx = scholList.findIndex(s => normalize(s.name) === normalize(newSchol.name));
      if (matchIdx >= 0) {
        const old = scholList[matchIdx];
        scholList[matchIdx] = {
          ...old,
          name: mergeScalarString(old.name, newSchol.name) || old.name,
          issuer: mergeScalarString(old.issuer, newSchol.issuer),
          year: mergeDateOrString(old.year, newSchol.year),
          description: mergeScalarString(old.description, newSchol.description),
        };
      } else {
        scholList.push({
          ...newSchol,
          id: ensureValidUUID(newSchol.id),
          ...(newSchol.year != null ? { year: String(newSchol.year) } : {}),
        });
      }
    }
    result.scholarships = scholList;
  }

  return result;
}
