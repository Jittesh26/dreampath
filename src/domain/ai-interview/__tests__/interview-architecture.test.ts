import { describe, it, expect, beforeEach } from 'vitest';
import {
  InterviewLedger,
} from '../ledger';
import { DeterministicPlanner, deterministicPlanner } from '../planner';
import { DeterministicExtractor, deterministicExtractor } from '../extractor';
import { ProviderCascade } from '../provider-cascade';
import { redactSensitiveData } from '../redactor';
import { saveSessionSnapshot, loadSessionSnapshot, deleteSession } from '../persistence';
import { synthesizeResumeFromLedger } from '../synthesis';
import { resumeContentSchema } from '../../resume';

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
    expect(loaded).not.toBeNull();
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
    ledger.addFact({ entityId: edu.id, slot: 'cgpa', value: 3.98 as any, rawEvidence: 'text' });
    ledger.addFact({ entityId: edu.id, slot: 'start_year', value: 2025 as any, rawEvidence: 'text' });

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

    // Verify Education & numeric start_year normalization
    expect(content.education?.length).toBe(1);
    expect(content.education![0].institution).toBe('Universiti Pertahanan Nasional Malaysia (UPNM)');
    expect(content.education![0].qualification).toBe('Bachelor of Computer Science with Honours');
    expect(content.education![0].cgpa).toBe('3.98');
    expect(typeof content.education![0].startDate).toBe('string');
    expect(content.education![0].startDate).toBe('2025');

    // Strict schema parse should succeed without ZodError
    const validated = resumeContentSchema.parse(content);
    expect(validated.education[0].startDate).toBe('2025');

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
    const expAnswer = 'I worked part-time as a Pharmacy Assistant at Health Lane Family Pharmacy. I helped customers, handled pharmacy-related tasks, and worked with the team.';
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

  // --------------------------------------------------------------------------
  // 14. Full End-to-End Action/DB Persistence Regression Test
  // --------------------------------------------------------------------------
  it('exercises full multi-turn DB persistence and ensures responsibilities slot remains closed after reload', async () => {
    const testResumeVersionId = crypto.randomUUID();
    const testResumeProfileId = crypto.randomUUID();

    // 1. Create fresh interview session in DB
    const sLedger = new InterviewLedger({
      id: `session_${crypto.randomUUID()}`,
      resumeVersionId: testResumeVersionId,
      resumeProfileId: testResumeProfileId,
      currentTurn: 0,
      isComplete: false,
      currentIntentKey: 'education|general|overview',
      summary: null,
    });
    sLedger.addTranscript('ai', "Hello! Let's build your resume together. What are you currently studying and where?");
    sLedger.registerIntent('education|general|overview', 'active');
    await saveSessionSnapshot(sLedger);

    // 2. Submit education answer
    let loaded = (await loadSessionSnapshot(testResumeVersionId))!;
    expect(loaded).toBeDefined();
    const eduAnswer = "I’m currently pursuing a Bachelor of Computer Science with Honours at Universiti Pertahanan Nasional Malaysia (UPNM). I started in 2025, and my current CGPA is 3.98.";
    loaded.addTranscript('student', eduAnswer);
    deterministicExtractor.extract(eduAnswer, loaded);
    let plan = deterministicPlanner.planNextIntent(loaded);
    expect(plan.intentKey).toBe('experience|general|overview');
    loaded.session.currentIntentKey = plan.intentKey;
    if (plan.intentKey) loaded.registerIntent(plan.intentKey, 'active');
    loaded.addTranscript('ai', plan.suggestedPrompt);
    await saveSessionSnapshot(loaded);

    // 3. Submit Health Lane experience answer
    loaded = (await loadSessionSnapshot(testResumeVersionId))!;
    expect(loaded.currentIntentKey).toBe('experience|general|overview');
    const expAnswer = "I worked part-time at Health Lane Family Pharmacy. I helped customers, handled pharmacy-related tasks, and worked with the team.";
    loaded.addTranscript('student', expAnswer);
    deterministicExtractor.extract(expAnswer, loaded);

    // 4. Receive responsibilities question
    plan = deterministicPlanner.planNextIntent(loaded);
    expect(plan.intentKey).toBe('experience|health_lane|responsibilities');
    expect(plan.suggestedPrompt).toContain('Health Lane Family Pharmacy');
    loaded.session.currentIntentKey = plan.intentKey;
    if (plan.intentKey) loaded.registerIntent(plan.intentKey, 'active');
    loaded.addTranscript('ai', plan.suggestedPrompt);
    await saveSessionSnapshot(loaded);

    // 5. Submit the responsibilities answer
    loaded = (await loadSessionSnapshot(testResumeVersionId))!;
    expect(loaded.currentIntentKey).toBe('experience|health_lane|responsibilities');
    const respAnswer = "I assisted customers, arranged and restocked products, checked product availability, handled sales transactions, and helped maintain the pharmacy's daily operations.";
    loaded.addTranscript('student', respAnswer);
    const extResult = deterministicExtractor.extract(respAnswer, loaded);
    expect(extResult.facts.length).toBeGreaterThan(0);

    plan = deterministicPlanner.planNextIntent(loaded);
    loaded.session.currentIntentKey = plan.intentKey;
    if (plan.intentKey) loaded.registerIntent(plan.intentKey, 'active');
    loaded.addTranscript('ai', plan.suggestedPrompt);
    await saveSessionSnapshot(loaded);

    // 6. Inspect the resulting persisted session from database
    const finalLoaded = (await loadSessionSnapshot(testResumeVersionId))!;
    expect(finalLoaded).toBeDefined();

    // 8. Assert that responsibilities is known/resolved
    expect(finalLoaded.isSlotKnown('experience|health_lane', 'responsibilities')).toBe(true);
    const respFact = finalLoaded.getFactsForEntity('experience|health_lane').find(f => f.slot === 'responsibilities');
    expect(respFact).toBeDefined();
    expect(respFact?.origin).toBe('explicit');
    expect(respFact?.value).toBe(respAnswer);
    expect(finalLoaded.isIntentResolved('experience|health_lane|responsibilities')).toBe(true);

    // 7 & 9. Generate the next intent and assert that it is different
    const nextPlan = deterministicPlanner.planNextIntent(finalLoaded);
    expect(nextPlan.intentKey).toBe('project|general|overview');
    expect(nextPlan.intentKey).not.toBe('experience|health_lane|responsibilities');

    // Clean up
    await deleteSession(testResumeVersionId);
  }, 20_000);

  // --------------------------------------------------------------------------
  // 15. The Seven-Answer Resume AI Regression Scenario (All 23 Requirements)
  // --------------------------------------------------------------------------
  it('faithfully synthesizes complete resume from 7-turn interview meeting all 23 verification points', () => {
    const interviewLedger = new InterviewLedger({
      id: `session_7turn_${crypto.randomUUID()}`,
      resumeVersionId: crypto.randomUUID(),
      resumeProfileId: crypto.randomUUID(),
      currentTurn: 0,
      isComplete: false,
      currentIntentKey: 'education|general|overview',
      summary: null,
    });

    // Turn 1: Academic / Education
    const t1Prompt = "Hello! Let's build your resume together. What are you currently studying and where?";
    interviewLedger.addTranscript('ai', t1Prompt);
    const t1Answer = "I'm currently pursuing a Bachelor of Computer Science with Honours at Universiti Pertahanan Nasional Malaysia (UPNM). I started in 2025, and my current CGPA is 3.98.";
    interviewLedger.addTranscript('student', t1Answer);
    deterministicExtractor.extract(t1Answer, interviewLedger);

    let plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.topic).toBe('experience');
    interviewLedger.session.currentIntentKey = plan.intentKey;

    // Turn 2: Work Experience Introduction
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t2Answer = "Part-time work at Health Lane Family Pharmacy";
    interviewLedger.addTranscript('student', t2Answer);
    deterministicExtractor.extract(t2Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.intentKey).toBe('experience|health_lane|responsibilities');
    interviewLedger.session.currentIntentKey = plan.intentKey;

    // Turn 3: Work Experience Responsibilities (Multi-sentence)
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t3Answer = "My main responsibilities were assisting customers, explaining products, handling sales/payments, restocking, organizing products, checking stock, and maintaining pharmacy area. I also practiced teamwork and supported daily operations.";
    interviewLedger.addTranscript('student', t3Answer);
    deterministicExtractor.extract(t3Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.topic).toBe('project');
    interviewLedger.session.currentIntentKey = plan.intentKey;

    // Turn 4: Project Introduction & Role
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t4Answer = "I worked on CampusFind. I served as Project Manager.";
    interviewLedger.addTranscript('student', t4Answer);
    deterministicExtractor.extract(t4Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.intentKey).toBe('project|campusfind|description');
    interviewLedger.session.currentIntentKey = plan.intentKey;

    // Turn 5: Project Description & Contributions
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t5Answer = "AI-powered smart lost-and-found system for UPNM. I contributed to system design, requirements, website development, database, AI-assisted item matching, and project coordination.";
    interviewLedger.addTranscript('student', t5Answer);
    deterministicExtractor.extract(t5Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.intentKey).toBe('project|campusfind|technologies');
    interviewLedger.session.currentIntentKey = plan.intentKey;

    // Turn 6: Technologies (All 8 technologies)
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t6Answer = "HTML, CSS, JavaScript, PHP, MySQL, XAMPP, Apache, VS Code";
    interviewLedger.addTranscript('student', t6Answer);
    deterministicExtractor.extract(t6Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.topic).toBe('leadership');
    interviewLedger.session.currentIntentKey = plan.intentKey;

    // Turn 7: Leadership
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t7Answer = "I have taken on leadership and committee responsibilities at university, serving on student event committees and coordinating group activities.";
    interviewLedger.addTranscript('student', t7Answer);
    deterministicExtractor.extract(t7Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.isComplete).toBe(false);

    // Turn 8: Resume Completion - Student Full Name
    expect(plan.intentKey).toBe('personal|self|fullName');
    expect(plan.suggestedPrompt).toBe('What is your full name as you would like it to appear on your resume?');
    interviewLedger.session.currentIntentKey = plan.intentKey;
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t8Answer = "Test Student";
    interviewLedger.addTranscript('student', t8Answer);
    deterministicExtractor.extract(t8Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.isComplete).toBe(false);

    // Turn 9: Resume Completion - Official Job Title for Health Lane
    expect(plan.intentKey).toBe('experience|health_lane|position');
    expect(plan.suggestedPrompt).toBe('What was your official job title at Health Lane Family Pharmacy?');
    interviewLedger.session.currentIntentKey = plan.intentKey;
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t9Answer = "Pharmacy Assistant";
    interviewLedger.addTranscript('student', t9Answer);
    deterministicExtractor.extract(t9Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.isComplete).toBe(false);

    // Turn 10: Resume Completion - Contact Information & Professional Links
    expect(plan.intentKey).toBe('personal|self|contact_links');
    expect(plan.suggestedPrompt).toContain('phone number');
    interviewLedger.session.currentIntentKey = plan.intentKey;
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t10Answer = "+60123456789, student@example.com, https://linkedin.com/in/teststudent, https://github.com/teststudent";
    interviewLedger.addTranscript('student', t10Answer);
    deterministicExtractor.extract(t10Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.isComplete).toBe(false);

    // Turn 11: Resume Completion - Optional Profile Photo
    expect(plan.intentKey).toBe('personal|self|photo');
    expect(plan.suggestedPrompt).toContain('photo');
    interviewLedger.session.currentIntentKey = plan.intentKey;
    interviewLedger.addTranscript('ai', plan.suggestedPrompt);
    const t11Answer = "skip";
    interviewLedger.addTranscript('student', t11Answer);
    deterministicExtractor.extract(t11Answer, interviewLedger);

    plan = deterministicPlanner.planNextIntent(interviewLedger);
    expect(plan.isComplete).toBe(true);

    // Synthesize Resume
    const content = synthesizeResumeFromLedger(interviewLedger);

    // ------------------------------------------------------------------------
    // VERIFICATION OF ALL 23 REQUIREMENTS:
    // ------------------------------------------------------------------------
    // 1. 2025 numeric value still becomes valid string "2025"
    expect(typeof content.education![0].startDate).toBe('string');
    expect(content.education![0].startDate).toBe('2025');

    // 2. UPNM is preserved
    expect(content.education![0].institution).toContain('UPNM');

    // 3. degree is preserved
    expect(content.education![0].qualification).toContain('Bachelor of Computer Science with Honours');

    // 4. CGPA 3.98 is preserved
    expect(content.education![0].cgpa).toBe('3.98');

    // 5. Health Lane exists
    expect(content.experience?.length).toBeGreaterThan(0);
    const healthLane = content.experience!.find(e => e.employer.includes('Health Lane'));
    expect(healthLane).toBeDefined();

    // 6. Health Lane responsibilities survive multiple sentences
    expect(healthLane!.description).toContain('assisting customers');
    expect(healthLane!.description).toContain('explaining products');
    expect(healthLane!.description).toContain('restocking');
    expect(healthLane!.description).toContain('teamwork');
    expect(healthLane!.description).toContain('daily operations');

    // 7. CampusFind exists
    expect(content.projects?.length).toBeGreaterThan(0);
    const campusFind = content.projects!.find(p => p.name === 'CampusFind');
    expect(campusFind).toBeDefined();

    // 8. Project Manager is preserved
    expect(campusFind!.role).toBe('Project Manager');

    // 9. CampusFind description survives
    expect(campusFind!.description).toContain('lost-and-found system for UPNM');

    // 10. project contributions survive
    expect(campusFind!.achievements).toBeDefined();
    expect(campusFind!.achievements).toContain('system design');
    expect(campusFind!.achievements).toContain('requirements');
    expect(campusFind!.achievements).toContain('database');
    expect(campusFind!.achievements).toContain('project coordination');

    // 11. HTML survives
    expect(campusFind!.technologies).toContain('HTML');
    expect(content.skills?.technical).toContain('HTML');

    // 12. CSS survives
    expect(campusFind!.technologies).toContain('CSS');
    expect(content.skills?.technical).toContain('CSS');

    // 13. JavaScript survives
    expect(campusFind!.technologies).toContain('JavaScript');
    expect(content.skills?.technical).toContain('JavaScript');

    // 14. PHP survives
    expect(campusFind!.technologies).toContain('PHP');
    expect(content.skills?.technical).toContain('PHP');

    // 15. MySQL survives
    expect(campusFind!.technologies).toContain('MySQL');
    expect(content.skills?.technical).toContain('MySQL');

    // 16. XAMPP survives
    expect(campusFind!.technologies).toContain('XAMPP');
    expect(content.skills?.technical).toContain('XAMPP');

    // 17. Apache survives
    expect(campusFind!.technologies).toContain('Apache');
    expect(content.skills?.technical).toContain('Apache');

    // 18. VS Code survives
    expect(campusFind!.technologies).toContain('VS Code');
    expect(content.skills?.technical).toContain('VS Code');

    // 19. AI-assisted matching survives as a project contribution/feature
    const hasAiAssisted = campusFind!.achievements?.some(a => a.toLowerCase().includes('ai-assisted'));
    expect(hasAiAssisted).toBe(true);

    // 20. leadership does not appear under education
    expect(content.education?.length).toBe(1);
    expect(content.education![0].institution).not.toContain('leadership');
    expect(content.education![0].qualification).not.toContain('leadership');
    expect(content.education![0].qualification).not.toBe('Bachelor Degree');
    expect(content.leadership?.length).toBeGreaterThan(0);
    expect(content.leadership![0].description).toContain('leadership and committee responsibilities');

    // 21. no "Student Scholar" is persisted
    expect(JSON.stringify(content)).not.toContain('Student Scholar');

    // 22. no "Your Full Name" is persisted
    expect(JSON.stringify(content)).not.toContain('Your Full Name');

    // 23. array facts do not overwrite one another
    expect(campusFind!.technologies!.length).toBeGreaterThanOrEqual(8);
    expect(content.skills!.technical!.length).toBeGreaterThanOrEqual(8);

    // 24. Resume Completion Phase verifications
    expect(content.personal?.fullName).toBe('Test Student');
    expect(content.personal?.email).toBe('student@example.com');
    expect(content.personal?.phone).toBe('+60123456789');
    expect(content.personal?.linkedin).toBe('https://linkedin.com/in/teststudent');
    expect(content.personal?.github).toBe('https://github.com/teststudent');
    expect(healthLane!.position).toBe('Pharmacy Assistant');
    expect(JSON.stringify(content)).not.toContain('Part-time Associate');

    // Strict schema parse MUST pass without any error
    const validated = resumeContentSchema.parse(content);
    expect(validated).toBeDefined();
    expect(validated.education[0].cgpa).toBe('3.98');
    expect(validated.education[0].startDate).toBe('2025');
  });

  // --------------------------------------------------------------------------
  // 16. Resume Completion Phase Unit Verification
  // --------------------------------------------------------------------------
  describe('Resume Completion Phase', () => {
    it('does NOT re-ask full name if verified user profile metadata exists in ledger', () => {
      const ledger = new InterviewLedger({
        id: `session_completion_${crypto.randomUUID()}`,
        resumeVersionId: crypto.randomUUID(),
        resumeProfileId: crypto.randomUUID(),
        currentTurn: 0,
        isComplete: false,
        currentIntentKey: 'education|general|overview',
        summary: null,
      });

      // Pre-populate verified name from user profile
      const pers = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      ledger.addFact({
        entityId: pers.id,
        slot: 'fullName',
        value: 'Ahmad Daniel',
        rawEvidence: 'Verified profile metadata',
        origin: 'system',
      });
      ledger.resolveIntent('personal|self|fullName');

      // Complete education, skills, leadership
      const edu = ledger.getOrCreateEntity('education', 'um', 'Universiti Malaya');
      ledger.setSlot(edu.id, 'degree', 'known', 'Bachelor of Computer Science');
      ledger.setSlot(edu.id, 'institution', 'known', 'Universiti Malaya');
      ledger.setSlot(edu.id, 'field_of_study', 'known', 'Computer Science');
      ledger.setSlot(edu.id, 'start_year', 'known', '2024');
      ledger.setSlot(edu.id, 'cgpa', 'known', '3.85');

      ledger.setSlot('experience|general', 'declared_none', 'declared_none');
      ledger.resolveIntent('project|general|overview');
      ledger.setSlot('skill|self', 'technical', 'known', ['Python', 'SQL']);
      ledger.resolveIntent('leadership|self|overview');

      const plan = deterministicPlanner.planNextIntent(ledger);
      // Name is already known, so it jumps straight to contact links!
      expect(plan.intentKey).toBe('personal|self|contact_links');
      expect(plan.intentKey).not.toBe('personal|self|fullName');
    });

    it('asks for official job title instead of inventing "Part-time Associate"', () => {
      const ledger = new InterviewLedger({
        id: `session_jobtitle_${crypto.randomUUID()}`,
        resumeVersionId: crypto.randomUUID(),
        resumeProfileId: crypto.randomUUID(),
        currentTurn: 0,
        isComplete: false,
        currentIntentKey: 'experience|health_lane|responsibilities',
        summary: null,
      });

      // Pre-populate verified name
      const pers = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      ledger.setSlot(pers.id, 'fullName', 'known', 'Nurul Izzah');

      // Add education
      const edu = ledger.getOrCreateEntity('education', 'ukm', 'UKM');
      ledger.setSlot(edu.id, 'degree', 'known', 'Diploma in Pharmacy');
      ledger.setSlot(edu.id, 'institution', 'known', 'UKM');
      ledger.setSlot(edu.id, 'field_of_study', 'known', 'Pharmacy');
      ledger.setSlot(edu.id, 'start_year', 'known', '2023');
      ledger.setSlot(edu.id, 'cgpa', 'known', '3.70');

      // Add experience with employer and responsibilities, but NO position
      const exp = ledger.getOrCreateEntity('experience', 'watson', 'Watsons Malaysia');
      ledger.setSlot(exp.id, 'employer', 'known', 'Watsons Malaysia');
      ledger.setSlot(exp.id, 'responsibilities', 'known', 'Customer service and cashiering');

      ledger.resolveIntent('project|general|overview');
      ledger.setSlot('skill|self', 'technical', 'known', ['POS Systems', 'Inventory']);
      ledger.resolveIntent('leadership|self|overview');

      const plan = deterministicPlanner.planNextIntent(ledger);
      expect(plan.intentKey).toBe('experience|watson|position');
      expect(plan.suggestedPrompt).toBe('What was your official job title at Watsons Malaysia?');

      // Student answers with their actual official title
      ledger.session.currentIntentKey = plan.intentKey;
      ledger.addTranscript('student', 'I was a Retail Cashier');
      deterministicExtractor.extract('I was a Retail Cashier', ledger);

      const posSlot = ledger.getSlot(exp.id, 'position');
      expect(posSlot?.state).toBe('known');
      expect(posSlot?.value).toBe('Retail Cashier');
    });

    it('handles skipping optional profile photo cleanly without breaking schema', () => {
      const ledger = new InterviewLedger({
        id: `session_photo_${crypto.randomUUID()}`,
        resumeVersionId: crypto.randomUUID(),
        resumeProfileId: crypto.randomUUID(),
        currentTurn: 0,
        isComplete: false,
        currentIntentKey: 'personal|self|photo',
        summary: null,
      });

      const pers = ledger.getOrCreateEntity('personal', 'self', 'Personal Information');
      ledger.setSlot(pers.id, 'fullName', 'known', 'Test User');

      // Complete photo question with skip
      ledger.session.currentIntentKey = 'personal|self|photo';
      ledger.addTranscript('student', 'skip');
      deterministicExtractor.extract('skip', ledger);

      const photoSlot = ledger.getSlot(pers.id, 'photoUrl');
      expect(photoSlot?.state).toBe('skipped');

      const content = synthesizeResumeFromLedger(ledger);
      // photoUrl should either be omitted or empty string, passing Zod validation
      expect(content.personal?.photoUrl).toBeUndefined();
    });
  });
});
