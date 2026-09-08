import { describe, expect, it } from 'vitest';
import { generateOccurrenceDates, getRecurringSeries } from './recurring';

describe('recurring schedules', () => {
  it('keeps monthly schedules anchored to the intended day', () => {
    expect(generateOccurrenceDates('2026-01-31', 'monthly', '2026-02-01', '2026-04-30')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('uses a stable series id when a recurring entry is edited', () => {
    const series = getRecurringSeries([
      { type: 'expense', amount: 20, category: 'Bills', description: 'Phone', date: '2026-01-01', isRecurring: true, recurringFrequency: 'monthly', recurringSeriesId: 'phone' },
      { type: 'expense', amount: 25, category: 'Bills', description: 'Phone', date: '2026-02-01', isRecurring: true, recurringFrequency: 'monthly', recurringSeriesId: 'phone' },
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].amount).toBe(25);
  });
});
