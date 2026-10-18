import { describe, expect, it } from 'vitest';
import { generateAvailability, availabilityRangeSchema } from '@/lib/availability-range';
import { parisInput } from '@/lib/booking-calendar';
const range = { from: '2026-12-01', to: '2026-12-31', opens: '08:00', closes: '19:00', interval: 30 as const, weekdays: [0, 1, 2, 3, 4, 5, 6] };
describe('availability period', () => {
  it('opens the entire inclusive month within working hours', () => {
    const slots = generateAvailability(range, 180, new Date('2026-10-01'));
    expect(slots).toHaveLength(31 * 17);
    expect(parisInput(slots[0]?.starts_at ?? '')).toBe('2026-12-01T08:00');
    expect(parisInput(slots.at(-1)?.starts_at ?? '')).toBe('2026-12-31T16:00');
    expect(parisInput(slots.at(-1)?.ends_at ?? '')).toBe('2026-12-31T19:00');
  });
  it('supports weekdays, editable duration and interval', () => {
    const slots = generateAvailability({ ...range, to: range.from, weekdays: [2], interval: 60 }, 60, new Date('2026-10-01'));
    expect(slots).toHaveLength(11);
    expect(parisInput(slots.at(-1)?.starts_at ?? '')).toBe('2026-12-01T18:00');
    expect(generateAvailability({ ...range, to: range.from, weekdays: [1] }, 180, new Date('2026-10-01'))).toEqual([]);
  });
  it('skips past starts and rejects invalid periods', () => {
    expect(generateAvailability(range, 180, new Date('2027-01-01'))).toEqual([]);
    expect(availabilityRangeSchema.safeParse({ ...range, to: '2026-11-30' }).success).toBe(false);
    expect(availabilityRangeSchema.safeParse({ ...range, from: '2026-02-30' }).success).toBe(false);
    expect(availabilityRangeSchema.safeParse({ ...range, closes: '07:00' }).success).toBe(false);
    expect(availabilityRangeSchema.safeParse({ ...range, to: '2027-12-31' }).success).toBe(false);
  });
});