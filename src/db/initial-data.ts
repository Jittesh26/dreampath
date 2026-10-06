import { RequirementNode } from '../domain/schema';

export interface ProviderItem {
  id: string;
  name: string;
  description: string;
  url: string;
  createdAt: Date;
}

export interface ScholarshipItem {
  id: string;
  providerId: string;
  name: string;
  description: string;
  createdAt: Date;
}

export interface IntakeItem {
  id: string;
  scholarshipId: string;
  year: number;
  openDate: string;
  closeDate: string;
  status: string;
  createdAt: Date;
}

export interface IntakeVersionItem {
  id: string;
  intakeId: string;
  versionNum: number;
  sourceUrl: string;
  evidenceNotes: string;
  createdAt: Date;
}

export interface RequirementItem {
  id: string;
  intakeVersionId: string;
  name: string;
  ruleAst: RequirementNode;
  createdAt: Date;
}

const p = (num: number) => `10000000-0000-0000-0000-${String(num).padStart(12, '0')}`;
const s = (num: number) => `20000000-0000-0000-0000-${String(num).padStart(12, '0')}`;
const i = (num: number) => `30000000-0000-0000-0000-${String(num).padStart(12, '0')}`;
const v = (num: number) => `40000000-0000-0000-0000-${String(num).padStart(12, '0')}`;
const r = (num: number) => `50000000-0000-0000-0000-${String(num).padStart(12, '0')}`;

const now = new Date('2026-03-01T00:00:00.000Z');

