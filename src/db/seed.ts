import { config } from 'dotenv';
import { db } from './index';
import { providers, scholarships, intakes, intakeVersions, requirements } from './schema';
import { RequirementNode } from '../domain/schema';

config({ path: '.env.local' });

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // 1. Clear existing seed data (Cascade will handle related tables)
    console.log('🧹 Clearing old data...');
    await db.delete(providers);

    // 2. Insert Provider
    console.log('🏢 Inserting provider...');
    const [provider] = await db.insert(providers).values({
      name: 'Yayasan Peneraju',
      description: 'Yayasan Peneraju Pendidikan Bumiputera is an initiative that focuses on strengthening the capacity of Bumiputera.',
      url: 'https://yayasanpeneraju.com.my',
    }).returning();

    // 3. Insert Scholarship
    console.log('🎓 Inserting scholarship...');
    const [scholarship] = await db.insert(scholarships).values({
      providerId: provider.id,
      name: 'Peneraju Tunas Potensi',
      description: 'B40 Engineering and Technology Scholarship for SPM leavers.',
    }).returning();

    // 4. Insert Intake
    console.log('📅 Inserting intake...');
    const [intake] = await db.insert(intakes).values({
      scholarshipId: scholarship.id,
      year: new Date().getFullYear(),
      openDate: '2026-03-01',
      closeDate: '2026-06-30',
      status: 'open',
    }).returning();

    // 5. Insert Intake Version
    console.log('🔖 Inserting intake version...');
    const [intakeVersion] = await db.insert(intakeVersions).values({
      intakeId: intake.id,
      versionNum: 1,
    }).returning();

    // 6. Define Rule AST (From Phase 1)
    const ruleAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'bumiputeraStatus', operator: 'EQUALS', value: true },
        { type: 'CONDITION', field: 'incomeBand', operator: 'IN_ARRAY', value: ['B40'] },
        {
          type: 'ANY',
          nodes: [
            { type: 'CONDITION', field: 'spmResults', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A-' } },
            { type: 'CONDITION', field: 'spmResults', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Additional Mathematics', minGrade: 'B+' } },
          ]
        }
      ]
    };

    // 7. Insert Requirement
    console.log('✅ Inserting requirements with AST...');
    await db.insert(requirements).values({
      intakeVersionId: intakeVersion.id,
      name: 'Basic Eligibility Criteria',
      ruleAst, // Typed as JSONB automatically
    });

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    process.exit(0);
  }
}

seed();
