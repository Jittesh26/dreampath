import { describe, it, expect } from 'vitest';
import {
  calculateDeadlineUrgency,
  getProviderMonogram,
  extractScholarshipAttributes,
} from '../scholarship-attributes';

describe('scholarship-attributes domain utility', () => {
  describe('calculateDeadlineUrgency', () => {
    const baseDate = new Date('2026-10-01T00:00:00.000Z');

    it('returns Closed when status is closed', () => {
      const res = calculateDeadlineUrgency('2026-11-15', '2026-03-01', 'closed', baseDate);
      expect(res.label).toBe('Closed');
      expect(res.daysLeft).toBe(0);
    });

    it('returns Rolling Intake when closeDate is null or undefined', () => {
      const res = calculateDeadlineUrgency(null, null, 'published', baseDate);
      expect(res.label).toBe('Rolling Intake');
      expect(res.daysLeft).toBeNull();
    });

    it('returns Closing Soon · N Days Left when 7 days or fewer remain', () => {
      // 4 days left: Oct 1 + 4 days = Oct 5
      const res = calculateDeadlineUrgency('2026-10-05T00:00:00.000Z', '2026-03-01', 'published', baseDate);
      expect(res.label).toContain('Closing Soon');
      expect(res.label).toContain('4 Days Left');
      expect(res.isUrgent).toBe(true);
    });

    it('returns N Days Left · Closes [Date] when between 8 and 30 days remain', () => {
      // 18 days left: Oct 1 + 18 days = Oct 19
      const res = calculateDeadlineUrgency('2026-10-19T00:00:00.000Z', '2026-03-01', 'published', baseDate);
      expect(res.label).toContain('18 Days Left');
      expect(res.label).toContain('Closes 19 Oct');
      expect(res.isUrgent).toBe(false);
    });

    it('returns Closing [Date] when more than 30 days remain', () => {
      // 45 days left: Oct 1 + 45 days = Nov 15
      const res = calculateDeadlineUrgency('2026-11-15T00:00:00.000Z', '2026-03-01', 'published', baseDate);
      expect(res.label).toBe('Closing 15 Nov');
      expect(res.isUrgent).toBe(false);
    });
  });

  describe('getProviderMonogram', () => {
    it('returns YBR for Yayasan Bank Rakyat', () => {
      const mono = getProviderMonogram('Yayasan Bank Rakyat');
      expect(mono.text).toBe('YBR');
      expect(mono.tierTag).toBe('GLC Endowment');
    });

    it('returns JPA for Jabatan Perkhidmatan Awam', () => {
      const mono = getProviderMonogram('Jabatan Perkhidmatan Awam (JPA)');
      expect(mono.text).toBe('JPA');
      expect(mono.tierTag).toBe('Federal Public Service');
    });

    it('returns MXS for Maxis', () => {
      const mono = getProviderMonogram('Maxis');
      expect(mono.text).toBe('MXS');
      expect(mono.tierTag).toBe('Corporate Tier');
    });

    it('falls back cleanly for custom providers', () => {
      const mono = getProviderMonogram('Global Innovation Lab');
      expect(mono.text).toBe('GIL');
      expect(mono.tierTag).toBe('Verified Provider');
    });
  });

  describe('extractScholarshipAttributes', () => {
    it('extracts attributes for Bank Rakyat PPBU', () => {
      const attrs = extractScholarshipAttributes(
        'PPBU (Pembiayaan Pendidikan Boleh Ubah)',
        'Convertible education loan/scholarship up to RM 120,000 for undergraduate studies.',
        'Official evidence notes',
        '2026-11-15',
        '2026-03-01',
        'published',
        'Yayasan Bank Rakyat'
      );

      expect(attrs.studyLevel).toBe('Undergraduate Degree');
      expect(attrs.awardText).toBe('Up to RM 120,000');
      expect(attrs.awardType).toBe('Convertible Loan');
      expect(attrs.providerMonogram.text).toBe('YBR');
    });
  });
});