export const initialProviders: ProviderItem[] = [
  { id: p(1), name: 'Gamuda Berhad', description: 'Gamuda is a global engineering, property and infrastructure group spearheading sustainable development and regional engineering excellence.', url: 'https://gamuda.com.my', createdAt: now },
  { id: p(2), name: 'Yayasan Bank Rakyat', description: 'Yayasan Bank Rakyat (YBR) assists underprivileged Malaysians through educational sponsorships, convertible loans, and human capital empowerment.', url: 'https://www.yayasanbankrakyat.com.my', createdAt: now },
  { id: p(3), name: 'Maxis', description: 'Maxis is Malaysias leading communications service provider, championing digital education, STEM talent, and women leadership in technology.', url: 'https://www.maxis.com.my', createdAt: now },
  { id: p(4), name: 'Yayasan TM (YTM)', description: 'Yayasan TM is Telekom Malaysias social impact foundation cultivating future innovators, digital leaders, and technology changemakers.', url: 'https://www.tm.com.my/yayasantm', createdAt: now },
  { id: p(5), name: 'Jabatan Perkhidmatan Awam (JPA)', description: 'The Public Service Department of Malaysia (JPA) governs public service human resource development and sponsors high-achieving scholars locally and abroad.', url: 'https://esilav2.jpa.gov.my', createdAt: now },
  { id: p(6), name: 'Yayasan Khazanah', description: 'Yayasan Khazanah is a premier foundation established by Khazanah Nasional to select, support, and groom exceptional individuals to lead Malaysias top organisations.', url: 'https://www.yayasankhazanah.com.my', createdAt: now },
  { id: p(7), name: 'Petroliam Nasional Berhad (PETRONAS)', description: 'PETRONAS is a global energy and solutions company dedicated to human capital advancement through its longstanding Education Sponsorship Programme.', url: 'https://www.petronas.com', createdAt: now },
  { id: p(8), name: 'Bank Negara Malaysia (BNM)', description: 'The Central Bank of Malaysia awards premier Kijang Scholarships to outstanding youths pursuing foundational, undergraduate, and postgraduate disciplines in economics, finance, and technology.', url: 'https://www.bnm.gov.my', createdAt: now },
  { id: p(9), name: 'Yayasan Sime Darby', description: 'The philanthropic arm of Sime Darby Group dedicated to expanding educational opportunities, environmental sustainability, and youth development for deserving Malaysians.', url: 'https://www.yayasansimedarby.com', createdAt: now },
  { id: p(10), name: 'Shell Malaysia', description: 'Shell Malaysia invests in Malaysias brightest young minds through comprehensive undergraduate scholarships across engineering, geosciences, and digital innovation disciplines.', url: 'https://www.shell.com.my', createdAt: now },
  { id: p(11), name: 'Yayasan Peneraju Pendidikan Bumiputera', description: 'An agency under the Ministry of Economy dedicated to strengthening the academic, vocational, and professional competitiveness of Bumiputera talents.', url: 'https://yayasanpeneraju.com.my', createdAt: now },
  { id: p(12), name: 'Yayasan UEM', description: 'The philanthropic foundation of UEM Group providing full pre-university and undergraduate scholarships for premier engineering, technology, and business education.', url: 'https://www.uem.com.my', createdAt: now },
  { id: p(13), name: 'Majlis Amanah Rakyat (MARA)', description: 'MARA spearheads socio-economic development and human capital sponsorship for Bumiputera scholars through prestigious global and domestic education programs.', url: 'https://www.mara.gov.my', createdAt: now },
  { id: p(14), name: 'Yayasan Tunku Abdul Rahman (YTAR)', description: 'Statutory foundation honoring Malaysias founding father, dedicated to closing education inequality through leadership-focused undergraduate scholarships.', url: 'https://www.yayasantar.org.my', createdAt: now },
  { id: p(15), name: 'Sarawak Energy Berhad', description: 'Sarawak Energy is an energy development company and vertically integrated power utility providing scholarships to build top energy and technical talent in Sarawak.', url: 'https://www.sarawakenergy.com', createdAt: now },
  { id: p(16), name: 'Penang Future Foundation', description: 'A Penang State Government initiative granting scholarships to outstanding Malaysian youths to pursue tertiary STEM and accountancy degrees and build careers in Penang.', url: 'https://www.penangfuturefoundation.my', createdAt: now },
  { id: p(17), name: 'Kuok Foundation Berhad', description: 'Non-profit charitable institution established by the Kuok Family dedicated to alleviating poverty and providing educational study grants and awards to needy students.', url: 'https://www.kuokfoundation.com', createdAt: now },
  { id: p(18), name: 'Hong Leong Foundation', description: 'The philanthropic arm of Hong Leong Group supporting low-income Malaysian students through merit- and needs-based higher education scholarships.', url: 'https://www.hongleongcsr.org', createdAt: now },
  { id: p(19), name: 'Top Glove Corporation Berhad', description: 'The worlds largest manufacturer of gloves empowers future engineering and science leaders through the Top Glove Scholarship programme.', url: 'https://www.topglove.com', createdAt: now },
  { id: p(20), name: 'AIA Malaysia', description: 'Leading insurance and financial services provider fostering top undergraduate talent in Actuarial Science, Data Analytics, and Digital Technologies.', url: 'https://www.aia.com.my', createdAt: now },
  { id: p(21), name: 'IJM Corporation Berhad', description: 'One of Malaysias leading conglomerates providing full undergraduate scholarships in engineering, construction management, quantity surveying, and business.', url: 'https://www.ijm.com', createdAt: now },
  { id: p(22), name: 'Genting Malaysia Berhad', description: 'Major leisure, hospitality, and entertainment corporation offering full academic sponsorship and career tracks for Malaysian university students.', url: 'https://www.gentingmalaysia.com', createdAt: now },
  { id: p(23), name: 'CIMB Foundation', description: 'Regional philanthropic organization promoting intellectual development, cross-border leadership, and ASEAN-wide corporate executive talent.', url: 'https://www.cimb.com', createdAt: now },
  { id: p(24), name: 'Yayasan Sarawak', description: 'State statutory body dedicated to advancing education opportunities, providing premier merit scholarships and loans for Sarawak students.', url: 'https://yayasansarawak.org.my', createdAt: now },
];

