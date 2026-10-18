import { describe, expect, it } from 'vitest';
import { calendarDate, parisDay, slotsOnDay, parisInstant, parisInput } from '@/lib/booking-calendar';
describe('Paris booking calendar', () => {
  it('interprets admin times as Paris regardless of browser timezone',()=>{expect(parisInstant('2027-10-01T12:00')).toBe('2027-10-01T10:00:00.000Z');expect(parisInstant('2027-01-01T12:00')).toBe('2027-01-01T11:00:00.000Z');expect(parisInput('2027-10-01T10:00:00Z')).toBe('2027-10-01T12:00');});
  it('groups timestamps by Paris day, not UTC day', () => expect(parisDay('2027-10-01T22:30:00Z')).toBe('2027-10-02'));
  it('preserves blocked hours on the selected day', () => {
    const slots = [{id:'a',starts_at:'2027-10-01T10:00:00Z',ends_at:'2027-10-01T13:00:00Z',available:false},{id:'b',starts_at:'2027-10-01T12:30:00Z',ends_at:'2027-10-01T15:30:00Z',available:false},{id:'c',starts_at:'2027-10-02T10:00:00Z',ends_at:'2027-10-02T13:00:00Z',available:true}];
    expect(slotsOnDay(slots,calendarDate('2027-10-01T10:00:00Z')).map(s=>s.id)).toEqual(['a','b']);
  });
});