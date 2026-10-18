import { z } from 'zod';
import { parisInstant } from './booking-calendar';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Date invalide.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const availabilityRangeSchema = z.object({
  from: date, to: date, opens: time, closes: time,
  interval: z.union([z.literal(30), z.literal(60)]).default(30),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Choisissez au moins un jour.').max(7),
}).superRefine((value, context) => {
  const days = (Date.parse(`${value.to}T12:00:00Z`) - Date.parse(`${value.from}T12:00:00Z`)) / 86400000;
  if (days < 0 || days > 61) context.addIssue({ code: 'custom', message: 'Choisissez une période de 1 à 62 jours.', path: ['to'] });
  if (value.closes <= value.opens) context.addIssue({ code: 'custom', message: 'La fin doit être après le début.', path: ['closes'] });
});
export type AvailabilityRange = z.infer<typeof availabilityRangeSchema>;
export function generateAvailability(input: AvailabilityRange, duration: number, now = new Date()) {
  const range = availabilityRangeSchema.parse(input);
  if (!Number.isInteger(duration) || duration < 30 || duration > 1440) throw new Error('Durée de réservation invalide.');
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const slots: { starts_at: string; ends_at: string }[] = [];
  for (let day = Date.parse(`${range.from}T12:00:00Z`); day <= Date.parse(`${range.to}T12:00:00Z`); day += 86400000) {
    const date = new Date(day);
    if (!range.weekdays.includes(date.getUTCDay())) continue;
    for (let minute = minutes(range.opens); minute + duration <= minutes(range.closes); minute += range.interval) {
      const clock = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const starts_at = parisInstant(`${date.toISOString().slice(0, 10)}T${clock}`);
      if (new Date(starts_at) <= now) continue;
      slots.push({ starts_at, ends_at: new Date(Date.parse(starts_at) + duration * 60000).toISOString() });
    }
  }
  return slots;
}