export const initialScholarships: ScholarshipItem[] = [
  { id: s(1), providerId: p(1), name: 'Gamuda Scholarship', description: 'Full undergraduate scholarship covering tuition, living allowance, and development programs for Engineering, Built Environment, Software Engineering/IT, and Business disciplines.', createdAt: now },
  { id: s(2), providerId: p(2), name: 'PPBU (Pembiayaan Pendidikan Boleh Ubah)', description: 'Convertible education loan/scholarship providing full tuition support and monthly stipends for undergraduate studies, convertible to full scholarship based on graduation CGPA.', createdAt: now },
  { id: s(3), providerId: p(3), name: 'Maxis Scholarship Programme', description: 'Empowering undergraduate students in STEM, computing, data science, and business with full financial coverage, mentorship, and accelerated employment pathways.', createdAt: now },
  { id: s(4), providerId: p(4), name: 'YTM Future Leaders Scholarship', description: 'Flagship undergraduate scholarship fostering leaders in artificial intelligence, digital infrastructure, telecommunications, and digital marketing with TM corporate development.', createdAt: now },
  { id: s(5), providerId: p(5), name: 'JPA Program Ijazah Dalam Negara (PIDN)', description: 'Federal government sponsorship under JPA for high-achieving undergraduates in public universities (UA) and premier private institutions with federal service employment terms.', createdAt: now },
  { id: s(6), providerId: p(6), name: 'Yayasan Khazanah Global Scholarship', description: 'Full sponsorship for extraordinary Malaysian students to undertake undergraduate studies at the worlds top 10 universities (e.g. Cambridge, Oxford, Harvard, MIT) with executive mentorship and Khazanah employment bond.', createdAt: now },
  { id: s(7), providerId: p(6), name: 'Yayasan Khazanah Watan Scholarship', description: 'Premier national scholarship supporting high-caliber Malaysians pursuing undergraduate degrees at leading local research universities, covering all tuition fees, living allowances, and leadership modules.', createdAt: now },
  { id: s(8), providerId: p(7), name: 'Petronas Education Sponsorship Programme (PESP)', description: 'Prestigious global and domestic sponsorship covering full academic fees, allowances, computing subsidies, and career placement within PETRONAS for engineering, geosciences, and business analytics.', createdAt: now },
  { id: s(9), providerId: p(8), name: 'Bank Negara Malaysia (BNM) Kijang Scholarship', description: 'Elite Central Bank scholarship awarded to outstanding SPM high-achievers for pre-university and degree studies in Economics, Finance, Actuarial Science, Data Science, and Computer Science.', createdAt: now },
  { id: s(10), providerId: p(9), name: 'Yayasan Sime Darby Undergraduate Scholarship', description: 'Full undergraduate funding for students from B40 and M40 backgrounds studying Agriculture, Engineering, and Business at top Malaysian public or private institutions.', createdAt: now },
  { id: s(11), providerId: p(10), name: 'Shell Malaysia Undergraduate Scholarship', description: 'Comprehensive financial sponsorship for engineering, geosciences, and digital undergraduates, paired with structured Shell mentorship, internships, and direct employment considerations.', createdAt: now },
  { id: s(12), providerId: p(11), name: 'Yayasan Peneraju Pendidikan Bumiputera', description: 'Government funding covering full tuition fees and living stipends for Bumiputera students pursuing professional credentials and high-impact degrees in accounting, engineering, and technology.', createdAt: now },
  { id: s(13), providerId: p(5), name: 'Biasiswa Yang di-Pertuan Agong (BYDPA)', description: 'The highest civilian academic scholarship in Malaysia awarded to premier postgraduate scholars pursuing Masters and PhD studies in Science, Technology, Law, and Economics.', createdAt: now },
  { id: s(14), providerId: p(5), name: 'JPA Program Penajaan Nasional (PPN)', description: 'Exclusive JPA sponsorship for Malaysias top 20 national SPM scorers to pursue preparatory and degree studies at the worlds most prestigious Ivy League and Russell Group universities.', createdAt: now },
  { id: s(15), providerId: p(12), name: 'Yayasan UEM Undergraduate Scholarship', description: 'Full sponsorship covering Cambridge A-Levels at KYUEM and overseas undergraduate degrees in Civil/Mechanical Engineering, Data Analytics, Quantity Surveying, and Finance.', createdAt: now },
  { id: s(16), providerId: p(13), name: 'MARA Young Talent Development Programme (YTP)', description: 'Prestigious sponsorship for high-achieving Bumiputera SPM leavers to pursue foundational and degree studies locally and abroad in cutting-edge STEM and professional fields.', createdAt: now },
  { id: s(17), providerId: p(14), name: 'Biasiswa Tunku Abdul Rahman (BTAR)', description: 'Flagship undergraduate award for potential young leaders prioritizing high academic talent from B40/M40 backgrounds, including leadership development and community project grants.', createdAt: now },
  { id: s(18), providerId: p(15), name: 'Sarawak Energy Scholarship', description: 'Full educational sponsorship covering tuition fees, books, and living expenses for Sarawakian youths pursuing engineering, IT, and commercial degrees with Sarawak Energy.', createdAt: now },
  { id: s(19), providerId: p(16), name: 'Penang Future Foundation (PFF) Scholarship', description: 'Penang State Government scholarship granting full tuition and monthly allowances to high-achieving undergraduates committed to working in Penangs vibrant industrial ecosystem.', createdAt: now },
  { id: s(20), providerId: p(17), name: 'Kuok Foundation Undergraduate Awards', description: 'Financial study awards and grants covering tuition fees and living allowances for needy Malaysian undergraduates enrolled in public universities in Malaysia and Singapore.', createdAt: now },
  { id: s(21), providerId: p(18), name: 'Hong Leong Foundation Undergraduate Scholarship', description: 'Merit- and need-based undergraduate funding empowering Malaysian students from low-income households pursuing diploma and degree courses at local universities.', createdAt: now },
  { id: s(22), providerId: p(19), name: 'Top Glove Scholarship', description: 'Full financial sponsorship and fast-track engineering career placement at Top Glove for students pursuing Mechanical, Chemical, Electrical Engineering, and Computer Science.', createdAt: now },
  { id: s(23), providerId: p(20), name: 'AIA Can Excel Scholarship', description: 'Undergraduate scholarship providing tuition coverage, living stipends, and internship placement in Actuarial Science, Data Analytics, and Computer Science at AIA Malaysia.', createdAt: now },
  { id: s(24), providerId: p(21), name: 'IJM Scholarship Award', description: 'Comprehensive scholarship offering tuition, living assistance, and guaranteed career placement within IJM Group for Civil Engineering, Quantity Surveying, and Construction disciplines.', createdAt: now },
  { id: s(25), providerId: p(22), name: 'Genting Malaysia Scholarship', description: 'Full academic support and leadership mentorship for Malaysian undergraduates in Hospitality, Tourism Management, Mechanical/Electrical Engineering, and Information Technology.', createdAt: now },
  { id: s(26), providerId: p(23), name: 'CIMB ASEAN Scholarship', description: 'Prestigious regional scholarship granting full undergraduate tuition, accommodation, living stipends, and executive mentorship across top global universities for future ASEAN leaders.', createdAt: now },
  { id: s(27), providerId: p(24), name: 'Yayasan Sarawak Tun Taib Scholarship', description: 'The highest academic merit award by Yayasan Sarawak supporting top Sarawakian scholars pursuing STEM undergraduate and postgraduate programs locally and abroad.', createdAt: now },
];

