import {
  EntityType,
  SlotState,
  FactOrigin,
  IntentStatus,
  InterviewEntity,
  InterviewSlot,
  InterviewFact,
  InterviewIntent,
  InterviewTranscript,
  InterviewSessionData,
  InterviewLedgerSnapshot,
  StructuredResumeProfile,
} from './types';
import { ChatMessage } from '../ai-interview';

export function normalizeIdentifier(name: string): string {
  if (!name) return 'unnamed';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'item';
}

export function makeEntityId(entityType: EntityType, identifier: string): string {
  const norm = normalizeIdentifier(identifier);
  return `${entityType}|${norm}`;
}

export function makeSlotId(entityId: string, slotName: string): string {
  return `${entityId}|${slotName.toLowerCase().trim()}`;
}

export function makeIntentKey(entityType: EntityType, entityKey: string, slotName: string): string {
  const norm = normalizeIdentifier(entityKey);
  return `${entityType}|${norm}|${slotName.toLowerCase().trim()}`;
}

export class InterviewLedger {
  public session: InterviewSessionData;
  public transcripts: InterviewTranscript[] = [];
  public entities: Map<string, InterviewEntity> = new Map();
  public slots: Map<string, InterviewSlot> = new Map();
  public facts: Map<string, InterviewFact> = new Map();
  public intents: Map<string, InterviewIntent> = new Map();

  constructor(session: InterviewSessionData) {
    this.session = { ...session };
  }

  get sessionId(): string {
    return this.session.id;
  }

  get resumeVersionId(): string {
    return this.session.resumeVersionId;
  }

  get resumeProfileId(): string {
    return this.session.resumeProfileId;
  }

  get currentTurn(): number {
    return this.session.currentTurn;
  }

  get isComplete(): boolean {
    return this.session.isComplete;
  }

  get currentIntentKey(): string | null {
    return this.session.currentIntentKey;
  }

  get summary(): string | null {
    return this.session.summary;
  }

  // -------------------------------------------------------------
  // Transcript Management
  // -------------------------------------------------------------
  addTranscript(role: 'student' | 'ai' | 'system', content: string): InterviewTranscript {
    const trxId = `trx_${Math.random().toString(36).slice(2, 11)}`;
    const transcript: InterviewTranscript = {
      id: trxId,
      sessionId: this.sessionId,
      turn: this.session.currentTurn + 1,
      role,
      content,
      createdAt: new Date(),
    };
    this.transcripts.push(transcript);
    this.session.currentTurn = transcript.turn;
    return transcript;
  }

  getTranscriptsAsChatMessages(): ChatMessage[] {
    return this.transcripts.map((t) => ({
      id: t.id,
      role: t.role === 'ai' ? 'ai' : 'student',
      content: t.content,
      timestamp: typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt,
    }));
  }

