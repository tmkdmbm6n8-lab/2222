import { describe, expect, it } from 'vitest';
import { clientSummary } from '@/lib/client-summary';

describe('Client order summary', () => {
  it('does not count quotes or contact messages as orders', () => {
    expect(clientSummary([{ kind: 'quote', status: 'accepted' }, { kind: 'contact', status: 'pending' }])).toEqual({ orders: 0, completed: 0, upcoming: 0 });
  });
  it('counts completed and active bookings separately from cancelled orders', () => {
    expect(clientSummary(['completed', 'confirmed', 'pending', 'cancelled', 'refused'].map(status => ({ kind: 'booking', status })))).toEqual({ orders: 5, completed: 1, upcoming: 2 });
  });
});