export const initialIntakes: IntakeItem[] = [
  { id: i(1), scholarshipId: s(1), year: 2026, openDate: '2026-03-01', closeDate: '2026-10-31', status: 'published', createdAt: now },
  { id: i(2), scholarshipId: s(2), year: 2026, openDate: '2026-02-15', closeDate: '2026-11-15', status: 'published', createdAt: now },
  { id: i(3), scholarshipId: s(3), year: 2026, openDate: '2026-05-01', closeDate: '2026-11-30', status: 'published', createdAt: now },
  { id: i(4), scholarshipId: s(4), year: 2026, openDate: '2026-04-01', closeDate: '2026-10-15', status: 'published', createdAt: now },
  { id: i(5), scholarshipId: s(5), year: 2026, openDate: '2026-01-01', closeDate: '2026-12-31', status: 'published', createdAt: now },
  { id: i(6), scholarshipId: s(6), year: 2026, openDate: '2026-03-01', closeDate: '2026-07-31', status: 'published', createdAt: now },
  { id: i(7), scholarshipId: s(7), year: 2026, openDate: '2026-03-01', closeDate: '2026-08-15', status: 'published', createdAt: now },
  { id: i(8), scholarshipId: s(8), year: 2026, openDate: '2026-03-15', closeDate: '2026-06-30', status: 'published', createdAt: now },
  { id: i(9), scholarshipId: s(9), year: 2026, openDate: '2026-03-15', closeDate: '2026-06-15', status: 'published', createdAt: now },
  { id: i(10), scholarshipId: s(10), year: 2026, openDate: '2026-04-01', closeDate: '2026-09-30', status: 'published', createdAt: now },
  { id: i(11), scholarshipId: s(11), year: 2026, openDate: '2026-05-01', closeDate: '2026-08-31', status: 'published', createdAt: now },
  { id: i(12), scholarshipId: s(12), year: 2026, openDate: '2026-02-01', closeDate: '2026-11-30', status: 'published', createdAt: now },
  { id: i(13), scholarshipId: s(13), year: 2026, openDate: '2026-01-15', closeDate: '2026-05-31', status: 'published', createdAt: now },
  { id: i(14), scholarshipId: s(14), year: 2026, openDate: '2026-03-15', closeDate: '2026-06-30', status: 'published', createdAt: now },
  { id: i(15), scholarshipId: s(15), year: 2026, openDate: '2026-03-10', closeDate: '2026-07-15', status: 'published', createdAt: now },
  { id: i(16), scholarshipId: s(16), year: 2026, openDate: '2026-03-01', closeDate: '2026-06-30', status: 'published', createdAt: now },
  { id: i(17), scholarshipId: s(17), year: 2026, openDate: '2026-02-15', closeDate: '2026-06-15', status: 'published', createdAt: now },
  { id: i(18), scholarshipId: s(18), year: 2026, openDate: '2026-03-01', closeDate: '2026-07-31', status: 'published', createdAt: now },
  { id: i(19), scholarshipId: s(19), year: 2026, openDate: '2026-04-01', closeDate: '2026-08-31', status: 'published', createdAt: now },
  { id: i(20), scholarshipId: s(20), year: 2026, openDate: '2026-02-01', closeDate: '2026-06-30', status: 'published', createdAt: now },
  { id: i(21), scholarshipId: s(21), year: 2026, openDate: '2026-04-15', closeDate: '2026-07-31', status: 'published', createdAt: now },
  { id: i(22), scholarshipId: s(22), year: 2026, openDate: '2026-03-01', closeDate: '2026-09-30', status: 'published', createdAt: now },
  { id: i(23), scholarshipId: s(23), year: 2026, openDate: '2026-05-01', closeDate: '2026-08-15', status: 'published', createdAt: now },
  { id: i(24), scholarshipId: s(24), year: 2026, openDate: '2026-04-01', closeDate: '2026-07-15', status: 'published', createdAt: now },
  { id: i(25), scholarshipId: s(25), year: 2026, openDate: '2026-03-15', closeDate: '2026-08-31', status: 'published', createdAt: now },
  { id: i(26), scholarshipId: s(26), year: 2026, openDate: '2026-03-01', closeDate: '2026-06-15', status: 'published', createdAt: now },
  { id: i(27), scholarshipId: s(27), year: 2026, openDate: '2026-02-01', closeDate: '2026-07-31', status: 'published', createdAt: now },
];