  // -------------------------------------------------------------
  // Entity Management
  // -------------------------------------------------------------
  getOrCreateEntity(
    entityType: EntityType,
    rawName: string,
    displayName?: string,
    metadata: Record<string, any> = {}
  ): InterviewEntity {
    const normalizedKey = normalizeIdentifier(rawName);
    const id = `${entityType}|${normalizedKey}`;

    const existing = this.entities.get(id);
    if (existing) {
      if (displayName && (!existing.displayName || existing.displayName === existing.normalizedKey)) {
        existing.displayName = displayName;
      }
      existing.metadata = { ...existing.metadata, ...metadata };
      return existing;
    }

    const newEntity: InterviewEntity = {
      id,
      sessionId: this.sessionId,
      entityType,
      normalizedKey,
      displayName: displayName || rawName.trim(),
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.entities.set(id, newEntity);
    return newEntity;
  }

  getEntity(id: string): InterviewEntity | undefined {
    return this.entities.get(id);
  }

  getEntitiesByType(entityType: EntityType): InterviewEntity[] {
    const result: InterviewEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.entityType === entityType) {
        result.push(entity);
      }
    }
    return result;
  }

  // -------------------------------------------------------------
  // Slot Management
  // -------------------------------------------------------------
  setSlot(
    entityId: string,
    slotName: string,
    state: SlotState,
    value?: any,
    factId?: string | null
  ): InterviewSlot {
    const id = makeSlotId(entityId, slotName);
    const existing = this.slots.get(id);

    const slotRecord: InterviewSlot = {
      id,
      sessionId: this.sessionId,
      entityId,
      slot: slotName,
      state,
      value: value !== undefined ? value : existing?.value,
      factId: factId !== undefined ? factId : existing?.factId,
      updatedAt: new Date(),
    };

    this.slots.set(id, slotRecord);
    return slotRecord;
  }

  getSlot(entityId: string, slotName: string): InterviewSlot | undefined {
    return this.slots.get(makeSlotId(entityId, slotName));
  }

  getSlotsForEntity(entityId: string): InterviewSlot[] {
    const result: InterviewSlot[] = [];
    for (const slot of this.slots.values()) {
      if (slot.entityId === entityId) {
        result.push(slot);
      }
    }
    return result;
  }

  isSlotKnown(entityId: string, slotName: string): boolean {
    const s = this.getSlot(entityId, slotName);
    return s?.state === 'known' || s?.state === 'inferred';
  }

  isSlotResolved(entityId: string, slotName: string): boolean {
    const s = this.getSlot(entityId, slotName);
    return s?.state === 'known' || s?.state === 'inferred' || s?.state === 'declared_none' || s?.state === 'skipped';
  }

  // -------------------------------------------------------------
  // Fact Provenance Management
  // -------------------------------------------------------------
  addFact(params: {
    entityId: string;
    slot: string;
    value: any;
    rawEvidence: string;
    origin?: FactOrigin;
    confidence?: string;
    sourceFactIds?: string[];
  }): InterviewFact {
    // For scalar slots (not additive arrays like technologies or achievements),
    // mark previous active facts for this slot as superseded so corrections replace old data.
    const additiveSlots = new Set(['technologies', 'contributions', 'achievements', 'technical', 'languages']);
    if (!additiveSlots.has(params.slot)) {
      for (const existingFact of this.facts.values()) {
        if (existingFact.entityId === params.entityId && existingFact.slot === params.slot && existingFact.status === 'active') {
          existingFact.status = 'superseded';
        }
      }
    }

    const factId = `fact_${Math.random().toString(36).slice(2, 11)}`;
    const fact: InterviewFact = {
      id: factId,
      sessionId: this.sessionId,
      entityId: params.entityId,
      slot: params.slot,
      value: params.value,
      rawEvidence: params.rawEvidence,
      sourceTurn: this.session.currentTurn,
      confidence: params.confidence || '1.0',
      origin: params.origin || 'explicit',
      status: 'active',
      sourceFactIds: params.sourceFactIds || [],
      createdAt: new Date(),
    };

    this.facts.set(factId, fact);
    this.setSlot(params.entityId, params.slot, 'known', params.value, factId);
    return fact;
  }

  getFactsForEntity(entityId: string): InterviewFact[] {
    const result: InterviewFact[] = [];
    for (const fact of this.facts.values()) {
      if (fact.entityId === entityId && fact.status === 'active') {
        result.push(fact);
      }
    }
    return result;
  }

  getAllFacts(): InterviewFact[] {
    return Array.from(this.facts.values()).filter((f) => f.status === 'active');
  }

  // -------------------------------------------------------------
  // Intent Ledger Management
  // -------------------------------------------------------------
  registerIntent(intentKey: string, status: IntentStatus = 'pending'): InterviewIntent {
    const existing = this.intents.get(intentKey);
    if (existing) {
      if (status !== 'pending') {
        existing.status = status;
        existing.updatedAt = new Date();
      }
      return existing;
    }

    const intent: InterviewIntent = {
      id: intentKey,
      sessionId: this.sessionId,
      intentKey,
      status,
      updatedAt: new Date(),
    };
    this.intents.set(intentKey, intent);
    return intent;
  }

  resolveIntent(intentKey: string): void {
    const intent = this.intents.get(intentKey);
    if (intent) {
      intent.status = 'resolved';
      intent.updatedAt = new Date();
    } else {
      this.registerIntent(intentKey, 'resolved');
    }

    if (this.session.currentIntentKey === intentKey) {
      this.session.currentIntentKey = null;
    }
  }

  isIntentResolved(intentKey: string): boolean {
    const intent = this.intents.get(intentKey);
    return intent?.status === 'resolved';
  }

  // -------------------------------------------------------------
  // Snapshot Serialization
  // -------------------------------------------------------------
  toSnapshot(): InterviewLedgerSnapshot {
    return {
      session: { ...this.session },
      transcripts: [...this.transcripts],
      entities: Array.from(this.entities.values()),
      slots: Array.from(this.slots.values()),
      facts: Array.from(this.facts.values()),
      intents: Array.from(this.intents.values()),
    };
  }

  static fromSnapshot(snapshot: InterviewLedgerSnapshot): InterviewLedger {
    const ledger = new InterviewLedger(snapshot.session);
    ledger.transcripts = snapshot.transcripts || [];

    for (const e of snapshot.entities || []) {
      ledger.entities.set(e.id, e);
    }
    for (const s of snapshot.slots || []) {
      ledger.slots.set(s.id, s);
    }
    for (const f of snapshot.facts || []) {
      ledger.facts.set(f.id, f);
    }
    for (const i of snapshot.intents || []) {
      ledger.intents.set(i.intentKey, i);
    }

    return ledger;
  }

  getCurrentTopic(): string {
    const currentKey = this.session.currentIntentKey;
    if (!currentKey) return 'general';
    const parts = currentKey.split('|');
    return parts[0] || 'general';
  }

  getStructuredProfile(): StructuredResumeProfile {
    const profile: StructuredResumeProfile = {
      personal_information: {},
      education: [],
      work_experience: [],
      projects: [],
      skills: {
        technical: [],
        soft: [],
        languages: [],
      },
      certifications: [],
      achievements: [],
      extracurriculars: [],
      leadership: [],
      volunteer_experience: [],
      languages: [],
      awards: [],
      interests: [],
      references: [],
    };

    // 1. Personal
    const personalFacts = this.getFactsForEntity('personal|self');
    for (const f of personalFacts) {
      if (f.slot === 'fullName') profile.personal_information.fullName = String(f.value);
      if (f.slot === 'email') profile.personal_information.email = String(f.value);
      if (f.slot === 'phone') profile.personal_information.phone = String(f.value);
      if (f.slot === 'location') profile.personal_information.location = String(f.value);
      if (f.slot === 'linkedin') profile.personal_information.linkedin = String(f.value);
      if (f.slot === 'github') profile.personal_information.github = String(f.value);
      if (f.slot === 'portfolio') profile.personal_information.portfolio = String(f.value);
      if (f.slot === 'photoUrl') profile.personal_information.photoUrl = String(f.value);
      if (f.slot === 'professionalSummary') profile.personal_information.professionalSummary = String(f.value);
    }

    // 2. Education
    const eduEntities = this.getEntitiesByType('education');
    for (const edu of eduEntities) {
      const facts = this.getFactsForEntity(edu.id);
      const factMap = new Map(facts.map((f) => [f.slot, f.value]));

      const institution = factMap.get('institution') != null ? String(factMap.get('institution')) : edu.displayName;
      const degree = factMap.get('degree') != null ? String(factMap.get('degree')) : '';
      const major = factMap.get('field_of_study') != null ? String(factMap.get('field_of_study')) : (factMap.get('major') != null ? String(factMap.get('major')) : undefined);
      const minor = factMap.get('minor') != null ? String(factMap.get('minor')) : undefined;
      const year = factMap.get('year') != null ? String(factMap.get('year')) : (factMap.get('academic_standing') != null ? String(factMap.get('academic_standing')) : undefined);
      const expectedGrad = factMap.get('expected_graduation') != null ? String(factMap.get('expected_graduation')) : undefined;
      const startYear = factMap.get('start_year') != null ? String(factMap.get('start_year')) : undefined;
      const endYear = factMap.get('end_year') != null ? String(factMap.get('end_year')) : expectedGrad;
      const cgpa = factMap.get('cgpa') != null ? String(factMap.get('cgpa')) : undefined;

      const rawAchievements = factMap.get('academic_achievements');
      const achievements: string[] = Array.isArray(rawAchievements)
        ? rawAchievements.map(String)
        : rawAchievements ? [String(rawAchievements)] : [];

      profile.education.push({
        institution,
        degree,
        major,
        minor,
        year,
        expected_graduation: expectedGrad,
        start_year: startYear,
        end_year: endYear,
        cgpa,
        academic_achievements: achievements.length > 0 ? achievements : undefined,
      });
    }

    // 3. Work Experience
    const expEntities = this.getEntitiesByType('experience');
    const expDeclaredNone = this.getSlot('experience|general', 'declared_none')?.state === 'declared_none';
    if (expDeclaredNone && expEntities.length === 0) {
      profile.work_experience.push({
        employer: 'None',
        declared_none: true,
      });
    } else {
      for (const exp of expEntities) {
        const isNone = this.getSlot(exp.id, 'declared_none')?.state === 'declared_none';
        if (isNone) {
          profile.work_experience.push({ employer: exp.displayName, declared_none: true });
          continue;
        }
        const facts = this.getFactsForEntity(exp.id);
        const factMap = new Map(facts.map((f) => [f.slot, f.value]));
        const rawAchievements = factMap.get('achievements');
        const achievements: string[] = Array.isArray(rawAchievements)
          ? rawAchievements.map(String)
          : rawAchievements ? [String(rawAchievements)] : [];

        profile.work_experience.push({
          employer: factMap.get('employer') != null ? String(factMap.get('employer')) : exp.displayName,
          position: factMap.get('position') != null ? String(factMap.get('position')) : undefined,
          responsibilities: factMap.get('responsibilities') != null ? String(factMap.get('responsibilities')) : undefined,
          achievements: achievements.length > 0 ? achievements : undefined,
          start_date: factMap.get('start_date') != null ? String(factMap.get('start_date')) : undefined,
          end_date: factMap.get('end_date') != null ? String(factMap.get('end_date')) : undefined,
          is_current: !factMap.get('end_date'),
        });
      }
    }

    // 4. Projects
    const projEntities = this.getEntitiesByType('project');
    for (const proj of projEntities) {
      const facts = this.getFactsForEntity(proj.id);
      const factMap = new Map(facts.map((f) => [f.slot, f.value]));

      const allTechFacts = facts.filter((f) => f.slot === 'technologies');
      const allTechs: string[] = [];
      for (const tf of allTechFacts) {
        const v = tf.value;
        if (Array.isArray(v)) allTechs.push(...v.map(String));
        else if (v) allTechs.push(String(v));
      }

      const allContribFacts = facts.filter((f) => f.slot === 'contributions' || f.slot === 'achievements');
      const allContribs: string[] = [];
      for (const cf of allContribFacts) {
        const v = cf.value;
        if (Array.isArray(v)) allContribs.push(...v.map(String));
        else if (v) allContribs.push(String(v));
      }

      profile.projects.push({
        name: factMap.get('name') != null ? String(factMap.get('name')) : proj.displayName,
        role: factMap.get('role') != null ? String(factMap.get('role')) : undefined,
        description: factMap.get('description') != null ? String(factMap.get('description')) : undefined,
        technologies: Array.from(new Set(allTechs)),
        achievements: Array.from(new Set(allContribs)),
      });
    }

    // 5. Skills
    const skillFacts = this.getFactsForEntity('skill|self');
    const techSet = new Set<string>();
    const langSet = new Set<string>();
    const softSet = new Set<string>();
    for (const f of skillFacts) {
      if (f.slot === 'technical') {
        const arr = Array.isArray(f.value) ? f.value.map(String) : [String(f.value)];
        for (const s of arr) techSet.add(s);
      }
      if (f.slot === 'languages') {
        const arr = Array.isArray(f.value) ? f.value.map(String) : [String(f.value)];
        for (const l of arr) langSet.add(l);
      }
      if (f.slot === 'soft') {
        const arr = Array.isArray(f.value) ? f.value.map(String) : [String(f.value)];
        for (const s of arr) softSet.add(s);
      }
    }
    profile.skills.technical = Array.from(techSet);
    profile.skills.languages = Array.from(langSet);
    profile.skills.soft = Array.from(softSet);
    profile.languages = Array.from(langSet);

    // 6. Leadership
    const leadEntities = this.getEntitiesByType('leadership');
    for (const lead of leadEntities) {
      const facts = this.getFactsForEntity(lead.id);
      const factMap = new Map(facts.map((f) => [f.slot, f.value]));
      const isNone = this.getSlot(lead.id, 'declared_none')?.state === 'declared_none';
      profile.leadership.push({
        organization: factMap.get('organization') != null ? String(factMap.get('organization')) : lead.displayName,
        role: factMap.get('role') != null ? String(factMap.get('role')) : undefined,
        description: factMap.get('description') != null ? String(factMap.get('description')) : undefined,
        declared_none: isNone,
      });
    }

    // 7. Certifications & Awards
    const certEntities = this.getEntitiesByType('certification');
    for (const cert of certEntities) {
      const facts = this.getFactsForEntity(cert.id);
      const factMap = new Map(facts.map((f) => [f.slot, f.value]));
      profile.certifications.push({
        name: factMap.get('name') != null ? String(factMap.get('name')) : cert.displayName,
        issuer: factMap.get('issuer') != null ? String(factMap.get('issuer')) : undefined,
        date: factMap.get('date') != null ? String(factMap.get('date')) : undefined,
      });
    }

    const awardEntities = this.getEntitiesByType('achievement');
    for (const aw of awardEntities) {
      const facts = this.getFactsForEntity(aw.id);
      const factMap = new Map(facts.map((f) => [f.slot, f.value]));
      profile.awards.push({
        name: factMap.get('name') != null ? String(factMap.get('name')) : aw.displayName,
        issuer: factMap.get('issuer') != null ? String(factMap.get('issuer')) : undefined,
        date: factMap.get('date') != null ? String(factMap.get('date')) : undefined,
      });
      profile.achievements.push({
        name: factMap.get('name') != null ? String(factMap.get('name')) : aw.displayName,
        description: factMap.get('description') != null ? String(factMap.get('description')) : undefined,
        date: factMap.get('date') != null ? String(factMap.get('date')) : undefined,
      });
    }

    return profile;
  }
}