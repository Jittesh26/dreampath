import { InterviewLedger, makeIntentKey } from './ledger';
import { PlanNextIntentResult } from './types';

/**
 * Deterministic Interview Planner
 *
 * Rules:
 * 1. The LLM NEVER decides what question or topic comes next.
 * 2. The planner inspects known entities, slots, and slot states to pick the next unresolved intent.
 * 3. Once an intent is resolved or a slot is known/inferred/declared_none/skipped, it is NEVER re-asked in normal flow.
 * 4. Never assume an entity (e.g. work experience or project) exists unless explicitly created.
 * 5. If student declared 'declared_none' for experience, do not ask about experience; move to projects/skills.
 * 6. Deterministic templates provide natural fallback questions for every intent.
 */

const CORE_EDUCATION_SLOTS = ['institution', 'degree', 'field_of_study', 'start_year', 'cgpa'] as const;
const CORE_EXPERIENCE_SLOTS = ['employer', 'responsibilities'] as const;
const CORE_PROJECT_SLOTS = ['name', 'role', 'description', 'technologies'] as const;

export class DeterministicPlanner {
  /**
   * Plans the next intent based strictly on the current ledger state.
   */
  public planNextIntent(ledger: InterviewLedger): PlanNextIntentResult {
    // 1. Check if session is already marked complete
    if (ledger.isComplete) {
      return {
        intentKey: null,
        isComplete: true,
        suggestedPrompt: 'Thank you! We have compiled your verified achievements. You can now review and build your tailored resume.',
        topic: 'completion',
      };
    }

    // 2. EDUCATION SECTION (Priority 1)
    const educationEntities = ledger.getEntitiesByType('education');

    if (educationEntities.length === 0) {
      // No education entity created yet
      const intentKey = 'education|general|overview';
      return {
        intentKey,
        isComplete: false,
        slotName: 'overview',
        suggestedPrompt: "Hello! Let's build your resume together. What are you currently studying and where?",
        topic: 'education',
      };
    }

    // Check slots for the primary education entity
    const primaryEdu = educationEntities[0];
    for (const slot of CORE_EDUCATION_SLOTS) {
      const intentKey = makeIntentKey('education', primaryEdu.normalizedKey, slot);
      const slotRecord = ledger.getSlot(primaryEdu.id, slot);

      // Special timeline check: if start_year is unknown, but expected_graduation, end_year, or standing year is known,
      // consider the education timeline complete.
      if (slot === 'start_year' && (!slotRecord || slotRecord.state === 'unknown')) {
        const hasGrad = ledger.isSlotKnown(primaryEdu.id, 'expected_graduation') || ledger.isSlotKnown(primaryEdu.id, 'end_year');
        const hasStanding = ledger.isSlotKnown(primaryEdu.id, 'year');
        if (hasGrad || hasStanding) {
          ledger.resolveIntent(intentKey);
          continue;
        }
      }

      // If slot is unknown and intent not yet resolved, this is our next question
      if (!slotRecord || slotRecord.state === 'unknown') {
        if (!ledger.isIntentResolved(intentKey)) {
          return {
            intentKey,
            isComplete: false,
            targetEntityId: primaryEdu.id,
            slotName: slot,
            suggestedPrompt: this.getTemplateForIntent(intentKey, primaryEdu.displayName),
            topic: 'education',
          };
        }
      }
    }

    // 3. WORK EXPERIENCE SECTION (Priority 2)
    // Check if work experience was declared none or skipped
    const expDeclaredNone = ledger.slots.get('experience|general|declared_none');
    const isExpDeclaredNone = expDeclaredNone?.state === 'declared_none' || expDeclaredNone?.state === 'skipped';

    const experienceEntities = ledger.getEntitiesByType('experience');

    if (!isExpDeclaredNone) {
      if (experienceEntities.length === 0) {
        const intentKey = 'experience|general|overview';
        if (!ledger.isIntentResolved(intentKey)) {
          return {
            intentKey,
            isComplete: false,
            slotName: 'overview',
            suggestedPrompt: "Could you share any work experience, part-time jobs, or internships you've held?",
            topic: 'experience',
          };
        }
      } else {
        // If an experience entity was created (e.g. experience|health_lane), check its slots
        for (const exp of experienceEntities) {
          if (ledger.getSlot(exp.id, 'declared_none')?.state === 'declared_none') continue;

          for (const slot of CORE_EXPERIENCE_SLOTS) {
            const intentKey = makeIntentKey('experience', exp.normalizedKey, slot);
            const slotRecord = ledger.getSlot(exp.id, slot);

            if (!slotRecord || slotRecord.state === 'unknown') {
              if (!ledger.isIntentResolved(intentKey)) {
                return {
                  intentKey,
                  isComplete: false,
                  targetEntityId: exp.id,
                  slotName: slot,
                  suggestedPrompt: this.getTemplateForIntent(intentKey, exp.displayName),
                  topic: 'experience',
                };
              }
            }
          }
        }
      }
    }

    // 4. PROJECTS SECTION (Priority 3)
    const projDeclaredNone = ledger.slots.get('project|general|declared_none');
    const isProjDeclaredNone = projDeclaredNone?.state === 'declared_none' || projDeclaredNone?.state === 'skipped';

    const projectEntities = ledger.getEntitiesByType('project');

    if (!isProjDeclaredNone) {
      if (projectEntities.length === 0) {
        const intentKey = 'project|general|overview';
        if (!ledger.isIntentResolved(intentKey)) {
          return {
            intentKey,
            isComplete: false,
            slotName: 'overview',
            suggestedPrompt: "Tell me about any university, academic, or personal technical projects you've built or contributed to.",
            topic: 'project',
          };
        }
      } else {
        // Check slots for volunteered projects (e.g. project|campusfind)
        for (const proj of projectEntities) {
          if (ledger.getSlot(proj.id, 'declared_none')?.state === 'declared_none') continue;

          for (const slot of CORE_PROJECT_SLOTS) {
            const intentKey = makeIntentKey('project', proj.normalizedKey, slot);
            const slotRecord = ledger.getSlot(proj.id, slot);

            if (!slotRecord || slotRecord.state === 'unknown') {
              if (!ledger.isIntentResolved(intentKey)) {
                return {
                  intentKey,
                  isComplete: false,
                  targetEntityId: proj.id,
                  slotName: slot,
                  suggestedPrompt: this.getTemplateForIntent(intentKey, proj.displayName),
                  topic: 'project',
                };
              }
            }
          }
        }
      }
    }

    // 5. TECHNICAL SKILLS SECTION (Priority 4)
    const skillsKnown = ledger.isSlotKnown('skill|self', 'technical');
    const skillsIntentKey = 'skill|self|technical';

    if (!skillsKnown && !ledger.isIntentResolved(skillsIntentKey)) {
      return {
        intentKey: skillsIntentKey,
        isComplete: false,
        targetEntityId: 'skill|self',
        slotName: 'technical',
        suggestedPrompt: 'What key technical skills, programming languages, or software tools do you feel most confident using?',
        topic: 'skill',
      };
    }

    // 6. LEADERSHIP & EXTRACURRICULAR (Priority 5)
    const leadershipIntentKey = 'leadership|self|overview';
    const leadershipEntities = ledger.getEntitiesByType('leadership');
    if (leadershipEntities.length === 0 && !ledger.isIntentResolved(leadershipIntentKey)) {
      return {
        intentKey: leadershipIntentKey,
        isComplete: false,
        slotName: 'overview',
        suggestedPrompt: 'Have you held any leadership roles, club committee positions, or volunteer engagements at university or school?',
        topic: 'leadership',
      };
    }

    // 7. RESUME COMPLETION & MISSING INFORMATION PHASE (Priority 6)
    // Inspect structured facts and ask only for critical missing details needed for a complete resume.

    // 7A. Student Full Name: Must be asked if missing and no verified name exists
    const hasKnownName = ledger.isSlotKnown('personal|self', 'fullName');
    const nameIntentKey = 'personal|self|fullName';
    if (!hasKnownName && !ledger.isIntentResolved(nameIntentKey)) {
      return {
        intentKey: nameIntentKey,
        isComplete: false,
        targetEntityId: 'personal|self',
        slotName: 'fullName',
        suggestedPrompt: 'What is your full name as you would like it to appear on your resume?',
        topic: 'personal',
      };
    }

    // 7B. Official Job Title: If any experience entity is missing a job title/position
    for (const exp of experienceEntities) {
      const positionSlot = ledger.getSlot(exp.id, 'position');
      const posIntentKey = makeIntentKey('experience', exp.normalizedKey, 'position');
      const isPosKnown =
        positionSlot?.state === 'known' ||
        positionSlot?.state === 'inferred' ||
        positionSlot?.state === 'declared_none' ||
        positionSlot?.state === 'skipped';
      if (!isPosKnown && !ledger.isIntentResolved(posIntentKey)) {
        return {
          intentKey: posIntentKey,
          isComplete: false,
          targetEntityId: exp.id,
          slotName: 'position',
          suggestedPrompt: `What was your official job title at ${exp.displayName}?`,
          topic: 'experience',
        };
      }
    }

    // 7C. Contact Information & Professional Links (Grouped to prevent endless questions)
    const hasPhone = ledger.isSlotKnown('personal|self', 'phone');
    const hasLinkedIn = ledger.isSlotKnown('personal|self', 'linkedin');
    const hasGitHub = ledger.isSlotKnown('personal|self', 'github');
    const hasPortfolio = ledger.isSlotKnown('personal|self', 'portfolio');
    const contactLinksIntentKey = 'personal|self|contact_links';

    if (!hasPhone && !hasLinkedIn && !hasGitHub && !hasPortfolio && !ledger.isIntentResolved(contactLinksIntentKey)) {
      return {
        intentKey: contactLinksIntentKey,
        isComplete: false,
        targetEntityId: 'personal|self',
        slotName: 'contact_links',
        suggestedPrompt: "Do you have a phone number or any professional links (such as LinkedIn, GitHub, or a portfolio) you'd like to include? You can share them here or say 'skip'.",
        topic: 'personal',
      };
    }

    // 7D. Optional Profile Photo
    const photoIntentKey = 'personal|self|photo';
    const hasPhoto = ledger.isSlotKnown('personal|self', 'photoUrl');
    if (!hasPhoto && !ledger.isIntentResolved(photoIntentKey)) {
      return {
        intentKey: photoIntentKey,
        isComplete: false,
        targetEntityId: 'personal|self',
        slotName: 'photo',
        suggestedPrompt: 'Would you like to include a professional photo on your resume? If yes, you can provide a photo link or upload. This is completely optional — you can say "skip" if you prefer not to include one.',
        topic: 'personal',
      };
    }

    // 8. FINAL COMPLETION PROTOCOL
    // All core sections and missing critical fields have been addressed
    ledger.session.isComplete = true;
    return {
      intentKey: null,
      isComplete: true,
      suggestedPrompt: 'Thank you! We have compiled your verified achievements. You can now review and build your tailored resume.',
      topic: 'completion',
    };
  }

