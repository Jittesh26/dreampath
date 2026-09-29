import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { ResumeContent } from '@/domain/resume';

const styles = StyleSheet.create({
  page: {
    size: 'A4',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.35,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  // Header Section
  header: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderBottomStyle: 'solid',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
    letterSpacing: -0.2,
  },
  titleTag: {
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#2563EB',
    marginTop: 2,
    fontWeight: 'normal',
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 8,
  },
  contactPill: {
    fontSize: 8,
    color: '#475569',
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  summary: {
    marginTop: 6,
    fontSize: 8.5,
    color: '#334155',
    lineHeight: 1.3,
  },
  // Section Headings (Modern Tech styling with accent line)
  section: {
    marginTop: 8,
    marginBottom: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginRight: 8,
  },
  sectionDivider: {
    flex: 1,
    height: 0.75,
    backgroundColor: '#E2E8F0',
  },
  // Entries with wrap={false}
  entry: {
    marginBottom: 6,
  },
  entryRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  entryTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  entryCompany: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#2563EB',
  },
  entryMeta: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'right',
  },
  entryDescription: {
    fontSize: 8.5,
    color: '#334155',
    marginTop: 2,
  },
  // Tech Pills / Chips
  techPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 3,
    marginBottom: 2,
  },
  techPill: {
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
  },
  // Bullets
  bulletList: {
    marginTop: 2,
    paddingLeft: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
  },
  bulletMarker: {
    width: 8,
    fontSize: 7.5,
    color: '#2563EB',
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    color: '#334155',
    lineHeight: 1.25,
  },
  // Education & SPM
  degreeBadge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
    backgroundColor: '#EFF6FF',
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  spmContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
    padding: 3,
    backgroundColor: '#F8FAFC',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  spmChip: {
    width: '33.33%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 6,
    paddingVertical: 1,
    fontSize: 7.5,
  },
  spmSubject: {
    color: '#475569',
  },
  spmGrade: {
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
  },
  // Skills Category Table
  skillCategoryRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  skillCategoryTitle: {
    width: 95,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
  },
  skillPillGroup: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  skillChip: {
    fontSize: 8,
    color: '#334155',
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
});

