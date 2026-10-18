import { describe, expect, it } from 'vitest';
import { historyBefore, type HistoryEntry } from '@/lib/editor-history';

const history: HistoryEntry[] = ['a', 'b', 'c'].map(id => ({ id, label: id, at: '', state: {} }));
describe('historyBefore', () => {
  it('removes the undone entry and every later entry without adding an undo entry', () => {
    expect(historyBefore(history, 'b')).toEqual([history[0]]);
    expect(history).toHaveLength(3);
  });
  it('keeps earlier entries when undoing the latest change', () => {
    expect(historyBefore(history, 'c')).toEqual(history.slice(0, 2));
  });
  it('empties history when returning before the first change', () => {
    expect(historyBefore(history, 'a')).toEqual([]);
  });
  it('rejects a missing entry instead of changing the history', () => {
    expect(() => historyBefore(history, 'missing')).toThrow('plus dans l’historique');
  });
});