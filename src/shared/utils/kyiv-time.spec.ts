import { kyivDayKey, parseRangeEnd, parseRangeStart } from './kyiv-time';

describe('kyiv-time', () => {
  describe('parseRangeStart', () => {
    it('maps a date-only value to Kyiv midnight in summer time (UTC+3)', () => {
      expect(parseRangeStart('2026-09-25').toISOString()).toBe(
        '2026-09-24T21:00:00.000Z',
      );
    });

    it('maps a date-only value to Kyiv midnight in winter time (UTC+2)', () => {
      expect(parseRangeStart('2026-01-15').toISOString()).toBe(
        '2026-01-14T22:00:00.000Z',
      );
    });

    it('handles the spring-forward and fall-back days', () => {
      expect(parseRangeStart('2026-03-29').toISOString()).toBe(
        '2026-03-28T22:00:00.000Z',
      );
      expect(parseRangeStart('2026-10-25').toISOString()).toBe(
        '2026-10-24T21:00:00.000Z',
      );
    });

    it('passes a full ISO timestamp through untouched', () => {
      expect(parseRangeStart('2026-09-25T10:15:00.000Z').toISOString()).toBe(
        '2026-09-25T10:15:00.000Z',
      );
    });
  });

  describe('parseRangeEnd', () => {
    it('maps a date-only value to the last millisecond of that Kyiv day', () => {
      expect(parseRangeEnd('2026-09-25').toISOString()).toBe(
        '2026-09-25T20:59:59.999Z',
      );
    });

    it('is inclusive across a month boundary', () => {
      expect(parseRangeEnd('2026-01-31').toISOString()).toBe(
        '2026-01-31T21:59:59.999Z',
      );
    });

    it('passes a full ISO timestamp through untouched', () => {
      expect(parseRangeEnd('2026-09-25T10:15:00.000Z').toISOString()).toBe(
        '2026-09-25T10:15:00.000Z',
      );
    });
  });

  describe('kyivDayKey', () => {
    it('buckets an instant after Kyiv midnight into the next Kyiv day', () => {
      expect(kyivDayKey(new Date('2026-09-24T21:01:36.584Z'))).toBe(
        '2026-09-25',
      );
    });

    it('keeps an instant just before Kyiv midnight in the same Kyiv day', () => {
      expect(kyivDayKey(new Date('2026-09-24T20:59:59.999Z'))).toBe(
        '2026-09-24',
      );
    });

    it('uses the winter offset in January', () => {
      expect(kyivDayKey(new Date('2026-01-14T22:00:00.000Z'))).toBe(
        '2026-01-15',
      );
    });
  });

  it('gives the same answers regardless of the process timezone', () => {
    const previous = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      expect(parseRangeStart('2026-09-25').toISOString()).toBe(
        '2026-09-24T21:00:00.000Z',
      );
      expect(kyivDayKey(new Date('2026-09-24T21:01:00.000Z'))).toBe(
        '2026-09-25',
      );
    } finally {
      process.env.TZ = previous;
    }
  });
});
