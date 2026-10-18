import { useEffect, useState } from "react";
import { LifeBuoy, Send, PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
};
type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_admin: boolean;
  body: string;
  created_at: string;
};
const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolu",
};

export function ClientSav() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activeId, setActiveId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const refresh = async (preferredId?: string) => {
    setLoading(true);
    try {
      const db = supabase as any;
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Connectez-vous pour accéder au SAV.");
      const { data: ticketRows, error: ticketError } = await db
        .from("support_tickets")
        .select("id,user_id,subject,description,status,created_at,updated_at")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });
      if (ticketError) throw new Error("Le SAV n'est pas encore configuré. Réessayez plus tard.");
      const list = (ticketRows ?? []) as Ticket[];
      setTickets(list);
      const nextId = preferredId && list.some((t) => t.id === preferredId)
        ? preferredId
        : list.some((t) => t.id === activeId) ? activeId : list[0]?.id ?? "";
      setActiveId(nextId);
      if (nextId) {
        const { data: messageRows, error: messageError } = await db
          .from("support_ticket_messages")
          .select("id,ticket_id,sender_id,is_admin,body,created_at")
          .eq("ticket_id", nextId)
          .order("created_at", { ascending: true });
        if (messageError) throw new Error("Impossible de charger les messages SAV.");
        setMessages((messageRows ?? []) as TicketMessage[]);
      } else {
        setMessages([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement du SAV impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const selectTicket = async (id: string) => {
    setActiveId(id);
    const { data, error } = await (supabase as any)
      .from("support_ticket_messages")
      .select("id,ticket_id,sender_id,is_admin,body,created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });
    if (error) toast.error("Impossible de charger les messages.");
    else setMessages((data ?? []) as TicketMessage[]);
  };

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Connectez-vous pour créer une demande.");
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .insert({
          user_id: authData.user.id,
          subject: subject.trim(),
          description: description.trim(),
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw new Error("La demande n'a pas pu être créée. Vérifiez que le SAV est activé.");
      const { error: messageError } = await (supabase as any).from("support_ticket_messages").insert({
        ticket_id: data.id,
        sender_id: authData.user.id,
        is_admin: false,
        body: description.trim(),
      });
      if (messageError) toast.error("Demande créée, mais le premier message n'a pas pu être ajouté.");
      setSubject("");
      setDescription("");
      setShowNew(false);
      toast.success("Votre demande SAV a été créée.");
      await refresh(data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeId || !reply.trim()) return;
    const current = tickets.find((ticket) => ticket.id === activeId);
    if (!current || current.status === "resolved") return;
    setSending(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Session client introuvable.");
      const { error } = await (supabase as any).from("support_ticket_messages").insert({
        ticket_id: activeId,
        sender_id: authData.user.id,
        is_admin: false,
        body: reply.trim(),
      });
      if (error) throw new Error("Message non envoyé. Réessayez.");
      await (supabase as any).from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", activeId);
      setReply("");
      toast.success("Message envoyé à TClean.");
      await refresh(activeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  const active = tickets.find((ticket) => ticket.id === activeId);
  const activeMessages = messages.filter((message) => message.ticket_id === activeId);

  return (
    <section className="form-panel mt-5">
      <div className="inline-actions justify-between mb-4">
        <div className="inline-actions"><LifeBuoy className="h-5 w-5" /><h2 className="text-xl">Service après-vente</h2></div>
        <div className="inline-actions">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />Actualiser
          </Button>
          <Button size="sm" onClick={() => setShowNew((value) => !value)}>
            <PlusCircle className="mr-2 h-4 w-4" />Nouvelle demande
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Créez une demande, échangez avec TClean et suivez son traitement depuis votre compte.</p>
      {showNew && (
        <form onSubmit={createTicket} className="admin-item mb-5">
          <h3 className="font-semibold mb-3">Contacter le SAV</h3>
          <div className="field">
            <label htmlFor="client-sav-subject">Sujet</label>
            <input id="client-sav-subject" required maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex. : question après un nettoyage" />
          </div>
          <div className="field">
            <label htmlFor="client-sav-description">Décrivez votre demande</label>
            <textarea id="client-sav-description" required maxLength={3000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Expliquez-nous le problème ou votre question…" />
          </div>
          <div className="inline-actions">
            <Button type="submit" disabled={creating || !subject.trim() || !description.trim()}>{creating ? "Création…" : "Envoyer la demande"}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>Annuler</Button>
          </div>
        </form>
      )}
      <div className="admin-sav-layout">
        <aside className="admin-sav-list">
          {loading ? <p className="text-sm text-muted-foreground">Chargement des demandes…</p> : tickets.length ? tickets.map((ticket) => (
            <button type="button" key={ticket.id} className={`admin-sav-ticket ${activeId === ticket.id ? "active" : ""}`} onClick={() => void selectTicket(ticket.id)}>
              <strong>{ticket.subject}</strong>
              <small>{new Date(ticket.created_at).toLocaleDateString("fr-FR")}</small>
              <small>{statusLabels[ticket.status] ?? ticket.status}</small>
            </button>
          )) : <p className="text-sm text-muted-foreground">Aucune demande SAV pour le moment. Cliquez sur « Nouvelle demande » pour contacter TClean.</p>}
        </aside>
        <div className="admin-sav-detail">
          {active ? <>
            <div className="inline-actions justify-between">
              <div><h3 className="font-semibold">{active.subject}</h3><p className="text-xs text-muted-foreground mt-1">Demande du {new Date(active.created_at).toLocaleString("fr-FR")}</p></div>
              <span className="account-status">{statusLabels[active.status] ?? active.status}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap mt-4">{active.description}</p>
            <div className="admin-sav-thread mt-5">
              {activeMessages.map((message) => (
                <article key={message.id} className={message.is_admin ? "msg msg-admin" : "msg msg-client"}>
                  <p className="msg-meta">{message.is_admin ? "TClean" : "Vous"} · {new Date(message.created_at).toLocaleString("fr-FR")}</p>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </article>
              ))}
              {!activeMessages.length && <p className="text-sm text-muted-foreground">Aucun message.</p>}
            </div>
            {active.status !== "resolved" ? (
              <form onSubmit={sendReply} className="mt-4">
                <div className="field"><label htmlFor="client-sav-reply">Votre réponse</label><textarea id="client-sav-reply" required maxLength={3000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Écrivez votre message à TClean…" /></div>
                <Button type="submit" disabled={sending || !reply.trim()}><Send className="mr-2 h-4 w-4" />{sending ? "Envoi…" : "Envoyer le message"}</Button>
              </form>
            ) : <p className="text-sm text-muted-foreground mt-4">Cette demande est résolue. Contactez TClean en créant une nouvelle demande si nécessaire.</p>}
          </> : <p className="text-sm text-muted-foreground">Sélectionnez une demande SAV pour afficher les échanges.</p>}
        </div>
      </div>
    </section>
  );
}
