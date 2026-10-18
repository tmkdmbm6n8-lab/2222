export type BookingSlot = { id: string; starts_at: string; ends_at: string; available: boolean };
export function parisDay(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function calendarDate(value: string) {
  const [year, month, day] = parisDay(value).split('-').map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, 12);
}
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function slotsOnDay(slots: BookingSlot[], date: Date) { return slots.filter(s => parisDay(s.starts_at) === dayKey(date)); }
export function parisInput(value: string | Date) {
  const date = new Date(value);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${parisDay(date)}T${time}`;
}
export function parisInstant(value: string) {
  const target = Date.parse(`${value}:00Z`);
  let timestamp = target;
  for (let i = 0; i < 3; i++) {
    const represented = Date.parse(`${parisInput(new Date(timestamp))}:00Z`);
    timestamp += target - represented;
  }
  if (!Number.isFinite(timestamp) || parisInput(new Date(timestamp)) !== value) throw new Error('Cette heure n’existe pas à Paris (changement d’heure).');
  return new Date(timestamp).toISOString();
}