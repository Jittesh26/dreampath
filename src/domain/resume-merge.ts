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
 * Semantically merges AI-generated wording into an existing ResumeContent document.
 * Matches entities by natural keys rather than random UUIDs, updating existing records
 * with new metrics, bullet points, or dates while appending distinct new experiences.
 */
export function mergeResumeContent(
  existing: ResumeContent,
  generated: GeneratedWording
): ResumeContent {
  const result: ResumeContent = JSON.parse(JSON.stringify(existing));

  // 1. Personal Information
  if (generated.personal) {
    result.personal = {
      fullName: generated.personal.fullName || result.personal?.fullName || '',
      email: generated.personal.email || result.personal?.email || '',
      phone: generated.personal.phone || result.personal?.phone,
      location: generated.personal.location || result.personal?.location,
      linkedin: generated.personal.linkedin || result.personal?.linkedin,
      github: generated.personal.github || result.personal?.github,
      portfolio: generated.personal.portfolio || result.personal?.portfolio,
      professionalSummary: generated.personal.professionalSummary || result.personal?.professionalSummary,
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
        // Update existing entry with newer/richer data
        const old = eduList[matchIdx];
        eduList[matchIdx] = {
          ...old,
          institution: newEdu.institution || old.institution,
          qualification: newEdu.qualification || old.qualification,
          fieldOfStudy: newEdu.fieldOfStudy || old.fieldOfStudy,
          educationLevel: newEdu.educationLevel || old.educationLevel,
          cgpa: newEdu.cgpa || old.cgpa,
          startDate: newEdu.startDate || old.startDate,
          endDate: newEdu.endDate || old.endDate,
          spmSubjects: newEdu.spmSubjects && newEdu.spmSubjects.length > 0 ? newEdu.spmSubjects : old.spmSubjects,
        };
      } else {
        eduList.push({ ...newEdu, id: ensureValidUUID(newEdu.id) });
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
          employer: newExp.employer || old.employer,
          position: newExp.position || old.position,
          location: newExp.location || old.location,
          startDate: newExp.startDate || old.startDate,
          endDate: newExp.endDate || old.endDate,
          isCurrent: newExp.isCurrent ?? old.isCurrent,
          description: newExp.description || old.description,
          achievements: mergedAchievements,
        };
      } else {
        expList.push({ ...newExp, id: ensureValidUUID(newExp.id) });
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
          name: newProj.name || old.name,
          role: newProj.role || old.role,
          description: newProj.description || old.description,
          technologies: mergedTech,
          achievements: mergedAch,
          projectUrl: newProj.projectUrl || old.projectUrl,
          startDate: newProj.startDate || old.startDate,
          endDate: newProj.endDate || old.endDate,
        };
      } else {
        projList.push({ ...newProj, id: ensureValidUUID(newProj.id) });
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
        certList[matchIdx] = { ...certList[matchIdx], ...newCert };
      } else {
        certList.push({ ...newCert, id: ensureValidUUID(newCert.id) });
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
        awardList[matchIdx] = { ...awardList[matchIdx], ...newAward };
      } else {
        awardList.push({ ...newAward, id: ensureValidUUID(newAward.id) });
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
        leadList[matchIdx] = { ...leadList[matchIdx], ...newLead };
      } else {
        leadList.push({ ...newLead, id: ensureValidUUID(newLead.id) });
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
        volList[matchIdx] = { ...volList[matchIdx], ...newVol };
      } else {
        volList.push({ ...newVol, id: ensureValidUUID(newVol.id) });
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
        scholList[matchIdx] = { ...scholList[matchIdx], ...newSchol };
      } else {
        scholList.push({ ...newSchol, id: ensureValidUUID(newSchol.id) });
      }
    }
    result.scholarships = scholList;
  }

  return result;
}