export const initialIntakeVersions: IntakeVersionItem[] = [
  { id: v(1), intakeId: i(1), versionNum: 1, sourceUrl: 'https://gamuda.com.my/sustainability-esg/yayasan-gamuda/gamuda-scholarship/', evidenceNotes: 'Official 2026 Gamuda Scholarship framework.', createdAt: now },
  { id: v(2), intakeId: i(2), versionNum: 1, sourceUrl: 'https://www.yayasanbankrakyat.com.my/index.php/ppbu', evidenceNotes: 'Official YBR PPBU eligibility and conversion schedule 2026.', createdAt: now },
  { id: v(3), intakeId: i(3), versionNum: 1, sourceUrl: 'https://www.maxis.com.my/en/about-maxis/maxis-scholarship-programme/', evidenceNotes: 'Maxis corporate talent guidelines 2026.', createdAt: now },
  { id: v(4), intakeId: i(4), versionNum: 1, sourceUrl: 'https://www.tm.com.my/yayasantm/scholarship', evidenceNotes: 'Yayasan TM Future Leaders official prospectus 2026.', createdAt: now },
  { id: v(5), intakeId: i(5), versionNum: 1, sourceUrl: 'https://esilav2.jpa.gov.my/', evidenceNotes: 'JPA eSila Portal PIDN 2026 circular.', createdAt: now },
  { id: v(6), intakeId: i(6), versionNum: 1, sourceUrl: 'https://www.yayasankhazanah.com.my/scholarship-programmes/khazanah-global-scholarship', evidenceNotes: 'Official 2026 Yayasan Khazanah Global brochure and minimum criteria.', createdAt: now },
  { id: v(7), intakeId: i(7), versionNum: 1, sourceUrl: 'https://www.yayasankhazanah.com.my/scholarship-programmes/khazanah-watan-scholarship', evidenceNotes: 'Official 2026 Yayasan Khazanah Watan guidelines for local research universities.', createdAt: now },
  { id: v(8), intakeId: i(8), versionNum: 1, sourceUrl: 'https://www.petronas.com/careers/students-graduates/pesp', evidenceNotes: 'Official PETRONAS PESP sponsorship requirements and SPM criteria 2026.', createdAt: now },
  { id: v(9), intakeId: i(9), versionNum: 1, sourceUrl: 'https://www.bnm.gov.my/careers/scholarships', evidenceNotes: 'Bank Negara Malaysia Kijang Scholarship official circular 2026.', createdAt: now },
  { id: v(10), intakeId: i(10), versionNum: 1, sourceUrl: 'https://www.yayasansimedarby.com/scholarship/scholarship-programmes', evidenceNotes: 'Yayasan Sime Darby undergraduate scholarship terms & B40/M40 priority rules.', createdAt: now },
  { id: v(11), intakeId: i(11), versionNum: 1, sourceUrl: 'https://www.shell.com.my/careers/students-and-graduates/scholarships.html', evidenceNotes: 'Official Shell Malaysia scholarship prerequisites and university criteria 2026.', createdAt: now },
  { id: v(12), intakeId: i(12), versionNum: 1, sourceUrl: 'https://yayasanpeneraju.com.my/program/peneraju-profesional/', evidenceNotes: 'Yayasan Peneraju official brochure and Bumiputera eligibility terms 2026.', createdAt: now },
  { id: v(13), intakeId: i(13), versionNum: 1, sourceUrl: 'https://esilav2.jpa.gov.my/esila_bia/maklumat_biasiswa/bydpa', evidenceNotes: 'JPA official gazette for Biasiswa Yang di-Pertuan Agong (BYDPA) 2026.', createdAt: now },
  { id: v(14), intakeId: i(14), versionNum: 1, sourceUrl: 'https://esilav2.jpa.gov.my/esila_bia/maklumat_biasiswa/ppn', evidenceNotes: 'JPA official Program Penajaan Nasional (PPN) top achievers guidelines 2026.', createdAt: now },
  { id: v(15), intakeId: i(15), versionNum: 1, sourceUrl: 'https://www.uem.com.my/yayasanuem/scholarships/', evidenceNotes: 'Yayasan UEM official scholarship criteria and KYUEM pre-university path 2026.', createdAt: now },
  { id: v(16), intakeId: i(16), versionNum: 1, sourceUrl: 'https://www.mara.gov.my/en/young-talent-development-programme-ytp/', evidenceNotes: 'Official MARA YTP prospectus and SPM academic thresholds 2026.', createdAt: now },
  { id: v(17), intakeId: i(17), versionNum: 1, sourceUrl: 'https://www.yayasantar.org.my/biasiswa-tunku-abdul-rahman/', evidenceNotes: 'Yayasan Tunku Abdul Rahman official BTAR eligibility and leadership criteria 2026.', createdAt: now },
  { id: v(18), intakeId: i(18), versionNum: 1, sourceUrl: 'https://www.sarawakenergy.com/careers/scholarship-programme', evidenceNotes: 'Official Sarawak Energy scholarship criteria for engineering and business students 2026.', createdAt: now },
  { id: v(19), intakeId: i(19), versionNum: 1, sourceUrl: 'https://www.penangfuturefoundation.my/scholarship/', evidenceNotes: 'Penang Future Foundation official criteria, minimum CGPA 3.67, and Penang bond terms 2026.', createdAt: now },
  { id: v(20), intakeId: i(20), versionNum: 1, sourceUrl: 'https://www.kuokfoundation.com/study-awards/', evidenceNotes: 'Kuok Foundation study awards guidelines and income thresholds 2026.', createdAt: now },
  { id: v(21), intakeId: i(21), versionNum: 1, sourceUrl: 'https://www.hongleongcsr.org/undergraduate-scholarship/', evidenceNotes: 'Hong Leong Foundation official scholarship criteria and interview framework 2026.', createdAt: now },
  { id: v(22), intakeId: i(22), versionNum: 1, sourceUrl: 'https://www.topglove.com/scholarship', evidenceNotes: 'Top Glove Foundation scholarship application criteria 2026.', createdAt: now },
  { id: v(23), intakeId: i(23), versionNum: 1, sourceUrl: 'https://www.aia.com.my/en/about-aia/careers/scholarship.html', evidenceNotes: 'AIA Malaysia Can Excel scholarship terms and STEM eligibility 2026.', createdAt: now },
  { id: v(24), intakeId: i(24), versionNum: 1, sourceUrl: 'https://www.ijm.com/careers/scholarship', evidenceNotes: 'IJM Corporation official scholarship terms and career placement framework 2026.', createdAt: now },
  { id: v(25), intakeId: i(25), versionNum: 1, sourceUrl: 'https://www.gentingmalaysia.com/careers/scholarship/', evidenceNotes: 'Genting Malaysia official scholarship criteria and study disciplines 2026.', createdAt: now },
  { id: v(26), intakeId: i(26), versionNum: 1, sourceUrl: 'https://www.cimb.com/en/careers/students/cimb-asean-scholarship.html', evidenceNotes: 'CIMB ASEAN Scholarship official regional prospectus and stage assessment 2026.', createdAt: now },
  { id: v(27), intakeId: i(27), versionNum: 1, sourceUrl: 'https://yayasansarawak.org.my/en/services/scholarship/', evidenceNotes: 'Official Yayasan Sarawak Tun Taib Scholarship gazette and STEM thresholds 2026.', createdAt: now },
];

