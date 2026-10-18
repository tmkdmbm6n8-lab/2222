import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addAdmin, listAdmins, removeAdmin } from "@/lib/business.functions";

export function AdminAdmins() {
  const load = useServerFn(listAdmins);
  const add = useServerFn(addAdmin);
  const remove = useServerFn(removeAdmin);
  const [data, setData] = useState<Awaited<ReturnType<typeof listAdmins>> | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => load().then(setData).catch((e) => toast.error(e instanceof Error ? e.message : "Erreur"));
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="admin-panel space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Administrateurs</h2>
        <p className="text-sm text-muted-foreground">Les administrateurs ont accès à toutes les fonctions : demandes, messagerie, tarifs, mode édition… La personne doit d’abord avoir créé un compte sur le site.</p>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await add({ data: { email } });
            toast.success("Administrateur ajouté.");
            setEmail("");
            refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Ajout impossible.");
          } finally { setBusy(false); }
        }}
      >
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail du compte" aria-label="Adresse e-mail" className="flex-1 min-w-[240px] rounded-md border border-input bg-background px-3 py-2" />
        <Button type="submit" disabled={busy}>Ajouter comme admin</Button>
      </form>
      {!data ? <p>Chargement…</p> : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-3">
              <span>{a.email}{a.id === data.me && <small className="ml-2 text-muted-foreground">(vous)</small>}</span>
              {a.id !== data.me && (
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!window.confirm(`Retirer l’accès administrateur de ${a.email} ?`)) return;
                  try { await remove({ data: { user_id: a.id } }); toast.success("Accès retiré."); refresh(); }
                  catch (err) { toast.error(err instanceof Error ? err.message : "Retrait impossible."); }
                }}>Retirer</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
