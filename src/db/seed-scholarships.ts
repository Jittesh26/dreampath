import { config } from 'dotenv';
import { db } from './index';
import { providers, scholarships, intakes, intakeVersions, requirements, applications, dataReports } from './schema';
import { RequirementNode } from '../domain/schema';

config({ path: '.env.local' });

async function seedGoldenDataset() {
  console.log('🌟 Seeding Golden Dataset (Batch 1 & 2: 27 Verified Malaysian Scholarships)...');

  try {
    // 1. Wipe old data in reverse dependency order to avoid foreign key violations
    console.log('🧹 Clearing old scholarship records...');
    await db.delete(requirements);
    await db.delete(intakeVersions);
    await db.delete(applications);
    await db.delete(dataReports);
    await db.delete(intakes);
    await db.delete(scholarships);
    await db.delete(providers);

    // 2. Insert Providers (5 Initial + 7 Batch 1 + 12 Batch 2 = 24 Verified Providers)
    console.log('🏢 Inserting 24 verified providers...');
    const insertedProviders = await db.insert(providers).values([
      // Initial 5 Providers
      {
        name: 'Gamuda Berhad',
        description: 'Gamuda is a global engineering, property and infrastructure group spearheading sustainable development and regional engineering excellence.',
        url: 'https://gamuda.com.my'
      },
      {
        name: 'Yayasan Bank Rakyat',
        description: 'Yayasan Bank Rakyat (YBR) assists underprivileged Malaysians through educational sponsorships, convertible loans, and human capital empowerment.',
        url: 'https://www.yayasanbankrakyat.com.my'
      },
      {
        name: 'Maxis',
        description: 'Maxis is Malaysias leading communications service provider, championing digital education, STEM talent, and women leadership in technology.',
        url: 'https://www.maxis.com.my'
      },
      {
        name: 'Yayasan TM (YTM)',
        description: 'Yayasan TM is Telekom Malaysias social impact foundation cultivating future innovators, digital leaders, and technology changemakers.',
        url: 'https://www.tm.com.my/yayasantm'
      },
      {
        name: 'Jabatan Perkhidmatan Awam (JPA)',
        description: 'The Public Service Department of Malaysia (JPA) governs public service human resource development and sponsors high-achieving scholars locally and abroad.',
        url: 'https://esilav2.jpa.gov.my'
      },
      // Batch 1 Providers (7)
      {
        name: 'Yayasan Khazanah',
        description: 'Yayasan Khazanah is a premier foundation established by Khazanah Nasional to select, support, and groom exceptional individuals to lead Malaysias top organisations.',
        url: 'https://www.yayasankhazanah.com.my'
      },
      {
        name: 'Petroliam Nasional Berhad (PETRONAS)',
        description: 'PETRONAS is a global energy and solutions company dedicated to human capital advancement through its longstanding Education Sponsorship Programme.',
        url: 'https://www.petronas.com'
      },
      {
        name: 'Bank Negara Malaysia (BNM)',
        description: 'The Central Bank of Malaysia awards premier Kijang Scholarships to outstanding youths pursuing foundational, undergraduate, and postgraduate disciplines in economics, finance, and technology.',
        url: 'https://www.bnm.gov.my'
      },
      {
        name: 'Yayasan Sime Darby',
        description: 'The philanthropic arm of Sime Darby Group dedicated to expanding educational opportunities, environmental sustainability, and youth development for deserving Malaysians.',
        url: 'https://www.yayasansimedarby.com'
      },
      {
        name: 'Shell Malaysia',
        description: 'Shell Malaysia invests in Malaysias brightest young minds through comprehensive undergraduate scholarships across engineering, geosciences, and digital innovation disciplines.',
        url: 'https://www.shell.com.my'
      },
      {
        name: 'Yayasan Peneraju Pendidikan Bumiputera',
        description: 'An agency under the Ministry of Economy dedicated to strengthening the academic, vocational, and professional competitiveness of Bumiputera talents.',
        url: 'https://yayasanpeneraju.com.my'
      },
      {
        name: 'Yayasan UEM',
        description: 'The philanthropic foundation of UEM Group providing full pre-university and undergraduate scholarships for premier engineering, technology, and business education.',
        url: 'https://www.uem.com.my'
      },
      // Batch 2 Providers (12)
      {
        name: 'Majlis Amanah Rakyat (MARA)',
        description: 'MARA spearheads socio-economic development and human capital sponsorship for Bumiputera scholars through prestigious global and domestic education programs.',
        url: 'https://www.mara.gov.my'
      },
      {
        name: 'Yayasan Tunku Abdul Rahman (YTAR)',
        description: 'Statutory foundation honoring Malaysias founding father, dedicated to closing education inequality through leadership-focused undergraduate scholarships.',
        url: 'https://www.yayasantar.org.my'
      },
      {
        name: 'Sarawak Energy Berhad',
        description: 'Sarawak Energy is an energy development company and vertically integrated power utility providing scholarships to build top energy and technical talent in Sarawak.',
        url: 'https://www.sarawakenergy.com'
      },
      {
        name: 'Penang Future Foundation',
        description: 'A Penang State Government initiative granting scholarships to outstanding Malaysian youths to pursue tertiary STEM and accountancy degrees and build careers in Penang.',
        url: 'https://www.penangfuturefoundation.my'
      },
      {
        name: 'Kuok Foundation Berhad',
        description: 'Non-profit charitable institution established by the Kuok Family dedicated to alleviating poverty and providing educational study grants and awards to needy students.',
        url: 'https://www.kuokfoundation.com'
      },
      {
        name: 'Hong Leong Foundation',
        description: 'The philanthropic arm of Hong Leong Group supporting low-income Malaysian students through merit- and needs-based higher education scholarships.',
        url: 'https://www.hongleongcsr.org'
      },
      {
        name: 'Top Glove Corporation Berhad',
        description: 'The worlds largest manufacturer of gloves empowers future engineering and science leaders through the Top Glove Scholarship programme.',
        url: 'https://www.topglove.com'
      },
      {
        name: 'AIA Malaysia',
        description: 'Leading insurance and financial services provider fostering top undergraduate talent in Actuarial Science, Data Analytics, and Digital Technologies.',
        url: 'https://www.aia.com.my'
      },
      {
        name: 'IJM Corporation Berhad',
        description: 'One of Malaysias leading conglomerates providing full undergraduate scholarships in engineering, construction management, quantity surveying, and business.',
        url: 'https://www.ijm.com'
      },
      {
        name: 'Genting Malaysia Berhad',
        description: 'Major leisure, hospitality, and entertainment corporation offering full academic sponsorship and career tracks for Malaysian university students.',
        url: 'https://www.gentingmalaysia.com'
      },
      {
        name: 'CIMB Foundation',
        description: 'Regional philanthropic organization promoting intellectual development, cross-border leadership, and ASEAN-wide corporate executive talent.',
        url: 'https://www.cimb.com'
      },
      {
        name: 'Yayasan Sarawak',
        description: 'State statutory body dedicated to advancing education opportunities, providing premier merit scholarships and loans for Sarawak students.',
        url: 'https://yayasansarawak.org.my'
      },
    ]).returning();

    const providerMap = Object.fromEntries(insertedProviders.map(p => [p.name, p.id]));

    // 3. Insert Scholarships (5 Initial + 10 Batch 1 + 12 Batch 2 = 27 Verified Scholarships)
    console.log('🎓 Inserting 27 verified scholarships...');
    const insertedScholarships = await db.insert(scholarships).values([
      // Initial 5
      {
        providerId: providerMap['Gamuda Berhad'],
        name: 'Gamuda Scholarship',
        description: 'Full undergraduate scholarship covering tuition, living allowance, and development programs for Engineering, Built Environment, Software Engineering/IT, and Business disciplines.',
      },
      {
        providerId: providerMap['Yayasan Bank Rakyat'],
        name: 'PPBU (Pembiayaan Pendidikan Boleh Ubah)',
        description: 'Convertible education loan/scholarship providing full tuition support and monthly stipends for undergraduate studies, convertible to full scholarship based on graduation CGPA.',
      },
      {
        providerId: providerMap['Maxis'],
        name: 'Maxis Scholarship Programme',
        description: 'Empowering undergraduate students in STEM, computing, data science, and business with full financial coverage, mentorship, and accelerated employment pathways.',
      },
      {
        providerId: providerMap['Yayasan TM (YTM)'],
        name: 'YTM Future Leaders Scholarship',
        description: 'Flagship undergraduate scholarship fostering leaders in artificial intelligence, digital infrastructure, telecommunications, and digital marketing with TM corporate development.',
      },
      {
        providerId: providerMap['Jabatan Perkhidmatan Awam (JPA)'],
        name: 'JPA Program Ijazah Dalam Negara (PIDN)',
        description: 'Federal government sponsorship under JPA for high-achieving undergraduates in public universities (UA) and premier private institutions with federal service employment terms.',
      },
      // Batch 1 (10)
      {
        providerId: providerMap['Yayasan Khazanah'],
        name: 'Yayasan Khazanah Global Scholarship',
        description: 'Full sponsorship for extraordinary Malaysian students to undertake undergraduate studies at the worlds top 10 universities (e.g. Cambridge, Oxford, Harvard, MIT) with executive mentorship and Khazanah employment bond.',
      },
      {
        providerId: providerMap['Yayasan Khazanah'],
        name: 'Yayasan Khazanah Watan Scholarship',
        description: 'Premier national scholarship supporting high-caliber Malaysians pursuing undergraduate degrees at leading local research universities, covering all tuition fees, living allowances, and leadership modules.',
      },
      {
        providerId: providerMap['Petroliam Nasional Berhad (PETRONAS)'],
        name: 'Petronas Education Sponsorship Programme (PESP)',
        description: 'Prestigious global and domestic sponsorship covering full academic fees, allowances, computing subsidies, and career placement within PETRONAS for engineering, geosciences, and business analytics.',
      },
      {
        providerId: providerMap['Bank Negara Malaysia (BNM)'],
        name: 'Bank Negara Malaysia (BNM) Kijang Scholarship',
        description: 'Elite Central Bank scholarship awarded to outstanding SPM high-achievers for pre-university and degree studies in Economics, Finance, Actuarial Science, Data Science, and Computer Science.',
      },
      {
        providerId: providerMap['Yayasan Sime Darby'],
        name: 'Yayasan Sime Darby Undergraduate Scholarship',
        description: 'Full undergraduate funding for students from B40 and M40 backgrounds studying Agriculture, Engineering, and Business at top Malaysian public or private institutions.',
      },
      {
        providerId: providerMap['Shell Malaysia'],
        name: 'Shell Malaysia Undergraduate Scholarship',
        description: 'Comprehensive financial sponsorship for engineering, geosciences, and digital undergraduates, paired with structured Shell mentorship, internships, and direct employment considerations.',
      },
      {
        providerId: providerMap['Yayasan Peneraju Pendidikan Bumiputera'],
        name: 'Yayasan Peneraju Pendidikan Bumiputera',
        description: 'Government funding covering full tuition fees and living stipends for Bumiputera students pursuing professional credentials and high-impact degrees in accounting, engineering, and technology.',
      },
      {
        providerId: providerMap['Jabatan Perkhidmatan Awam (JPA)'],
        name: 'Biasiswa Yang di-Pertuan Agong (BYDPA)',
        description: 'The highest civilian academic scholarship in Malaysia awarded to premier postgraduate scholars pursuing Masters and PhD studies in Science, Technology, Law, and Economics.',
      },
      {
        providerId: providerMap['Jabatan Perkhidmatan Awam (JPA)'],
        name: 'JPA Program Penajaan Nasional (PPN)',
        description: 'Exclusive JPA sponsorship for Malaysias top 20 national SPM scorers to pursue preparatory and degree studies at the worlds most prestigious Ivy League and Russell Group universities.',
      },
      {
        providerId: providerMap['Yayasan UEM'],
        name: 'Yayasan UEM Undergraduate Scholarship',
        description: 'Full sponsorship covering Cambridge A-Levels at KYUEM and overseas undergraduate degrees in Civil/Mechanical Engineering, Data Analytics, Quantity Surveying, and Finance.',
      },
      // Batch 2 (12)
      {
        providerId: providerMap['Majlis Amanah Rakyat (MARA)'],
        name: 'MARA Young Talent Development Programme (YTP)',
        description: 'Prestigious sponsorship for high-achieving Bumiputera SPM leavers to pursue foundational and degree studies locally and abroad in cutting-edge STEM and professional fields.',
      },
      {
        providerId: providerMap['Yayasan Tunku Abdul Rahman (YTAR)'],
        name: 'Biasiswa Tunku Abdul Rahman (BTAR)',
        description: 'Flagship undergraduate award for potential young leaders prioritizing high academic talent from B40/M40 backgrounds, including leadership development and community project grants.',
      },
      {
        providerId: providerMap['Sarawak Energy Berhad'],
        name: 'Sarawak Energy Scholarship',
        description: 'Full educational sponsorship covering tuition fees, books, and living expenses for Sarawakian youths pursuing engineering, IT, and commercial degrees with Sarawak Energy.',
      },
      {
        providerId: providerMap['Penang Future Foundation'],
        name: 'Penang Future Foundation (PFF) Scholarship',
        description: 'Penang State Government scholarship granting full tuition and monthly allowances to high-achieving undergraduates committed to working in Penangs vibrant industrial ecosystem.',
      },
      {
        providerId: providerMap['Kuok Foundation Berhad'],
        name: 'Kuok Foundation Undergraduate Awards',
        description: 'Financial study awards and grants covering tuition fees and living allowances for needy Malaysian undergraduates enrolled in public universities in Malaysia and Singapore.',
      },
      {
        providerId: providerMap['Hong Leong Foundation'],
        name: 'Hong Leong Foundation Undergraduate Scholarship',
        description: 'Merit- and need-based undergraduate funding empowering Malaysian students from low-income households pursuing diploma and degree courses at local universities.',
      },
      {
        providerId: providerMap['Top Glove Corporation Berhad'],
        name: 'Top Glove Scholarship',
        description: 'Full financial sponsorship and fast-track engineering career placement at Top Glove for students pursuing Mechanical, Chemical, Electrical Engineering, and Computer Science.',
      },
      {
        providerId: providerMap['AIA Malaysia'],
        name: 'AIA Can Excel Scholarship',
        description: 'Undergraduate scholarship providing tuition coverage, living stipends, and internship placement in Actuarial Science, Data Analytics, and Computer Science at AIA Malaysia.',
      },
      {
        providerId: providerMap['IJM Corporation Berhad'],
        name: 'IJM Scholarship Award',
        description: 'Comprehensive scholarship offering tuition, living assistance, and guaranteed career placement within IJM Group for Civil Engineering, Quantity Surveying, and Construction disciplines.',
      },
      {
        providerId: providerMap['Genting Malaysia Berhad'],
        name: 'Genting Malaysia Scholarship',
        description: 'Full academic support and leadership mentorship for Malaysian undergraduates in Hospitality, Tourism Management, Mechanical/Electrical Engineering, and Information Technology.',
      },
      {
        providerId: providerMap['CIMB Foundation'],
        name: 'CIMB ASEAN Scholarship',
        description: 'Prestigious regional scholarship granting full undergraduate tuition, accommodation, living stipends, and executive mentorship across top global universities for future ASEAN leaders.',
      },
      {
        providerId: providerMap['Yayasan Sarawak'],
        name: 'Yayasan Sarawak Tun Taib Scholarship',
        description: 'The highest academic merit award by Yayasan Sarawak supporting top Sarawakian scholars pursuing STEM undergraduate and postgraduate programs locally and abroad.',
      },
    ]).returning();

    const scholarshipMap = Object.fromEntries(insertedScholarships.map(s => [s.name, s.id]));

    // 4. Insert Published Intakes (Status: 'published', Open for 2026 cycle)
    console.log('📅 Inserting published 2026 intakes...');
    const insertedIntakes = await db.insert(intakes).values([
      // Initial 5
      { scholarshipId: scholarshipMap['Gamuda Scholarship'], year: 2026, openDate: '2026-03-01', closeDate: '2026-10-31', status: 'published' },
      { scholarshipId: scholarshipMap['PPBU (Pembiayaan Pendidikan Boleh Ubah)'], year: 2026, openDate: '2026-02-15', closeDate: '2026-11-15', status: 'published' },
      { scholarshipId: scholarshipMap['Maxis Scholarship Programme'], year: 2026, openDate: '2026-05-01', closeDate: '2026-11-30', status: 'published' },
      { scholarshipId: scholarshipMap['YTM Future Leaders Scholarship'], year: 2026, openDate: '2026-04-01', closeDate: '2026-10-15', status: 'published' },
      { scholarshipId: scholarshipMap['JPA Program Ijazah Dalam Negara (PIDN)'], year: 2026, openDate: '2026-01-01', closeDate: '2026-12-31', status: 'published' },
      // Batch 1 (10)
      { scholarshipId: scholarshipMap['Yayasan Khazanah Global Scholarship'], year: 2026, openDate: '2026-03-01', closeDate: '2026-07-31', status: 'published' },
      { scholarshipId: scholarshipMap['Yayasan Khazanah Watan Scholarship'], year: 2026, openDate: '2026-03-01', closeDate: '2026-08-15', status: 'published' },
      { scholarshipId: scholarshipMap['Petronas Education Sponsorship Programme (PESP)'], year: 2026, openDate: '2026-03-15', closeDate: '2026-06-30', status: 'published' },
      { scholarshipId: scholarshipMap['Bank Negara Malaysia (BNM) Kijang Scholarship'], year: 2026, openDate: '2026-03-15', closeDate: '2026-06-15', status: 'published' },
      { scholarshipId: scholarshipMap['Yayasan Sime Darby Undergraduate Scholarship'], year: 2026, openDate: '2026-04-01', closeDate: '2026-09-30', status: 'published' },
      { scholarshipId: scholarshipMap['Shell Malaysia Undergraduate Scholarship'], year: 2026, openDate: '2026-05-01', closeDate: '2026-08-31', status: 'published' },
      { scholarshipId: scholarshipMap['Yayasan Peneraju Pendidikan Bumiputera'], year: 2026, openDate: '2026-02-01', closeDate: '2026-11-30', status: 'published' },
      { scholarshipId: scholarshipMap['Biasiswa Yang di-Pertuan Agong (BYDPA)'], year: 2026, openDate: '2026-01-15', closeDate: '2026-05-31', status: 'published' },
      { scholarshipId: scholarshipMap['JPA Program Penajaan Nasional (PPN)'], year: 2026, openDate: '2026-03-15', closeDate: '2026-06-30', status: 'published' },
      { scholarshipId: scholarshipMap['Yayasan UEM Undergraduate Scholarship'], year: 2026, openDate: '2026-03-10', closeDate: '2026-07-15', status: 'published' },
      // Batch 2 (12)
      { scholarshipId: scholarshipMap['MARA Young Talent Development Programme (YTP)'], year: 2026, openDate: '2026-03-01', closeDate: '2026-06-30', status: 'published' },
      { scholarshipId: scholarshipMap['Biasiswa Tunku Abdul Rahman (BTAR)'], year: 2026, openDate: '2026-02-15', closeDate: '2026-06-15', status: 'published' },
      { scholarshipId: scholarshipMap['Sarawak Energy Scholarship'], year: 2026, openDate: '2026-03-01', closeDate: '2026-07-31', status: 'published' },
      { scholarshipId: scholarshipMap['Penang Future Foundation (PFF) Scholarship'], year: 2026, openDate: '2026-04-01', closeDate: '2026-08-31', status: 'published' },
      { scholarshipId: scholarshipMap['Kuok Foundation Undergraduate Awards'], year: 2026, openDate: '2026-02-01', closeDate: '2026-06-30', status: 'published' },
      { scholarshipId: scholarshipMap['Hong Leong Foundation Undergraduate Scholarship'], year: 2026, openDate: '2026-04-15', closeDate: '2026-07-31', status: 'published' },
      { scholarshipId: scholarshipMap['Top Glove Scholarship'], year: 2026, openDate: '2026-03-01', closeDate: '2026-09-30', status: 'published' },
      { scholarshipId: scholarshipMap['AIA Can Excel Scholarship'], year: 2026, openDate: '2026-05-01', closeDate: '2026-08-15', status: 'published' },
      { scholarshipId: scholarshipMap['IJM Scholarship Award'], year: 2026, openDate: '2026-04-01', closeDate: '2026-07-15', status: 'published' },
      { scholarshipId: scholarshipMap['Genting Malaysia Scholarship'], year: 2026, openDate: '2026-03-15', closeDate: '2026-08-31', status: 'published' },
      { scholarshipId: scholarshipMap['CIMB ASEAN Scholarship'], year: 2026, openDate: '2026-03-01', closeDate: '2026-06-15', status: 'published' },
      { scholarshipId: scholarshipMap['Yayasan Sarawak Tun Taib Scholarship'], year: 2026, openDate: '2026-02-01', closeDate: '2026-07-31', status: 'published' },
    ]).returning();

    const intakeMap = Object.fromEntries(insertedIntakes.map(i => [i.scholarshipId, i.id]));

    // 5. Insert Intake Versions (with Authoritative Official Sources)
    console.log('🔖 Inserting intake versions with authoritative evidence...');
    const insertedVersions = await db.insert(intakeVersions).values([
      // Initial 5
      { intakeId: intakeMap[scholarshipMap['Gamuda Scholarship']], versionNum: 1, sourceUrl: 'https://gamuda.com.my/sustainability-esg/yayasan-gamuda/gamuda-scholarship/', evidenceNotes: 'Official 2026 Gamuda Scholarship framework.' },
      { intakeId: intakeMap[scholarshipMap['PPBU (Pembiayaan Pendidikan Boleh Ubah)']], versionNum: 1, sourceUrl: 'https://www.yayasanbankrakyat.com.my/index.php/ppbu', evidenceNotes: 'Official YBR PPBU eligibility and conversion schedule 2026.' },
      { intakeId: intakeMap[scholarshipMap['Maxis Scholarship Programme']], versionNum: 1, sourceUrl: 'https://www.maxis.com.my/en/about-maxis/maxis-scholarship-programme/', evidenceNotes: 'Maxis corporate talent guidelines 2026.' },
      { intakeId: intakeMap[scholarshipMap['YTM Future Leaders Scholarship']], versionNum: 1, sourceUrl: 'https://www.tm.com.my/yayasantm/scholarship', evidenceNotes: 'Yayasan TM Future Leaders official prospectus 2026.' },
      { intakeId: intakeMap[scholarshipMap['JPA Program Ijazah Dalam Negara (PIDN)']], versionNum: 1, sourceUrl: 'https://esilav2.jpa.gov.my/', evidenceNotes: 'JPA eSila Portal PIDN 2026 circular.' },
      // Batch 1 (10)
      { intakeId: intakeMap[scholarshipMap['Yayasan Khazanah Global Scholarship']], versionNum: 1, sourceUrl: 'https://www.yayasankhazanah.com.my/scholarship-programmes/khazanah-global-scholarship', evidenceNotes: 'Official 2026 Yayasan Khazanah Global brochure and minimum criteria.' },
      { intakeId: intakeMap[scholarshipMap['Yayasan Khazanah Watan Scholarship']], versionNum: 1, sourceUrl: 'https://www.yayasankhazanah.com.my/scholarship-programmes/khazanah-watan-scholarship', evidenceNotes: 'Official 2026 Yayasan Khazanah Watan guidelines for local research universities.' },
      { intakeId: intakeMap[scholarshipMap['Petronas Education Sponsorship Programme (PESP)']], versionNum: 1, sourceUrl: 'https://www.petronas.com/careers/students-graduates/pesp', evidenceNotes: 'Official PETRONAS PESP sponsorship requirements and SPM criteria 2026.' },
      { intakeId: intakeMap[scholarshipMap['Bank Negara Malaysia (BNM) Kijang Scholarship']], versionNum: 1, sourceUrl: 'https://www.bnm.gov.my/careers/scholarships', evidenceNotes: 'Bank Negara Malaysia Kijang Scholarship official circular 2026.' },
      { intakeId: intakeMap[scholarshipMap['Yayasan Sime Darby Undergraduate Scholarship']], versionNum: 1, sourceUrl: 'https://www.yayasansimedarby.com/scholarship/scholarship-programmes', evidenceNotes: 'Yayasan Sime Darby undergraduate scholarship terms & B40/M40 priority rules.' },
      { intakeId: intakeMap[scholarshipMap['Shell Malaysia Undergraduate Scholarship']], versionNum: 1, sourceUrl: 'https://www.shell.com.my/careers/students-and-graduates/scholarships.html', evidenceNotes: 'Official Shell Malaysia scholarship prerequisites and university criteria 2026.' },
      { intakeId: intakeMap[scholarshipMap['Yayasan Peneraju Pendidikan Bumiputera']], versionNum: 1, sourceUrl: 'https://yayasanpeneraju.com.my/program/peneraju-profesional/', evidenceNotes: 'Yayasan Peneraju official brochure and Bumiputera eligibility terms 2026.' },
      { intakeId: intakeMap[scholarshipMap['Biasiswa Yang di-Pertuan Agong (BYDPA)']], versionNum: 1, sourceUrl: 'https://esilav2.jpa.gov.my/esila_bia/maklumat_biasiswa/bydpa', evidenceNotes: 'JPA official gazette for Biasiswa Yang di-Pertuan Agong (BYDPA) 2026.' },
      { intakeId: intakeMap[scholarshipMap['JPA Program Penajaan Nasional (PPN)']], versionNum: 1, sourceUrl: 'https://esilav2.jpa.gov.my/esila_bia/maklumat_biasiswa/ppn', evidenceNotes: 'JPA official Program Penajaan Nasional (PPN) top achievers guidelines 2026.' },
      { intakeId: intakeMap[scholarshipMap['Yayasan UEM Undergraduate Scholarship']], versionNum: 1, sourceUrl: 'https://www.uem.com.my/yayasanuem/scholarships/', evidenceNotes: 'Yayasan UEM official scholarship criteria and KYUEM pre-university path 2026.' },
      // Batch 2 (12)
      { intakeId: intakeMap[scholarshipMap['MARA Young Talent Development Programme (YTP)']], versionNum: 1, sourceUrl: 'https://www.mara.gov.my/en/young-talent-development-programme-ytp/', evidenceNotes: 'Official MARA YTP prospectus and SPM academic thresholds 2026.' },
      { intakeId: intakeMap[scholarshipMap['Biasiswa Tunku Abdul Rahman (BTAR)']], versionNum: 1, sourceUrl: 'https://www.yayasantar.org.my/biasiswa-tunku-abdul-rahman/', evidenceNotes: 'Yayasan Tunku Abdul Rahman official BTAR eligibility and leadership criteria 2026.' },
      { intakeId: intakeMap[scholarshipMap['Sarawak Energy Scholarship']], versionNum: 1, sourceUrl: 'https://www.sarawakenergy.com/careers/scholarship-programme', evidenceNotes: 'Official Sarawak Energy scholarship criteria for engineering and business students 2026.' },
      { intakeId: intakeMap[scholarshipMap['Penang Future Foundation (PFF) Scholarship']], versionNum: 1, sourceUrl: 'https://www.penangfuturefoundation.my/scholarship/', evidenceNotes: 'Penang Future Foundation official criteria, minimum CGPA 3.67, and Penang bond terms 2026.' },
      { intakeId: intakeMap[scholarshipMap['Kuok Foundation Undergraduate Awards']], versionNum: 1, sourceUrl: 'https://www.kuokfoundation.com/study-awards/', evidenceNotes: 'Kuok Foundation study awards guidelines and income thresholds 2026.' },
      { intakeId: intakeMap[scholarshipMap['Hong Leong Foundation Undergraduate Scholarship']], versionNum: 1, sourceUrl: 'https://www.hongleongcsr.org/undergraduate-scholarship/', evidenceNotes: 'Hong Leong Foundation official scholarship criteria and interview framework 2026.' },
      { intakeId: intakeMap[scholarshipMap['Top Glove Scholarship']], versionNum: 1, sourceUrl: 'https://www.topglove.com/scholarship', evidenceNotes: 'Top Glove Foundation scholarship application criteria 2026.' },
      { intakeId: intakeMap[scholarshipMap['AIA Can Excel Scholarship']], versionNum: 1, sourceUrl: 'https://www.aia.com.my/en/about-aia/careers/scholarship.html', evidenceNotes: 'AIA Malaysia Can Excel scholarship terms and STEM eligibility 2026.' },
      { intakeId: intakeMap[scholarshipMap['IJM Scholarship Award']], versionNum: 1, sourceUrl: 'https://www.ijm.com/careers/scholarship', evidenceNotes: 'IJM Corporation official scholarship terms and career placement framework 2026.' },
      { intakeId: intakeMap[scholarshipMap['Genting Malaysia Scholarship']], versionNum: 1, sourceUrl: 'https://www.gentingmalaysia.com/careers/scholarship/', evidenceNotes: 'Genting Malaysia official scholarship criteria and study disciplines 2026.' },
      { intakeId: intakeMap[scholarshipMap['CIMB ASEAN Scholarship']], versionNum: 1, sourceUrl: 'https://www.cimb.com/en/careers/students/cimb-asean-scholarship.html', evidenceNotes: 'CIMB ASEAN Scholarship official regional prospectus and stage assessment 2026.' },
      { intakeId: intakeMap[scholarshipMap['Yayasan Sarawak Tun Taib Scholarship']], versionNum: 1, sourceUrl: 'https://yayasansarawak.org.my/en/services/scholarship/', evidenceNotes: 'Official Yayasan Sarawak Tun Taib Scholarship gazette and STEM thresholds 2026.' },
    ]).returning();

    const versionMap = Object.fromEntries(insertedVersions.map(v => [v.intakeId, v.id]));

    // 6. Deterministic Requirement AST Rules Creation
    console.log('⚙️ Modeling deterministic AST rules with machine-checkable & non-machine-checkable criteria...');

    // 1. Gamuda
    const gamudaAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 23 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
      ]
    };

    // 2. YBR PPBU
    const ppbuAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 30 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      ]
    };

    // 3. Maxis
    const maxisAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      ]
    };

    // 4. YTM Future Leaders
    const ytmAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
      ]
    };

    // 5. JPA PIDN
    const jpaPidnAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
      ]
    };

    // 6. Khazanah Global
    const khazanahGlobalAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 21 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.75 },
        { type: 'CONDITION', field: 'premier_university_offer', operator: 'EQUALS', value: true },
      ]
    };

    // 7. Khazanah Watan
    const khazanahWatanAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 21 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'leadership_assessment', operator: 'EQUALS', value: true },
      ]
    };

    // 8. PETRONAS PESP
    const petronasPespAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A-' } },
        { type: 'CONDITION', field: 'petronas_assessment_centre', operator: 'EQUALS', value: true },
      ]
    };

    // 9. BNM Kijang
    const bnmKijangAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A+' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Bahasa Melayu', minGrade: 'A' } },
        { type: 'CONDITION', field: 'bnm_assessment_centre', operator: 'EQUALS', value: true },
      ]
    };

    // 10. Yayasan Sime Darby
    const simeDarbyAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'co_curricular_involvement', operator: 'EQUALS', value: true },
      ]
    };

    // 11. Shell Malaysia
    const shellAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 23 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'shell_interview_assessment', operator: 'EQUALS', value: true },
      ]
    };

    // 12. Yayasan Peneraju
    const penerajuAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 25 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      ]
    };

    // 13. BYDPA
    const bydpaAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 35 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.75 },
        { type: 'CONDITION', field: 'research_proposal_defense', operator: 'EQUALS', value: true },
      ]
    };

    // 14. JPA PPN
    const jpaPpnAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A+' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Additional Mathematics', minGrade: 'A+' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Bahasa Melayu', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
      ]
    };

    // 15. Yayasan UEM
    const uemAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
        { type: 'CONDITION', field: 'assessment_centre_uem', operator: 'EQUALS', value: true },
      ]
    };

    // 16. MARA YTP
    const maraYtpAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A-' } },
        { type: 'CONDITION', field: 'mara_assessment_test', operator: 'EQUALS', value: true },
      ]
    };

    // 17. BTAR
    const btarAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'ytar_leadership_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 18. Sarawak Energy
    const sarawakEnergyAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'sarawak_energy_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 19. Penang Future Foundation
    const pffAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 25 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.67 },
        { type: 'CONDITION', field: 'penang_work_commitment', operator: 'EQUALS', value: true },
      ]
    };

    // 20. Kuok Foundation
    const kuokAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'household_income', operator: 'LESS_THAN_OR_EQUAL', value: 5000 },
        { type: 'CONDITION', field: 'financial_need_verification', operator: 'EQUALS', value: true },
      ]
    };

    // 21. Hong Leong Foundation
    const hongLeongAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 24 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'hlf_panel_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 22. Top Glove
    const topGloveAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'top_glove_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 23. AIA Can Excel
    const aiaAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'aia_interview_assessment', operator: 'EQUALS', value: true },
      ]
    };

    // 24. IJM
    const ijmAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.4 },
        { type: 'CONDITION', field: 'ijm_assessment_centre', operator: 'EQUALS', value: true },
      ]
    };

    // 25. Genting Malaysia
    const gentingAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 23 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'genting_panel_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 26. CIMB ASEAN
    const cimbAseanAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 24 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'cimb_assessment_and_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 27. Yayasan Sarawak
    const yayasanSarawakAst: RequirementNode = {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 25 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'yayasan_sarawak_interview', operator: 'EQUALS', value: true },
      ]
    };

    // 7. Insert Requirements
    console.log('✅ Compiling JSONB AST rules into database...');
    await db.insert(requirements).values([
      // Initial 5
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Gamuda Scholarship']]], name: 'Gamuda Eligibility Rules', ruleAst: gamudaAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['PPBU (Pembiayaan Pendidikan Boleh Ubah)']]], name: 'YBR PPBU Rules', ruleAst: ppbuAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Maxis Scholarship Programme']]], name: 'Maxis Rules', ruleAst: maxisAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['YTM Future Leaders Scholarship']]], name: 'YTM Leadership Rules', ruleAst: ytmAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['JPA Program Ijazah Dalam Negara (PIDN)']]], name: 'JPA PIDN Rules', ruleAst: jpaPidnAst },
      // Batch 1 (10)
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Yayasan Khazanah Global Scholarship']]], name: 'Khazanah Global Eligibility Rules', ruleAst: khazanahGlobalAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Yayasan Khazanah Watan Scholarship']]], name: 'Khazanah Watan Eligibility Rules', ruleAst: khazanahWatanAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Petronas Education Sponsorship Programme (PESP)']]], name: 'PETRONAS PESP Eligibility Rules', ruleAst: petronasPespAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Bank Negara Malaysia (BNM) Kijang Scholarship']]], name: 'BNM Kijang Eligibility Rules', ruleAst: bnmKijangAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Yayasan Sime Darby Undergraduate Scholarship']]], name: 'Yayasan Sime Darby Eligibility Rules', ruleAst: simeDarbyAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Shell Malaysia Undergraduate Scholarship']]], name: 'Shell Malaysia Eligibility Rules', ruleAst: shellAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Yayasan Peneraju Pendidikan Bumiputera']]], name: 'Yayasan Peneraju Eligibility Rules', ruleAst: penerajuAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Biasiswa Yang di-Pertuan Agong (BYDPA)']]], name: 'BYDPA Eligibility Rules', ruleAst: bydpaAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['JPA Program Penajaan Nasional (PPN)']]], name: 'JPA PPN Eligibility Rules', ruleAst: jpaPpnAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Yayasan UEM Undergraduate Scholarship']]], name: 'Yayasan UEM Eligibility Rules', ruleAst: uemAst },
      // Batch 2 (12)
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['MARA Young Talent Development Programme (YTP)']]], name: 'MARA YTP Eligibility Rules', ruleAst: maraYtpAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Biasiswa Tunku Abdul Rahman (BTAR)']]], name: 'BTAR Leadership Rules', ruleAst: btarAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Sarawak Energy Scholarship']]], name: 'Sarawak Energy Eligibility Rules', ruleAst: sarawakEnergyAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Penang Future Foundation (PFF) Scholarship']]], name: 'PFF Scholarship Rules', ruleAst: pffAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Kuok Foundation Undergraduate Awards']]], name: 'Kuok Foundation Rules', ruleAst: kuokAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Hong Leong Foundation Undergraduate Scholarship']]], name: 'Hong Leong Foundation Rules', ruleAst: hongLeongAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Top Glove Scholarship']]], name: 'Top Glove Rules', ruleAst: topGloveAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['AIA Can Excel Scholarship']]], name: 'AIA Can Excel Rules', ruleAst: aiaAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['IJM Scholarship Award']]], name: 'IJM Scholarship Rules', ruleAst: ijmAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Genting Malaysia Scholarship']]], name: 'Genting Malaysia Rules', ruleAst: gentingAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['CIMB ASEAN Scholarship']]], name: 'CIMB ASEAN Rules', ruleAst: cimbAseanAst },
      { intakeVersionId: versionMap[intakeMap[scholarshipMap['Yayasan Sarawak Tun Taib Scholarship']]], name: 'Yayasan Sarawak Tun Taib Rules', ruleAst: yayasanSarawakAst },
    ]);

    console.log('🎉 Golden Dataset successfully seeded: 27 verified scholarships, 24 providers, 27 intakes & AST rule sets!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedGoldenDataset();