export const initialRequirements: RequirementItem[] = [
  {
    id: r(1),
    intakeVersionId: v(1),
    name: 'Gamuda Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 23 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
      ]
    },
    createdAt: now
  },
  {
    id: r(2),
    intakeVersionId: v(2),
    name: 'YBR PPBU Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 30 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      ]
    },
    createdAt: now
  },
  {
    id: r(3),
    intakeVersionId: v(3),
    name: 'Maxis Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      ]
    },
    createdAt: now
  },
  {
    id: r(4),
    intakeVersionId: v(4),
    name: 'YTM Leadership Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
      ]
    },
    createdAt: now
  },
  {
    id: r(5),
    intakeVersionId: v(5),
    name: 'JPA PIDN Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
      ]
    },
    createdAt: now
  },
  {
    id: r(6),
    intakeVersionId: v(6),
    name: 'Khazanah Global Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 21 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.75 },
        { type: 'CONDITION', field: 'premier_university_offer', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(7),
    intakeVersionId: v(7),
    name: 'Khazanah Watan Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 21 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'leadership_assessment', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(8),
    intakeVersionId: v(8),
    name: 'PETRONAS PESP Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A-' } },
        { type: 'CONDITION', field: 'petronas_assessment_centre', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(9),
    intakeVersionId: v(9),
    name: 'BNM Kijang Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A+' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Bahasa Melayu', minGrade: 'A' } },
        { type: 'CONDITION', field: 'bnm_assessment_centre', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(10),
    intakeVersionId: v(10),
    name: 'Yayasan Sime Darby Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'co_curricular_involvement', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(11),
    intakeVersionId: v(11),
    name: 'Shell Malaysia Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 23 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'shell_interview_assessment', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(12),
    intakeVersionId: v(12),
    name: 'Yayasan Peneraju Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 25 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
      ]
    },
    createdAt: now
  },
  {
    id: r(13),
    intakeVersionId: v(13),
    name: 'BYDPA Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 35 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.75 },
        { type: 'CONDITION', field: 'research_proposal_defense', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(14),
    intakeVersionId: v(14),
    name: 'JPA PPN Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A+' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Additional Mathematics', minGrade: 'A+' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Bahasa Melayu', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
      ]
    },
    createdAt: now
  },
  {
    id: r(15),
    intakeVersionId: v(15),
    name: 'Yayasan UEM Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A' } },
        { type: 'CONDITION', field: 'assessment_centre_uem', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(16),
    intakeVersionId: v(16),
    name: 'MARA YTP Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'bumiputera_status', operator: 'EQUALS', value: true },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 19 },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'Mathematics', minGrade: 'A' } },
        { type: 'CONDITION', field: 'spm_results', operator: 'HAS_SPM_SUBJECT_GRADE', value: { subject: 'English', minGrade: 'A-' } },
        { type: 'CONDITION', field: 'mara_assessment_test', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(17),
    intakeVersionId: v(17),
    name: 'BTAR Leadership Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'ytar_leadership_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(18),
    intakeVersionId: v(18),
    name: 'Sarawak Energy Eligibility Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'sarawak_energy_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(19),
    intakeVersionId: v(19),
    name: 'PFF Scholarship Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 25 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.67 },
        { type: 'CONDITION', field: 'penang_work_commitment', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(20),
    intakeVersionId: v(20),
    name: 'Kuok Foundation Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.0 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'household_income', operator: 'LESS_THAN_OR_EQUAL', value: 5000 },
        { type: 'CONDITION', field: 'financial_need_verification', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(21),
    intakeVersionId: v(21),
    name: 'Hong Leong Foundation Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 24 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'income_band', operator: 'IN_ARRAY', value: ['B40', 'M40'] },
        { type: 'CONDITION', field: 'hlf_panel_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(22),
    intakeVersionId: v(22),
    name: 'Top Glove Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'top_glove_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(23),
    intakeVersionId: v(23),
    name: 'AIA Can Excel Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 22 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'aia_interview_assessment', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(24),
    intakeVersionId: v(24),
    name: 'IJM Scholarship Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.4 },
        { type: 'CONDITION', field: 'ijm_assessment_centre', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(25),
    intakeVersionId: v(25),
    name: 'Genting Malaysia Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 23 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.3 },
        { type: 'CONDITION', field: 'genting_panel_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(26),
    intakeVersionId: v(26),
    name: 'CIMB ASEAN Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 24 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'cimb_assessment_and_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
  {
    id: r(27),
    intakeVersionId: v(27),
    name: 'Yayasan Sarawak Tun Taib Rules',
    ruleAst: {
      type: 'ALL',
      nodes: [
        { type: 'CONDITION', field: 'citizenship', operator: 'EQUALS', value: 'Malaysian' },
        { type: 'CONDITION', field: 'age', operator: 'LESS_THAN_OR_EQUAL', value: 25 },
        { type: 'CONDITION', field: 'cgpa', operator: 'GREATER_THAN_OR_EQUAL', value: 3.5 },
        { type: 'CONDITION', field: 'yayasan_sarawak_interview', operator: 'EQUALS', value: true },
      ]
    },
    createdAt: now
  },
];

export const initialUsers = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'student@dreampath.my',
    role: 'student',
    createdAt: now,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'admin@dreampath.my',
    role: 'admin',
    createdAt: now,
  },
  {
    id: '981a3c44-aa33-4747-a846-24e30cc96f84',
    email: 'jitteshamaran26@gmail.com',
    role: 'admin',
    createdAt: now,
  },
];

export const initialStudentProfiles = [
  {
    userId: '00000000-0000-0000-0000-000000000001',
    citizenship: 'Malaysian',
    bumiputeraStatus: true,
    incomeBand: 'B40',
    householdIncome: 3500,
    cgpa: '3.65',
    spmResults: {
      'Mathematics': 'A+',
      'Additional Mathematics': 'A',
      'Bahasa Melayu': 'A',
      'English': 'A',
    },
    createdAt: now,
    updatedAt: now,
  },
];
