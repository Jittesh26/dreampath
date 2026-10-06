import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { ResumeContent, formatEducationBadge } from '@/domain/resume';

const styles = StyleSheet.create({
  page: {
    size: 'A4',
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    lineHeight: 1.4,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  // Header Section
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0B1B3D',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    fontSize: 8.5,
    color: '#475569',
    marginTop: 2,
  },
  contactItem: {
    marginRight: 6,
  },
  bullet: {
    marginRight: 6,
    color: '#94A3B8',
  },
  summary: {
    marginTop: 6,
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.35,
  },
  // Section Headings
  section: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    borderBottomWidth: 0.75,
    borderBottomColor: '#CBD5E1',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 6,
  },
  // Entry Blocks (wrap={false} prevents page-break slicing)
  entry: {
    marginBottom: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  entryTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  entrySubtitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#334155',
  },
  entryDates: {
    fontSize: 8.5,
    color: '#64748B',
    textAlign: 'right',
  },
  entryDescription: {
    fontSize: 9,
    color: '#334155',
    marginTop: 2,
  },
  badgeText: {
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
    fontSize: 8.5,
  },
  // Bullet achievements
  bulletList: {
    marginTop: 2,
    paddingLeft: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 1.5,
  },
  bulletSymbol: {
    width: 8,
    fontSize: 8,
    color: '#0B1B3D',
  },
  bulletContent: {
    flex: 1,
    fontSize: 8.8,
    color: '#334155',
    lineHeight: 1.3,
  },
  // Skills grid / list
  skillsRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  skillsLabel: {
    width: 90,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
  },
  skillsContent: {
    flex: 1,
    fontSize: 9,
    color: '#334155',
  },
  // SPM Subjects grid
  spmGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
    padding: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 2,
  },
  spmItem: {
    width: '33.33%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 6,
    paddingVertical: 1,
    fontSize: 8,
  },
  spmSubject: {
    color: '#475569',
  },
  spmGrade: {
    fontFamily: 'Helvetica-Bold',
    color: '#0B1B3D',
  },
});