export function ModernTechTemplate({ content }: { content: ResumeContent }) {
  const p = content.personal;
  const education = content.education || [];
  const experience = content.experience || [];
  const projects = content.projects || [];
  const leadership = content.leadership || [];
  const volunteering = content.volunteering || [];
  const awards = content.awards || [];
  const scholarships = content.scholarships || [];
  const certifications = content.certifications || [];
  const skills = content.skills;

  // Build contact details row
  const contacts: { label: string; value: string }[] = [];
  if (p?.email) contacts.push({ label: 'Email', value: p.email });
  if (p?.phone) contacts.push({ label: 'Phone', value: p.phone });
  if (p?.location) contacts.push({ label: 'Location', value: p.location });
  if (p?.github) contacts.push({ label: 'GitHub', value: p.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'github.com/') });
  if (p?.linkedin) contacts.push({ label: 'LinkedIn', value: p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'linkedin.com/in/') });
  if (p?.portfolio) contacts.push({ label: 'Portfolio', value: p.portfolio.replace(/^https?:\/\//, '') });

  return (
    <Document title={`${p?.fullName || 'Candidate'}_Resume_ModernTech`} author="DreamPath">
      <Page size="A4" style={styles.page}>
        {/* Modern Tech Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.name}>{p?.fullName || 'Full Name'}</Text>
              {education[0]?.qualification && (
                <Text style={styles.titleTag}>
                  {education[0].qualification} {education[0].fieldOfStudy ? `• ${education[0].fieldOfStudy}` : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Contact Pills */}
          <View style={styles.contactGrid}>
            {contacts.map((item, idx) => (
              <Text key={idx} style={styles.contactPill}>
                {item.value}
              </Text>
            ))}
          </View>

          {p?.professionalSummary ? (
            <Text style={styles.summary}>{p.professionalSummary}</Text>
          ) : null}
        </View>

        {/* Skills & Technologies (Placed up front for Tech ATS & Reviewers) */}
        {skills && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Technical Expertise</Text>
              <View style={styles.sectionDivider} />
            </View>

            {skills.technical && skills.technical.length > 0 && (
              <View style={styles.skillCategoryRow}>
                <Text style={styles.skillCategoryTitle}>Technical Skills:</Text>
                <View style={styles.skillPillGroup}>
                  {skills.technical.map((tech, idx) => (
                    <Text key={idx} style={styles.skillChip}>{tech}</Text>
                  ))}
                </View>
              </View>
            )}

            {skills.languages && skills.languages.length > 0 && (
              <View style={styles.skillCategoryRow}>
                <Text style={styles.skillCategoryTitle}>Languages:</Text>
                <View style={styles.skillPillGroup}>
                  {skills.languages.map((lang, idx) => (
                    <Text key={idx} style={styles.skillChip}>{lang}</Text>
                  ))}
                </View>
              </View>
            )}

            {skills.soft && skills.soft.length > 0 && (
              <View style={styles.skillCategoryRow}>
                <Text style={styles.skillCategoryTitle}>Competencies:</Text>
                <View style={styles.skillPillGroup}>
                  {skills.soft.map((soft, idx) => (
                    <Text key={idx} style={styles.skillChip}>{soft}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Technical & Applied Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Projects</Text>
              <View style={styles.sectionDivider} />
            </View>

            {projects.map(proj => (
              <View key={proj.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>
                    {proj.name} {proj.role ? `• ${proj.role}` : ''}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {[proj.startDate, proj.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>

                {/* Tech Chips */}
                {proj.technologies && proj.technologies.length > 0 && (
                  <View style={styles.techPillsRow}>
                    {proj.technologies.map((t, tIdx) => (
                      <Text key={tIdx} style={styles.techPill}>{t}</Text>
                    ))}
                  </View>
                )}

                {proj.description ? (
                  <Text style={styles.entryDescription}>{proj.description}</Text>
                ) : null}

                {proj.achievements && proj.achievements.length > 0 && (
                  <View style={styles.bulletList}>
                    {proj.achievements.map((ach, aIdx) => (
                      <View key={aIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletMarker}>▸</Text>
                        <Text style={styles.bulletText}>{ach}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Experience & Internships */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Work & Engineering Experience</Text>
              <View style={styles.sectionDivider} />
            </View>

            {experience.map(exp => (
              <View key={exp.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>{exp.position}</Text>
                  <Text style={styles.entryMeta}>
                    {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>

                <View style={styles.entryRowMain}>
                  <Text style={styles.entryCompany}>{exp.employer}</Text>
                  {exp.location ? <Text style={styles.entryMeta}>{exp.location}</Text> : null}
                </View>

                {exp.description ? (
                  <Text style={styles.entryDescription}>{exp.description}</Text>
                ) : null}

                {exp.achievements && exp.achievements.length > 0 && (
                  <View style={styles.bulletList}>
                    {exp.achievements.map((ach, aIdx) => (
                      <View key={aIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletMarker}>▸</Text>
                        <Text style={styles.bulletText}>{ach}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Education & Academic Background */}
        {education.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Education & Academic Credentials</Text>
              <View style={styles.sectionDivider} />
            </View>

            {education.map(edu => (
              <View key={edu.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>
                    {edu.qualification} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>

                <View style={styles.entryRowMain}>
                  <Text style={styles.entryCompany}>{edu.institution}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {edu.educationLevel && (
                      <Text style={styles.degreeBadge}>{edu.educationLevel}</Text>
                    )}
                    {edu.cgpa && (
                      <Text style={styles.degreeBadge}>CGPA: {edu.cgpa}</Text>
                    )}
                  </View>
                </View>

                {/* SPM Grade Matrix */}
                {edu.spmSubjects && edu.spmSubjects.length > 0 && (
                  <View style={styles.spmContainer}>
                    {edu.spmSubjects.map((sub, sIdx) => (
                      <View key={sIdx} style={styles.spmChip}>
                        <Text style={styles.spmSubject}>{sub.subject}</Text>
                        <Text style={styles.spmGrade}>{sub.grade}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Leadership & Activities */}
        {(leadership.length > 0 || volunteering.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Leadership & Activities</Text>
              <View style={styles.sectionDivider} />
            </View>

            {leadership.map(lead => (
              <View key={lead.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>{lead.role}</Text>
                  <Text style={styles.entryMeta}>
                    {[lead.startDate, lead.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <Text style={styles.entryCompany}>{lead.organization}</Text>
                {lead.description ? (
                  <Text style={styles.entryDescription}>{lead.description}</Text>
                ) : null}
              </View>
            ))}

            {volunteering.map(vol => (
              <View key={vol.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>{vol.role}</Text>
                  <Text style={styles.entryMeta}>
                    {[vol.startDate, vol.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <Text style={styles.entryCompany}>{vol.organization}</Text>
                {vol.description ? (
                  <Text style={styles.entryDescription}>{vol.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Honors, Awards & Scholarships */}
        {(scholarships.length > 0 || awards.length > 0 || certifications.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Honors & Certifications</Text>
              <View style={styles.sectionDivider} />
            </View>

            {scholarships.map(sch => (
              <View key={sch.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>{sch.name}</Text>
                  {sch.year ? <Text style={styles.entryMeta}>{sch.year}</Text> : null}
                </View>
                {sch.issuer ? <Text style={styles.entryCompany}>{sch.issuer}</Text> : null}
                {sch.description ? (
                  <Text style={styles.entryDescription}>{sch.description}</Text>
                ) : null}
              </View>
            ))}

            {awards.map(aw => (
              <View key={aw.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>{aw.name}</Text>
                  {aw.date ? <Text style={styles.entryMeta}>{aw.date}</Text> : null}
                </View>
                {aw.issuer ? <Text style={styles.entryCompany}>{aw.issuer}</Text> : null}
                {aw.description ? (
                  <Text style={styles.entryDescription}>{aw.description}</Text>
                ) : null}
              </View>
            ))}

            {certifications.map(cert => (
              <View key={cert.id} wrap={false} style={styles.entry}>
                <View style={styles.entryRowMain}>
                  <Text style={styles.entryTitle}>{cert.name}</Text>
                  {cert.date ? <Text style={styles.entryMeta}>{cert.date}</Text> : null}
                </View>
                <Text style={styles.entryCompany}>{cert.issuer}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
