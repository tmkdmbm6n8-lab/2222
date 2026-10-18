import { z } from 'zod';

export const editFields = ['content', 'images', 'links', 'hidden', 'audience', 'typography', 'themeColors', 'elementColors', 'media', 'disabledPages', 'permanentlyDeletedPages'] as const;
export const historyEntrySchema = z.object({ id: z.string().uuid(), label: z.string().max(300), at: z.string(), state: z.record(z.string(), z.unknown()) });
export const editHistorySchema = z.array(historyEntrySchema).max(100);
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export function historyBefore(history: HistoryEntry[], id: string) {
  const index = history.findIndex(entry => entry.id === id);
  if (index < 0) throw new Error('Cette modification n’est plus dans l’historique.');
  return history.slice(0, index);
}
export function editorSnapshot(config: Record<string, unknown>) {
  return Object.fromEntries(editFields.map(field => [field, config[field] ?? {}]));
}
export function recordEdit(config: Record<string, unknown>, label: string) {
  const parsed = editHistorySchema.safeParse(config['editHistory'] ?? []);
  const entry: HistoryEntry = { id: crypto.randomUUID(), label: label.slice(0, 300), at: new Date().toISOString(), state: editorSnapshot(config) };
  return [...(parsed.success ? parsed.data : []), entry].slice(-100);
}