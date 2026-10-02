/**
 * Domain utility to extract verified attributes, monograms, awards, and dynamic deadlines
 * from authoritative database scholarship records.
 */

export interface ProviderMonogram {
  text: string;
  bgClass: string;
  textColorClass?: string;
  tierTag: string;
}

export interface DeadlineUrgency {
  label: string;
  badgeClass: string;
  isUrgent: boolean;
  daysLeft: number | null;
  statusText: string;
}

export interface FormattedScholarshipAttributes {
  studyLevel: string;
  awardText: string;
  awardType: string;
  providerMonogram: ProviderMonogram;
  deadlineUrgency: DeadlineUrgency;
  eligibleFields: string;
  formattedDeadline: string;
  verifiedDateText: string;
}

/**
 * Calculates deadline urgency dynamically from the intake close date.
 * Strictly respects availability states: OPEN, CLOSED, ROLLING, TBA, UNKNOWN.
 * 
 * Rules:
 * - More than 30 days: `Closing [Date]`
 * - 8–30 days: `[N] Days Left · Closes [Date]`
 * - Less than 7 days: `Closing Soon · [N] Days Left`
 * - Closed: `Closed`
 * - Rolling/TBA: `Rolling Intake`
 */
export function calculateDeadlineUrgency(
  closeDate: string | null | undefined,
  openDate: string | null | undefined,
  status: string | null | undefined,
  referenceDate: Date = new Date()
): DeadlineUrgency {
  if (status === 'closed') {
    return {
      label: 'Closed',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      isUrgent: false,
      daysLeft: 0,
      statusText: 'Intake Completed',
    };
  }

  if (!closeDate) {
    return {
      label: 'Rolling Intake',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      isUrgent: false,
      daysLeft: null,
      statusText: 'Applications Reviewed on Rolling Basis',
    };
  }

  const close = new Date(closeDate);
  const now = referenceDate;
  const diffTime = close.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = close.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
  });

  if (diffDays <= 0) {
    return {
      label: 'Closed',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      isUrgent: false,
      daysLeft: 0,
      statusText: 'Deadline Passed',
    };
  }

  if (openDate && new Date(openDate) > now) {
    const open = new Date(openDate).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
    });
    return {
      label: `Opens ${open}`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      isUrgent: false,
      daysLeft: diffDays,
      statusText: `Intake opens on ${open}`,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Closing Soon · ${diffDays} ${diffDays === 1 ? 'Day' : 'Days'} Left`,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/90 font-bold',
      isUrgent: true,
      daysLeft: diffDays,
      statusText: `Closes ${formattedDate}`,
    };
  }

  if (diffDays <= 30) {
    return {
      label: `${diffDays} Days Left · Closes ${formattedDate}`,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/90 font-bold',
      isUrgent: false,
      daysLeft: diffDays,
      statusText: `Closes ${formattedDate}`,
    };
  }

  return {
    label: `Closing ${formattedDate}`,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 font-bold',
    isUrgent: false,
    daysLeft: diffDays,
    statusText: `Closes ${formattedDate}`,
  };
}

/**
 * Returns provider monogram badge and classification tier based on provider name.
 */
export function getProviderMonogram(providerName: string): ProviderMonogram {
  const norm = providerName.toLowerCase();

  if (norm.includes('bank rakyat')) {
    return { text: 'YBR', bgClass: 'bg-blue-700', tierTag: 'GLC Endowment' };
  }
  if (norm.includes('maxis')) {
    return { text: 'MXS', bgClass: 'bg-emerald-600', tierTag: 'Corporate Tier' };
  }
  if (norm.includes('ytl')) {
    return { text: 'YTL', bgClass: 'bg-indigo-700', tierTag: 'Foundation Merit' };
  }
  if (norm.includes('perkhidmatan awam') || norm.includes('jpa')) {
    return { text: 'JPA', bgClass: 'bg-sky-800', tierTag: 'Federal Public Service' };
  }
  if (norm.includes('khazanah')) {
    return { text: 'YK', bgClass: 'bg-amber-600', tierTag: 'Sovereign Premier' };
  }
  if (norm.includes('gamuda')) {
    return { text: 'YG', bgClass: 'bg-orange-600', tierTag: 'Engineering & Infra' };
  }
  if (norm.includes('petronas')) {
    return { text: 'PET', bgClass: 'bg-teal-700', tierTag: 'National Energy' };
  }
  if (norm.includes('negara') || norm.includes('bnm')) {
    return { text: 'BNM', bgClass: 'bg-blue-900', tierTag: 'Central Bank Sovereign' };
  }
  if (norm.includes('shell')) {
    return { text: 'SHL', bgClass: 'bg-amber-600', tierTag: 'Energy Multinational' };
  }
  if (norm.includes('sime darby')) {
    return { text: 'YSD', bgClass: 'bg-red-700', tierTag: 'Conglomerate Philanthropy' };
  }
  if (norm.includes('peneraju')) {
    return { text: 'YPP', bgClass: 'bg-purple-700', tierTag: 'Government Agency' };
  }
  if (norm.includes('mara')) {
    return { text: 'MARA', bgClass: 'bg-blue-800', tierTag: 'Federal Development' };
  }
  if (norm.includes('uem')) {
    return { text: 'UEM', bgClass: 'bg-cyan-700', tierTag: 'Infrastructure Sovereign' };
  }
  if (norm.includes('tunku abdul rahman') || norm.includes('ytar')) {
    return { text: 'YTAR', bgClass: 'bg-blue-600', tierTag: 'Leadership Statutory' };
  }
  if (norm.includes('sarawak energy')) {
    return { text: 'SEB', bgClass: 'bg-emerald-700', tierTag: 'State Utility' };
  }
  if (norm.includes('penang')) {
    return { text: 'PFF', bgClass: 'bg-teal-800', tierTag: 'State Government' };
  }
  if (norm.includes('kuok')) {
    return { text: 'KF', bgClass: 'bg-cyan-800', tierTag: 'Charitable Trust' };
  }
  if (norm.includes('hong leong')) {
    return { text: 'HLF', bgClass: 'bg-red-700', tierTag: 'Foundation Charity' };
  }
  if (norm.includes('top glove')) {
    return { text: 'TG', bgClass: 'bg-blue-600', tierTag: 'Corporate Engineering' };
  }
  if (norm.includes('aia')) {
    return { text: 'AIA', bgClass: 'bg-rose-600', tierTag: 'Financial Services' };
  }
  if (norm.includes('ijm')) {
    return { text: 'IJM', bgClass: 'bg-blue-700', tierTag: 'Infrastructure Group' };
  }
  if (norm.includes('genting')) {
    return { text: 'GEN', bgClass: 'bg-red-800', tierTag: 'Corporate Group' };
  }
  if (norm.includes('cimb')) {
    return { text: 'CIMB', bgClass: 'bg-rose-800', tierTag: 'Regional Philanthropy' };
  }
  if (norm.includes('sarawak')) {
    return { text: 'YS', bgClass: 'bg-emerald-800', tierTag: 'State Statutory Body' };
  }
  if (norm.includes('telekom') || norm.includes('ytm') || norm.includes('tm')) {
    return { text: 'YTM', bgClass: 'bg-orange-700', tierTag: 'Digital Impact' };
  }

  // Fallback: initials from words
  const words = providerName.split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  return {
    text: initials || 'SCH',
    bgClass: 'bg-slate-800',
    tierTag: 'Verified Provider',
  };
}

/**
 * Extracts verified monetary amount, study level, and award category
 * from authoritative description and evidence notes.
 */
export function extractScholarshipAttributes(
  name: string,
  description: string = '',
  evidenceNotes: string = '',
  closeDate: string | null = null,
  openDate: string | null = null,
  status: string = 'published',
  providerName: string = ''
): FormattedScholarshipAttributes {
  const combinedText = `${name} ${description} ${evidenceNotes}`.toLowerCase();

  // Study Level — do NOT default unknown to 'Undergraduate Degree'
  let studyLevel = 'All Study Levels';
  if (/\b(postgraduate|masters|phd|bydpa)\b/i.test(combinedText)) {
    studyLevel = 'Postgraduate (Masters/PhD)';
  } else if (/\b(diploma|tvet)\b/i.test(combinedText)) {
    studyLevel = 'Diploma / TVET';
  } else if (/\b(pre-university|a-levels|foundation|matriculation|spm)\b/i.test(combinedText)) {
    studyLevel = 'Pre-University / Foundation';
  } else if (/\b(undergraduate|degree|bachelor)\b/i.test(combinedText)) {
    studyLevel = 'Undergraduate Degree';
  }

  // Award Type & Monetary Value — do NOT fabricate 'Full Tuition & Living Allowance'
  let awardText = 'See Official Announcement';
  let awardType = 'Scholarship Award';

  if (combinedText.includes('rm 150,000') || combinedText.includes('150,000')) {
    awardText = 'Up to RM 150,000';
    awardType = 'Full Sponsorship';
  } else if (combinedText.includes('rm 120,000') || combinedText.includes('120,000')) {
    awardText = 'Up to RM 120,000';
    awardType = combinedText.includes('convertible') || combinedText.includes('ppbu') ? 'Convertible Loan' : 'Full Sponsorship';
  } else if (combinedText.includes('rm 40,000') || combinedText.includes('40,000')) {
    awardText = 'Up to RM 40,000 / year';
    awardType = 'Full Grant';
  } else if (combinedText.includes('rm 100,000') || combinedText.includes('100,000')) {
    awardText = 'Up to RM 100,000';
    awardType = 'Full Grant';
  } else if (combinedText.includes('rm 32,000') || combinedText.includes('32,000')) {
    awardText = 'Up to RM 32,000';
    awardType = 'Needs & Merit';
  } else if (/\b(overseas|ivy league)\b/i.test(combinedText)) {
    awardText = 'Full Overseas Cost';
    awardType = 'Global Premier';
  } else if (/\b(pidn|public service|perkhidmatan awam)\b/i.test(combinedText)) {
    awardText = 'Full Tuition + Allowance';
    awardType = 'Federal Tier';
  } else if (/\b(convertible|pembiayaan boleh ubah)\b/i.test(combinedText)) {
    awardText = 'Convertible Loan';
    awardType = 'Convertible Loan';
  } else if (/\bfull tuition\b/i.test(combinedText) && /\b(living allowance|monthly stipend)\b/i.test(combinedText)) {
    awardText = 'Full Tuition & Living Allowance';
    awardType = 'Full Sponsorship';
  } else if (/\bfull tuition\b/i.test(combinedText)) {
    awardText = 'Full Tuition Coverage';
    awardType = 'Tuition Grant';
  } else if (/\b(living allowance|monthly stipend)\b/i.test(combinedText)) {
    awardText = 'Monthly Living Allowance';
    awardType = 'Stipend';
  }

  // Eligible Fields — strictly bound words, avoid matching substrings inside 'merit', 'tuition', etc.
  let eligibleFields = 'All Academic Disciplines';
  if (/\bstem\b/i.test(combinedText) && /\b(medicine|medical)\b/i.test(combinedText)) {
    eligibleFields = 'STEM & Medicine';
  } else if (
    /\b(digital technology|computing|artificial intelligence|information technology|software engineering|computer science)\b/i.test(combinedText) ||
    /\b(it|ai)\b/i.test(combinedText)
  ) {
    eligibleFields = 'Computer Science & AI';
  } else if (/\b(engineering|built environment)\b/i.test(combinedText)) {
    eligibleFields = 'Engineering & Technology';
  } else if (/\b(economics|actuarial|finance)\b/i.test(combinedText)) {
    eligibleFields = 'Economics & Actuarial Science';
  } else if (/\bagriculture\b/i.test(combinedText)) {
    eligibleFields = 'Agriculture & Sciences';
  }

  const deadlineUrgency = calculateDeadlineUrgency(closeDate, openDate, status);
  const providerMonogram = getProviderMonogram(providerName);

  const formattedDeadline = closeDate
    ? new Date(closeDate).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Ongoing / Rolling';

  return {
    studyLevel,
    awardText,
    awardType,
    providerMonogram,
    deadlineUrgency,
    eligibleFields,
    formattedDeadline,
    verifiedDateText: evidenceNotes && evidenceNotes.trim() ? 'Verified Source' : '',
  };
}
