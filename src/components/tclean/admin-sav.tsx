import { useEffect, useState } from "react";
import { LifeBuoy, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ticket = { id: string; user_id: string; subject: string; description: string; status: string; created_at: string };
type TicketMessage = { id: string; ticket_id: string; sender_id: string; is_admin: boolean; body: string; created_at: string };
const labels: Record<string, string> = { pending: "En attente", in_progress: "En cours", resolved: "Résolu" };

export function AdminSav() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activeId, setActiveId] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    const db = supabase as any;
    const [t, m] = await Promise.all([
      db.from("support_tickets").select("id,user_id,subject,description,status,created_at").order("created_at", { ascending: false }),
      db.from("support_ticket_messages").select("id,ticket_id,sender_id,is_admin,body,created_at").order("created_at", { ascending: true }),
    ]);
    if (t.error) toast.error("Le SAV n'est pas encore configuré. Vérifiez la migration de la base de données.");
    else {
      const rows = (t.data ?? []) as Ticket[];
      setTickets(rows);
      setActiveId((current) => rows.some((x) => x.id === current) ? current : rows[0]?.id ?? "");
    }
    if (!m.error) setMessages((m.data ?? []) as TicketMessage[]);
    setLoading(false);
  };
  useEffect(() => { void refresh(); }, []);
  const current = tickets.find((ticket) => ticket.id === activeId);
  const currentMessages = messages.filter((message) => message.ticket_id === activeId);
  const changeStatus = async (status: string) => {
    if (!current) return;
    const { error } = await (supabase as any).from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", current.id);
    if (error) toast.error("Impossible de modifier le statut.");
    else { toast.success("Statut mis à jour."); await refresh(); }
  };
  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeId || !reply.trim()) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Session administrateur introuvable.");
      const { error } = await (supabase as any).from("support_ticket_messages").insert({ ticket_id: activeId, sender_id: data.user.id, is_admin: true, body: reply.trim() });
      if (error) throw new Error("Réponse non envoyée.");
      await (supabase as any).from("support_tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", activeId).neq("status", "resolved");
      setReply(""); await refresh(); toast.success("Réponse envoyée.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Envoi impossible."); }
    finally { setBusy(false); }
  };
  return <section className="form-panel admin-sav">
    <div className="inline-actions justify-between mb-4"><div className="inline-actions"><LifeBuoy className="h-5 w-5" /><h2 className="text-xl">Service après-vente</h2><span className="text-sm text-muted-foreground">({tickets.length} demande(s))</span></div><Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button></div>
    <p className="text-sm text-muted-foreground mb-5">Suivez les demandes SAV, répondez aux clients et mettez à jour leur statut depuis cet espace dédié.</p>
    <div className="admin-sav-layout"><aside className="admin-sav-list">
      {loading ? <p className="text-sm text-muted-foreground">Chargement des demandes…</p> : tickets.length ? tickets.map((ticket) => <button type="button" key={ticket.id} className={`admin-sav-ticket ${activeId === ticket.id ? "active" : ""}`} onClick={() => setActiveId(ticket.id)}><strong>{ticket.subject}</strong><small>{new Date(ticket.created_at).toLocaleDateString("fr-FR")}</small><small>{labels[ticket.status] ?? ticket.status}</small></button>) : <p className="text-sm text-muted-foreground">Aucune demande SAV pour le moment.</p>}
    </aside><div className="admin-sav-detail">
      {current ? <><div className="inline-actions justify-between"><div><h3 className="font-semibold">{current.subject}</h3><p className="text-xs text-muted-foreground mt-1">Demande du {new Date(current.created_at).toLocaleString("fr-FR")}</p></div><select aria-label="Statut SAV" value={current.status} onChange={(event) => void changeStatus(event.target.value)}><option value="pending">En attente</option><option value="in_progress">En cours</option><option value="resolved">Résolu</option></select></div>
      <p className="text-sm whitespace-pre-wrap mt-4">{current.description}</p><div className="admin-sav-thread mt-5">{currentMessages.map((message) => <article key={message.id} className={message.is_admin ? "msg msg-admin" : "msg msg-client"}><p className="msg-meta">{message.is_admin ? "TClean" : "Client"} · {new Date(message.created_at).toLocaleString("fr-FR")}</p><p className="whitespace-pre-wrap">{message.body}</p></article>)}</div>
      {current.status !== "resolved" && <form onSubmit={sendReply} className="mt-4"><div className="field"><label htmlFor="sav-reply">Répondre au client</label><textarea id="sav-reply" required maxLength={3000} value={reply} onChange={(event) => setReply(event.target.value)} /></div><Button type="submit" disabled={busy || !reply.trim()}><Send className="mr-2 h-4 w-4" />{busy ? "Envoi…" : "Envoyer la réponse"}</Button></form>}</> : <p className="text-sm text-muted-foreground">Sélectionnez une demande pour afficher l’échange.</p>}
    </div></div>
  </section>;
}
