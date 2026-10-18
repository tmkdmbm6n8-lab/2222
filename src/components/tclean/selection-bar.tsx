import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Toolbar to select all / half / none of a list and delete the selection. */
export function SelectionBar({
  ids,
  selected,
  setSelected,
  onDelete,
  noun,
}: {
  ids: string[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onDelete: (ids: string[]) => Promise<unknown>;
  noun: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!ids.length) return null;
  const del = async () => {
    const list = ids.filter((i) => selected.has(i));
    if (!list.length) return;
    if (!window.confirm(`Supprimer définitivement ${list.length} ${noun} ? Cette action est irréversible.`)) return;
    setBusy(true);
    try {
      await onDelete(list);
      setSelected(new Set());
      toast.success(`${list.length} ${noun} supprimé(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="selection-bar">
      <Button size="sm" variant="outline" onClick={() => setSelected(new Set(ids))}>Tout sélectionner</Button>
      <Button size="sm" variant="outline" onClick={() => setSelected(new Set(ids.slice(0, Math.ceil(ids.length / 2))))}>La moitié</Button>
      <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Aucun</Button>
      <Button size="sm" variant="destructive" disabled={busy || selected.size === 0} onClick={del}>
        <Trash2 size={14} /> Supprimer ({ids.filter((i) => selected.has(i)).length})
      </Button>
    </div>
  );
}

export function SelectBox({ id, selected, setSelected, label }: { id: string; selected: Set<string>; setSelected: (s: Set<string>) => void; label: string }) {
  return (
    <input
      type="checkbox"
      className="select-box"
      aria-label={label}
      checked={selected.has(id)}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const n = new Set(selected);
        if (e.target.checked) n.add(id); else n.delete(id);
        setSelected(n);
      }}
    />
  );
}
