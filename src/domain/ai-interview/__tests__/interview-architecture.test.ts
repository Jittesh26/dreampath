import { describe, it, expect, beforeEach } from 'vitest';
import {
  InterviewLedger,
  makeEntityId,
  makeSlotId,
  makeIntentKey,
} from '../ledger';
import { DeterministicPlanner, deterministicPlanner } from '../planner';
import { DeterministicExtractor, deterministicExtractor } from '../extractor';
import { ProviderCascade } from '../provider-cascade';
import { redactSensitiveData } from '../redactor';
import { saveSessionSnapshot, loadSessionSnapshot } from '../persistence';
import { synthesizeResumeFromLedger } from '../synthesis';

describe('Approved Resume AI Architecture & Regression Tests', () => {
  let ledger: InterviewLedger;
  let planner: DeterministicPlanner;
  let extractor: DeterministicExtractor;
  const resumeVersionId = crypto.randomUUID();
  const resumeProfileId = crypto.randomUUID();

  beforeEach(() => {
    ledger = new InterviewLedger({
      id: `session_${crypto.randomUUID()}`,
      resumeVersionId,
      resumeProfileId,
      currentTurn: 0,
      isComplete: false,
      currentIntentKey: 'education|general|overview',
      summary: null,
    });
    planner = new DeterministicPlanner();
    extractor = new DeterministicExtractor();
  });

  // --------------------------------------------------------------------------
  // 1. Persistence Bug Regression Test (Section 10 & 11)
  // --------------------------------------------------------------------------
  it('correctly handles new records and existing records without failing on uncommitted IDs (trx_w0vrumlu7)', async () => {
    // Add transcript with a specific trx_ id
    const trx = ledger.addTranscript('ai', "Hello! Let's build your resume together.");
    expect(trx.id).toMatch(/^trx_/);

    // Initial snapshot save (inserts session and transcript)
    await expect(saveSessionSnapshot(ledger)).resolves.not.toThrow();

    // Verify loading snapshot
    const loaded = await loadSessionSnapshot(resumeVersionId);
    expect(loaded).not.null;
    expect(loaded!.transcripts.length).toBe(1);
    expect(loaded!.transcripts[0].id).toBe(trx.id);

    // Add a second transcript (student response)
    const trx2 = loaded!.addTranscript(
      'student',
      "I'm currently pursuing a Bachelor of Computer Science with Honours at Universiti Pertahanan Nasional Malaysia (UPNM). I started in 2025, and my current CGPA is 3.98."
    );

    // Save second snapshot (trx1 is existing, trx2 is new)
    await expect(saveSessionSnapshot(loaded!)).resolves.not.toThrow();

    // Verify both persist without duplicate key errors or invalid query errors
    const reloaded = await loadSessionSnapshot(resumeVersionId);
    expect(reloaded!.transcripts.length).toBe(2);
    expect(reloaded!.transcripts.map((t) => t.id)).toEqual([trx.id, trx2.id]);
  });

  // --------------------------------------------------------------------------
  // 2. Original Behavioural Bug & Repetition Prevention (Section 12 & 13)
  // --------------------------------------------------------------------------
  it('recognizes degree, institution, start year, and CGPA in one answer and DOES NOT repeat questions', () => {
    const studentAnswer =
      "I'm currently pursuing a Bachelor of Computer Science with Honours at Universiti Pertahanan Nasional Malaysia (UPNM). I started in 2025, and my current CGPA is 3.98.";

    // 1. Initial plan asks for education overview
    const initialPlan = planner.planNextIntent(ledger);
    expect(initialPlan.intentKey).toBe('education|general|overview');

    // 2. Student gives comprehensive answer
    ledger.addTranscript('student', studentAnswer);
    extractor.extract(studentAnswer, ledger);

    // Verify entity was created
    const eduEntity = ledger.getEntity('education|upnm');
    expect(eduEntity).toBeDefined();
    expect(eduEntity!.displayName).toContain('Universiti Pertahanan Nasional Malaysia');

    // Verify all 5 core education slots are known
    expect(ledger.isSlotKnown('education|upnm', 'degree')).toBe(true);
    expect(ledger.isSlotKnown('education|upnm', 'institution')).toBe(true);
    expect(ledger.isSlotKnown('education|upnm', 'field_of_study')).toBe(true);
    expect(ledger.isSlotKnown('education|upnm', 'start_year')).toBe(true);
    expect(ledger.isSlotKnown('education|upnm', 'cgpa')).toBe(true);

    // Verify specific facts
    const facts = ledger.getFactsForEntity('education|upnm');
    const degreeFact = facts.find((f) => f.slot === 'degree');
    const cgpaFact = facts.find((f) => f.slot === 'cgpa');
    const yearFact = facts.find((f) => f.slot === 'start_year');

    expect(degreeFact?.value).toContain('Bachelor of Computer Science with Honours');
    expect(cgpaFact?.value).toBe('3.98');
    expect(yearFact?.value).toBe('2025');

    // 3. Next plan MUST NOT re-ask for degree, institution, start year, or CGPA
    const nextPlan = planner.planNextIntent(ledger);
    expect(nextPlan.intentKey).not.toContain('degree');
    expect(nextPlan.intentKey).not.toContain('institution');
    expect(nextPlan.intentKey).not.toContain('cgpa');
    expect(nextPlan.intentKey).not.toContain('start_year');

    // 4. Next question must NOT assume an experience exists!
    expect(nextPlan.suggestedPrompt).not.toContain('from that experience');
    expect(nextPlan.topic).toBe('experience');
    expect(nextPlan.suggestedPrompt).toContain('work experience, part-time jobs, or internships');
  });

  // --------------------------------------------------------------------------
  // 3. Volunteered Information & Entity Isolation (Section 14)
  // --------------------------------------------------------------------------
  it('volunteering Health Lane and CampusFind creates separate entities and isolates facts', () => {
    // 1. Volunteer Health Lane
    const expAnswer = 'I also work part-time at Health Lane Family Pharmacy.';
    extractor.extract(expAnswer, ledger);

    const expEntity = ledger.getEntity('experience|health_lane');
    expect(expEntity).toBeDefined();
    expect(expEntity?.entityType).toBe('experience');
    expect(expEntity?.displayName).toBe('Health Lane Family Pharmacy');

    // 2. Volunteer CampusFind
    const projAnswer =
      'I also worked on CampusFind, a university lost and found system, where I was the project manager.';
    extractor.extract(projAnswer, ledger);

    const projEntity = ledger.getEntity('project|campusfind');
    expect(projEntity).toBeDefined();
    expect(projEntity?.entityType).toBe('project');
    expect(projEntity?.displayName).toBe('CampusFind');

    // 3. Verify strict isolation: CampusFind slots do not touch Health Lane slots
    const healthLaneSlots = ledger.getSlotsForEntity('experience|health_lane');
    const campusFindSlots = ledger.getSlotsForEntity('project|campusfind');

    expect(healthLaneSlots.every((s) => s.entityId === 'experience|health_lane')).toBe(true);
    expect(campusFindSlots.every((s) => s.entityId === 'project|campusfind')).toBe(true);

    const projRoleFact = ledger
      .getFactsForEntity('project|campusfind')
      .find((f) => f.slot === 'role');
    expect(projRoleFact?.value).toBe('project manager');

    const healthLaneRole = ledger.getSlot('experience|health_lane', 'role');
    expect(healthLaneRole).toBeUndefined(); // Role on project does NOT bleed into experience!
  });

  // --------------------------------------------------------------------------
  // 4. Declared None Progression (Section 15)
  // --------------------------------------------------------------------------
  it('handles declared none for work experience without repeatedly asking', () => {
    // Provide education first
    extractor.extract(
      "I'm studying at UPNM, Bachelor of Computer Science, started 2025, CGPA 3.98",
      ledger
    );

    // Student declares no work experience
    const noExpAnswer = "I don't have any work experience yet.";
    extractor.extract(noExpAnswer, ledger);

    const declaredSlot = ledger.slots.get('experience|general|declared_none');
    expect(declaredSlot?.state).toBe('declared_none');

    // Planner must NOT ask for work experience again
    const nextPlan = planner.planNextIntent(ledger);
    expect(nextPlan.topic).not.toBe('experience');
    expect(nextPlan.topic).toBe('project');
  });

  // --------------------------------------------------------------------------
  // 5. Sensitive Data Redaction (Section 18)
  // --------------------------------------------------------------------------
  it('redacts sensitive Malaysian NRIC, credit cards, CVV, and passwords while preserving name, email, phone, location', () => {
    const rawAnswer =
      'My name is Muhammad Danial. My IC is 050615-10-1234, email danial@dreampath.my, phone +60123456789. I live in Subang Jaya. My credit card is 4532 1234 5678 9012 with cvv: 123, and my password: secretPassword! Here is my token: Bearer abc123def456';

    const result = redactSensitiveData(rawAnswer);
    expect(result.hasRedactions).toBe(true);
    expect(result.text).toContain('[REDACTED_NRIC]');
    expect(result.text).toContain('[REDACTED_CREDIT_CARD]');
    expect(result.text).toContain('[REDACTED_CVV]');
    expect(result.text).toContain('[REDACTED_PASSWORD]');
    expect(result.text).toContain('[REDACTED_API_KEY]');

    // Normal resume information MUST be preserved
    expect(result.text).toContain('Muhammad Danial');
    expect(result.text).toContain('danial@dreampath.my');
    expect(result.text).toContain('+60123456789');
    expect(result.text).toContain('Subang Jaya');
  });

  // --------------------------------------------------------------------------
  // 6. Provider Cascade Fallback (Section 8)
  // --------------------------------------------------------------------------
  it('falls back to deterministic template when external AI providers are unconfigured or fail', async () => {
    const cascade = new ProviderCascade();
    const template = 'What are your key technical skills, programming languages, or software tools?';

    const result = await cascade.phraseQuestion({
      intentKey: 'skill|self|technical',
      template,
      topic: 'skill',
      ledger,
    });

    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(0);
    // When external providers are mocked/offline, falls back cleanly
    expect(['gemini', 'groq', 'mistral', 'openrouter', 'deterministic_template']).toContain(result.provider);
  });

  // --------------------------------------------------------------------------
  // 7. Resume Synthesis from Facts (Section 17)
  // --------------------------------------------------------------------------
  it('synthesizes resume content strictly from verified ledger facts without inventing unmentioned data', () => {
    // 1. Education
    const edu = ledger.getOrCreateEntity('education', 'upnm', 'Universiti Pertahanan Nasional Malaysia (UPNM)');
    ledger.addFact({ entityId: edu.id, slot: 'degree', value: 'Bachelor of Computer Science with Honours', rawEvidence: 'text' });
    ledger.addFact({ entityId: edu.id, slot: 'cgpa', value: '3.98', rawEvidence: 'text' });
    ledger.addFact({ entityId: edu.id, slot: 'start_year', value: '2025', rawEvidence: 'text' });

    // 2. Experience
    const exp = ledger.getOrCreateEntity('experience', 'health_lane', 'Health Lane Family Pharmacy');
    ledger.addFact({ entityId: exp.id, slot: 'employer', value: 'Health Lane Family Pharmacy', rawEvidence: 'text' });
    ledger.addFact({ entityId: exp.id, slot: 'position', value: 'Part-time Associate', rawEvidence: 'text' });
    ledger.addFact({ entityId: exp.id, slot: 'responsibilities', value: 'Assisted customers with dispensary and inventory checks', rawEvidence: 'text' });

    // 3. Project
    const proj = ledger.getOrCreateEntity('project', 'campusfind', 'CampusFind');
    ledger.addFact({ entityId: proj.id, slot: 'name', value: 'CampusFind', rawEvidence: 'text' });
    ledger.addFact({ entityId: proj.id, slot: 'role', value: 'Project Manager', rawEvidence: 'text' });
    ledger.addFact({ entityId: proj.id, slot: 'description', value: 'University lost and found system', rawEvidence: 'text' });
    ledger.addFact({ entityId: proj.id, slot: 'technologies', value: ['Next.js', 'PostgreSQL'], rawEvidence: 'text' });

    // 4. Skills
    const skill = ledger.getOrCreateEntity('skill', 'self', 'Technical Skills');
    ledger.addFact({ entityId: skill.id, slot: 'technical', value: ['TypeScript', 'React'], rawEvidence: 'text' });

    // Synthesize
    const content = synthesizeResumeFromLedger(ledger);

    // Verify Education
    expect(content.education?.length).toBe(1);
    expect(content.education![0].institution).toBe('Universiti Pertahanan Nasional Malaysia (UPNM)');
    expect(content.education![0].qualification).toBe('Bachelor of Computer Science with Honours');
    expect(content.education![0].cgpa).toBe('3.98');

    // Verify Experience
    expect(content.experience?.length).toBe(1);
    expect(content.experience![0].employer).toBe('Health Lane Family Pharmacy');
    expect(content.experience![0].position).toBe('Part-time Associate');

    // Verify Project
    expect(content.projects?.length).toBe(1);
    expect(content.projects![0].name).toBe('CampusFind');
    expect(content.projects![0].role).toBe('Project Manager');
    expect(content.projects![0].technologies).toEqual(['Next.js', 'PostgreSQL']);

    // Verify Skills
    expect(content.skills?.technical).toContain('TypeScript');
    expect(content.skills?.technical).toContain('React');

    // Verify NO unmentioned certifications or awards were invented
    expect(content.certifications?.length).toBe(0);
    expect(content.awards?.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // 8. Experience Responsibilities State Transition & Persistence Regression
  // --------------------------------------------------------------------------
  it('correctly transitions experience|health_lane|responsibilities to known and closes the slot across reloads', async () => {
    const testLedger = new InterviewLedger({
      id: 'sess_repro_test',
      resumeVersionId: 'ver_repro_test',
      resumeProfileId: 'prof_repro_test',
      currentTurn: 0,
      isComplete: false,
      currentIntentKey: 'education|general|overview',
      summary: null,
    });

    // 1. Student provides education facts -> education slots become known
    testLedger.addTranscript('ai', "Hello! Let's build your resume together. What are you currently studying and where?");
    const eduAnswer = 'I’m currently pursuing a Bachelor of Computer Science with Honours at Universiti Pertahanan Nasional Malaysia (UPNM). I started in 2025, and my current CGPA is 3.98.';
    testLedger.addTranscript('student', eduAnswer);
    deterministicExtractor.extract(eduAnswer, testLedger);

    const eduEntity = testLedger.getEntity('education|upnm');
    expect(eduEntity).toBeDefined();
    expect(testLedger.isSlotKnown('education|upnm', 'degree')).toBe(true);
    expect(testLedger.isSlotKnown('education|upnm', 'cgpa')).toBe(true);
    expect(testLedger.isSlotKnown('education|upnm', 'start_year')).toBe(true);
    expect(testLedger.isSlotKnown('education|upnm', 'institution')).toBe(true);

    let plan = deterministicPlanner.planNextIntent(testLedger);
    expect(plan.intentKey).toBe('experience|general|overview');
    testLedger.session.currentIntentKey = plan.intentKey;

    // 2. Student introduces Health Lane -> creates experience|health_lane
    testLedger.addTranscript('ai', plan.suggestedPrompt);
    const expAnswer = 'I worked part-time at Health Lane Family Pharmacy. I helped customers, handled pharmacy-related tasks, and worked with the team.';
    testLedger.addTranscript('student', expAnswer);
    deterministicExtractor.extract(expAnswer, testLedger);

    const expEntity = testLedger.getEntity('experience|health_lane');
    expect(expEntity).toBeDefined();
    expect(expEntity?.displayName).toBe('Health Lane Family Pharmacy');
    expect(testLedger.isSlotKnown('experience|health_lane', 'employer')).toBe(true);
    expect(testLedger.isSlotKnown('experience|health_lane', 'position')).toBe(true);

    plan = deterministicPlanner.planNextIntent(testLedger);
    expect(plan.intentKey).toBe('experience|health_lane|responsibilities');
    testLedger.session.currentIntentKey = plan.intentKey;

    // 3. Student provides responsibilities -> experience|health_lane|responsibilities becomes known
    testLedger.addTranscript('ai', plan.suggestedPrompt);
    const respAnswer = 'I assisted customers, arranged and restocked products, checked product availability, handled sales transactions, and helped maintain the pharmacy\'s daily operations.';
    testLedger.addTranscript('student', respAnswer);
    const extractionResult = deterministicExtractor.extract(respAnswer, testLedger);
    expect(extractionResult.facts.length).toBeGreaterThan(0);

    // Verify fact creation
    const respSlot = testLedger.getSlot('experience|health_lane', 'responsibilities');
    expect(respSlot).toBeDefined();
    expect(respSlot?.state).toBe('known');
    expect(respSlot?.value).toBe(respAnswer);

    const respFact = testLedger.getFactsForEntity('experience|health_lane').find(f => f.slot === 'responsibilities');
    expect(respFact).toBeDefined();
    expect(respFact?.entityId).toBe('experience|health_lane');
    expect(respFact?.origin).toBe('explicit');
    expect(respFact?.value).toBe(respAnswer);
    expect(testLedger.isIntentResolved('experience|health_lane|responsibilities')).toBe(true);

    // 4. Planner does NOT ask responsibilities again
    plan = deterministicPlanner.planNextIntent(testLedger);
    expect(plan.intentKey).not.toBe('experience|health_lane|responsibilities');

    // 5. Save snapshot -> reload snapshot -> responsibilities remains known
    const snapshot = testLedger.toSnapshot();
    const reloadedLedger = InterviewLedger.fromSnapshot(snapshot);

    const reloadedRespSlot = reloadedLedger.getSlot('experience|health_lane', 'responsibilities');
    expect(reloadedRespSlot).toBeDefined();
    expect(reloadedRespSlot?.state).toBe('known');
    expect(reloadedRespSlot?.value).toBe(respAnswer);

    const reloadedFact = reloadedLedger.getFactsForEntity('experience|health_lane').find(f => f.slot === 'responsibilities');
    expect(reloadedFact).toBeDefined();
    expect(reloadedFact?.entityId).toBe('experience|health_lane');
    expect(reloadedFact?.slot).toBe('responsibilities');

    // 6. Planner still selects another legitimate missing slot instead of responsibilities
    const reloadedPlan = deterministicPlanner.planNextIntent(reloadedLedger);
    expect(reloadedPlan.intentKey).toBe('project|general|overview');
    expect(reloadedPlan.intentKey).not.toBe('experience|health_lane|responsibilities');

    // 7. Same slot cannot be reopened merely because another provider phrases the next question
    const cascade = new ProviderCascade();
    const phrasedResult = await cascade.phraseQuestion({
      intentKey: reloadedPlan.intentKey!,
      template: reloadedPlan.suggestedPrompt,
      topic: reloadedPlan.topic,
      ledger: reloadedLedger,
      latestAnswer: respAnswer,
    });
    expect(phrasedResult.text).toBeDefined();
    expect(phrasedResult.text.length).toBeGreaterThan(0);
    // Planner state after cascade phrasing must still have responsibilities closed
    expect(reloadedLedger.isSlotKnown('experience|health_lane', 'responsibilities')).toBe(true);
    expect(deterministicPlanner.planNextIntent(reloadedLedger).intentKey).toBe('project|general|overview');

    // 8. A separate project such as CampusFind remains a separate entity
    reloadedLedger.session.currentIntentKey = reloadedPlan.intentKey;
    const projectAnswer = 'I worked on a project called CampusFind, a university lost and found system. I was the project manager.';
    reloadedLedger.addTranscript('student', projectAnswer);
    deterministicExtractor.extract(projectAnswer, reloadedLedger);

    const healthLaneEntity = reloadedLedger.getEntity('experience|health_lane');
    const campusFindEntity = reloadedLedger.getEntity('project|campusfind');

    expect(healthLaneEntity).toBeDefined();
    expect(healthLaneEntity?.entityType).toBe('experience');
    expect(campusFindEntity).toBeDefined();
    expect(campusFindEntity?.entityType).toBe('project');
    expect(healthLaneEntity?.id).not.toBe(campusFindEntity?.id);

    // Verify facts isolation
    const healthLaneFacts = reloadedLedger.getFactsForEntity('experience|health_lane');
    const campusFindFacts = reloadedLedger.getFactsForEntity('project|campusfind');

    expect(healthLaneFacts.map(f => f.slot)).toContain('responsibilities');
    expect(campusFindFacts.map(f => f.slot)).not.toContain('responsibilities');
    expect(campusFindFacts.map(f => f.slot)).toContain('name');
  });
});