export function StandardAcademicTemplate({ content }: { content: ResumeContent }) {
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
  const contacts: string[] = [];
  if (p?.email) contacts.push(p.email);
  if (p?.phone) contacts.push(p.phone);
  if (p?.location) contacts.push(p.location);
  if (p?.linkedin) contacts.push(p.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'linkedin.com/in/'));
  if (p?.github) contacts.push(p.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'github.com/'));
  if (p?.portfolio) contacts.push(p.portfolio.replace(/^https?:\/\//, ''));

  return (
    <Document title={`${p?.fullName || 'Student'}_Resume`} author="DreamPath">
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.name}>{p?.fullName || 'Full Name'}</Text>
          <View style={styles.contactRow}>
            {contacts.map((item, idx) => (
              <React.Fragment key={idx}>
                <Text style={styles.contactItem}>{item}</Text>
                {idx < contacts.length - 1 && <Text style={styles.bullet}>•</Text>}
              </React.Fragment>
            ))}
          </View>
          {p?.professionalSummary ? (
            <Text style={styles.summary}>{p.professionalSummary}</Text>
          ) : null}
        </View>

        {/* Education (Crucial for Malaysian Scholarship/Academic ATS) */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education & Academic Credentials</Text>
            {education.map(edu => (
              <View key={edu.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {edu.qualification}
                    {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                  </Text>
                  <Text style={styles.entryDates}>
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <View style={styles.entryHeader}>
                  <Text style={styles.entrySubtitle}>{edu.institution}</Text>
                  <Text style={styles.badgeText}>
                    {formatEducationBadge(edu)}
                  </Text>
                </View>

                {/* SPM Specific Subjects Grid if recorded */}
                {edu.spmSubjects && edu.spmSubjects.length > 0 && (
                  <View style={styles.spmGrid}>
                    {edu.spmSubjects.map((sub, sIdx) => (
                      <View key={sIdx} style={styles.spmItem}>
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

        {/* Experience & Internships */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work & Internship Experience</Text>
            {experience.map(exp => (
              <View key={exp.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{exp.position}</Text>
                  <Text style={styles.entryDates}>
                    {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <View style={styles.entryHeader}>
                  <Text style={styles.entrySubtitle}>
                    {exp.employer}
                    {exp.location ? `, ${exp.location}` : ''}
                  </Text>
                </View>
                {exp.description ? (
                  <Text style={styles.entryDescription}>{exp.description}</Text>
                ) : null}
                {exp.achievements && exp.achievements.length > 0 && (
                  <View style={styles.bulletList}>
                    {exp.achievements.map((ach, aIdx) => (
                      <View key={aIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletSymbol}>•</Text>
                        <Text style={styles.bulletContent}>{ach}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Academic & Personal Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Projects</Text>
            {projects.map(proj => (
              <View key={proj.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {proj.name}
                    {proj.role ? ` (${proj.role})` : ''}
                  </Text>
                  <Text style={styles.entryDates}>
                    {[proj.startDate, proj.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                {proj.technologies && proj.technologies.length > 0 && (
                  <Text style={styles.entrySubtitle}>
                    Technologies: {proj.technologies.join(', ')}
                  </Text>
                )}
                {proj.description ? (
                  <Text style={styles.entryDescription}>{proj.description}</Text>
                ) : null}
                {proj.achievements && proj.achievements.length > 0 && (
                  <View style={styles.bulletList}>
                    {proj.achievements.map((ach, aIdx) => (
                      <View key={aIdx} style={styles.bulletRow}>
                        <Text style={styles.bulletSymbol}>•</Text>
                        <Text style={styles.bulletContent}>{ach}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Leadership & Co-Curricular (High weighting in Malaysian scholarships) */}
        {(leadership.length > 0 || volunteering.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leadership & Extracurricular Activities</Text>
            {leadership.map(lead => (
              <View key={lead.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{lead.role}</Text>
                  <Text style={styles.entryDates}>
                    {[lead.startDate, lead.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <Text style={styles.entrySubtitle}>{lead.organization}</Text>
                {lead.description ? (
                  <Text style={styles.entryDescription}>{lead.description}</Text>
                ) : null}
              </View>
            ))}
            {volunteering.map(vol => (
              <View key={vol.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{vol.role}</Text>
                  <Text style={styles.entryDates}>
                    {[vol.startDate, vol.endDate].filter(Boolean).join(' – ')}
                  </Text>
                </View>
                <Text style={styles.entrySubtitle}>{vol.organization}</Text>
                {vol.description ? (
                  <Text style={styles.entryDescription}>{vol.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Scholarships, Honors & Awards */}
        {(scholarships.length > 0 || awards.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scholarships & Honors</Text>
            {scholarships.map(sch => (
              <View key={sch.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{sch.name}</Text>
                  {sch.year ? <Text style={styles.entryDates}>{sch.year}</Text> : null}
                </View>
                {sch.issuer ? <Text style={styles.entrySubtitle}>{sch.issuer}</Text> : null}
                {sch.description ? (
                  <Text style={styles.entryDescription}>{sch.description}</Text>
                ) : null}
              </View>
            ))}
            {awards.map(aw => (
              <View key={aw.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{aw.name}</Text>
                  {aw.date ? <Text style={styles.entryDates}>{aw.date}</Text> : null}
                </View>
                <Text style={styles.entrySubtitle}>{aw.issuer}</Text>
                {aw.description ? (
                  <Text style={styles.entryDescription}>{aw.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications & Licensures</Text>
            {certifications.map(cert => (
              <View key={cert.id} wrap={false} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{cert.name}</Text>
                  {cert.date ? <Text style={styles.entryDates}>{cert.date}</Text> : null}
                </View>
                <Text style={styles.entrySubtitle}>{cert.issuer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills & Languages */}
        {skills && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Skills & Languages</Text>
            {skills.technical && skills.technical.length > 0 && (
              <View style={styles.skillsRow}>
                <Text style={styles.skillsLabel}>Technical Skills:</Text>
                <Text style={styles.skillsContent}>{skills.technical.join(', ')}</Text>
              </View>
            )}
            {skills.languages && skills.languages.length > 0 && (
              <View style={styles.skillsRow}>
                <Text style={styles.skillsLabel}>Languages:</Text>
                <Text style={styles.skillsContent}>{skills.languages.join(', ')}</Text>
              </View>
            )}
            {skills.soft && skills.soft.length > 0 && (
              <View style={styles.skillsRow}>
                <Text style={styles.skillsLabel}>Soft Skills:</Text>
                <Text style={styles.skillsContent}>{skills.soft.join(', ')}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