  /**
   * Deterministic template lookup for any intent key.
   */
  public getTemplateForIntent(intentKey: string, displayName?: string): string {
    const parts = intentKey.split('|');
    const entityType = parts[0];
    const slotName = parts[parts.length - 1];
    const label = displayName || 'your institution';

    switch (entityType) {
      case 'personal':
        switch (slotName.toLowerCase()) {
          case 'fullname':
            return 'What is your full name as you would like it to appear on your resume?';
          case 'contact_links':
            return "Do you have a phone number or any professional links (such as LinkedIn, GitHub, or a portfolio) you'd like to include? You can share them here or say 'skip'.";
          case 'photo':
            return 'Would you like to include a professional photo on your resume? If yes, you can provide a photo link or upload. This is completely optional — you can say "skip" if you prefer not to include one.';
          case 'email':
            return 'What email address would you like to use on your resume?';
          case 'phone':
            return 'What phone number would you like to include on your resume?';
          case 'linkedin':
            return "Do you have a LinkedIn profile you'd like to include on your resume? If yes, send me the link. You can skip this if you don't have one.";
          default:
            return 'Could you share your personal and contact details for your resume?';
        }

      case 'education':
        switch (slotName) {
          case 'degree':
            return `What is the exact degree or qualification title you are pursuing at ${label}?`;
          case 'institution':
            return 'Which university or college are you currently attending?';
          case 'field_of_study':
            return `What is your major or specific field of study at ${label}?`;
          case 'start_year':
            return `In what year did you start your studies at ${label}?`;
          case 'cgpa':
            return `What is your current CGPA or academic grade point average at ${label}?`;
          default:
            return `Could you tell me more about your education at ${label}?`;
        }

      case 'experience':
        switch (slotName) {
          case 'position':
            return `What was your official job title at ${label}?`;
          case 'responsibilities':
            return `What were your main responsibilities and daily tasks at ${label}?`;
          case 'achievements':
            return `Did you achieve any notable milestones, metrics, or improvements during your time at ${label}?`;
          default:
            return `Could you share more details regarding your role at ${label}?`;
        }

      case 'project':
        switch (slotName) {
          case 'role':
            return `What was your specific role on the ${label} project?`;
          case 'description':
            return `Could you briefly describe the main purpose and functionality of ${label}?`;
          case 'technologies':
            return `What technologies, frameworks, programming languages, or tools did you use to build ${label}?`;
          default:
            return `Could you share more details about the ${label} project?`;
        }

      case 'skill':
        return 'What key technical skills, programming languages, or software tools do you feel most confident using?';

      case 'leadership':
        return 'What were your primary responsibilities and achievements in that leadership role?';

      default:
        return 'Could you share more details about that?';
    }
  }
}

export const deterministicPlanner = new DeterministicPlanner();
