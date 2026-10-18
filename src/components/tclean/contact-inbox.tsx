import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, Search, Plus, MessageCircle, Paperclip, ShieldCheck, X, Clock3, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { askTcleanBot, getClientData, getUnreadCount, hideClientMessages, markMessagesRead, markNotificationsRead, sendClientMessage } from "@/lib/business.functions";
import { MediaButton } from "./account";
import botAvatar from "@/assets/tclean-bot.png";

const UNREAD_EVENT = "tclean-unread-refresh";

export function useUnread(pathname: string) {
  const load = useServerFn(getUnreadCount);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (alive) setCount(0);
        return;
      }
      try {
        const n = await load();
        if (alive) setCount(n);
      } catch {
        /* ignoré */
      }
    };

    run();

    // Identifiant unique par composant pour empêcher tout blocage ou conflit
    const channelName = `live-unread-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_notifications" }, () => {
        run();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages" }, () => {
        run();
      })
      .subscribe();

    const t = setInterval(run, 10000);
    window.addEventListener(UNREAD_EVENT, run);
    const { data: sub } = supabase.auth.onAuthStateChange(() => run());

    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener(UNREAD_EVENT, run);
      sub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return count;
}

export function useReviewRedirect(pathname: string) {
  const load = useServerFn(getClientData);
  const navigate = useNavigate();
  useEffect(() => {
    if (pathname === "/avis" || pathname.startsWith("/administration")) return;
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const d = await load();
        if (!alive) return;
        const seen: string[] = JSON.parse(localStorage.getItem("tclean-avis-done") || "[]");
        const todo = d.requests.find((r) => r.status === "completed" && !seen.includes(r.id));
        if (todo) {
          localStorage.setItem("tclean-avis-done", JSON.stringify([...seen, todo.id]));
          navigate({ to: "/avis" });
        }
      } catch {
        /* ignoré */
      }
    });
    return () => {
      alive = false;
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
}

const kindLabels: Record<string, string> = { booking: "Réservation", quote: "Devis", contact: "Contact" };
type Data = Awaited<ReturnType<typeof getClientData>>;
const time = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function ContactInbox() {
  const load = useServerFn(getClientData);
  const markRead = useServerFn(markNotificationsRead);
  const send = useServerFn(sendClientMessage);
  const hide = useServerFn(hideClientMessages);
  const markThreadRead = useServerFn(markMessagesRead);
  const askBot = useServerFn(askTcleanBot);
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [active, setActive] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [botBusy, setBotBusy] = useState(false);
  const [botQuestion, setBotQuestion] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const next = await load();
      setData(next);
      setActive((current) => current || next.requests.find(
        (r) => r.kind !== "contact" || next.messages.some((m) => m.request_id === r.id),
      )?.id || "");
    } catch {
      setData(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: sessionData }) => setSignedIn(!!sessionData.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setData(null);
      return;
    }

    let alive = true;
    const reload = async () => {
      try {
        const next = await load();
        if (alive) {
          setData(next);
          setActive((current) => current || next.requests.find(
            (request) => request.kind !== "contact" || next.messages.some((message) => message.request_id === request.id),
          )?.id || "");
        }
      } catch {
        if (alive) setData(null);
      }
    };

    reload()
      .then(() => markRead())
      .then(() => window.dispatchEvent(new Event(UNREAD_EVENT)))
      .catch(() => {});

    const channelName = "client-chat-" + Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages" }, () => {
        reload()
          .then(() => markRead())
          .then(() => window.dispatchEvent(new Event(UNREAD_EVENT)))
          .catch(() => {});
      })
      .subscribe();

    const timer = window.setInterval(reload, 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!signedIn) {
      setAdminOnline(false);
      return;
    }
    const channel = supabase.channel("tclean-admin-presence", { config: { presence: { key: "admin-viewer" } } });
    const updatePresence = () => {
      const state = channel.presenceState<{ role?: string; online?: boolean }>();
      setAdminOnline(Object.values(state).flat().some((presence) => presence.role === "admin" && presence.online === true));
    };
    channel.on("presence", { event: "sync" }, updatePresence).subscribe((status) => {
      if (status === "SUBSCRIBED") updatePresence();
    });
    return () => { supabase.removeChannel(channel); setAdminOnline(false); };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !active) return;
    markThreadRead({ data: { request_id: active } })
      .then(() => markRead())
      .then(() => refresh())
      .then(() => window.dispatchEvent(new Event(UNREAD_EVENT)))
      .catch((error) => {
        console.error("[TClean messenger] Impossible de confirmer la lecture.", error);
        toast.error("Lecture non confirmée. Vérifiez que la migration de messagerie a été appliquée dans Supabase.");
      });
  }, [signedIn, active, data?.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const askBotQuestion = async (question: string) => {
    setBotBusy(true);
    try {
      const result = await askBot({ data: { request_id: active || undefined, question } });
      setActive(result.request_id);
      setBotQuestion("");
      await refresh();
      window.dispatchEvent(new Event(UNREAD_EVENT));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L’assistant TClean est indisponible.");
    } finally {
      setBotBusy(false);
    }
  };

  useEffect(() => {
    if (!signedIn || !active) {
      setAdminTyping(false);
      return;
    }
    const channel = supabase.channel(`typing-${active}`)
      .on("broadcast", { event: "admin-typing" }, () => {
        setAdminTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setAdminTyping(false), 2500);
      });
    typingChannelRef.current = channel;
    channel.subscribe();
    return () => {
      typingChannelRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(channel);
    };
  }, [signedIn, active]);

  const handleClientTyping = (value: string) => {
    setBody(value);
    if (active) {
      void typingChannelRef.current?.send({
        type: "broadcast",
        event: "client-typing",
        payload: { typing: true },
      });
    }
  };

  const conversations = (data?.requests ?? []).filter(
    (request) => request.kind !== "contact" || data?.messages.some((message) => message.request_id === request.id),
  );
  const query = search.trim().toLocaleLowerCase("fr-FR");
  const filteredConversations = conversations.filter((request) => {
    const last = data?.messages.filter((message) => message.request_id === request.id).at(-1);
    return !query || [
      kindLabels[request.kind] ?? request.kind,
      request.customer_name,
      last?.body ?? "",
    ].some((value) => value.toLocaleLowerCase("fr-FR").includes(query));
  });
  const thread = data?.messages.filter((message) => (
    active ? message.request_id === active : !message.request_id
  )) ?? [];
  const activeRequest = conversations.find((request) => request.id === active);

  const startDirect = () => {
    setActive("");
    setBody("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread.length, active]);

  if (!signedIn) {
    return (
      <section className="tc-messaging-page">
        <div className="tc-messaging-login">
          <div className="tc-messaging-login-icon"><ShieldCheck size={24} /></div>
          <h2>Connectez-vous à votre espace</h2>
          <p>Vos échanges sont personnels et accessibles uniquement depuis votre compte client.</p>
          <Link to="/compte" className="tc-messaging-primary">Se connecter ou créer un compte <span>→</span></Link>
          <small>Messagerie privée · Suivi de vos demandes · Échanges centralisés</small>
        </div>
      </section>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim() && !file) return;

    setBusy(true);
    try {
      let attachment: {
        type: "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm";
        base64: string;
      } | null = null;

      if (file) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];
        if (!allowedTypes.includes(file.type)) throw new Error("Format non pris en charge. Ajoutez une image ou une vidéo compatible.");
        if (file.size > 20 * 1024 * 1024) throw new Error("Le fichier doit peser moins de 20 Mo.");
        attachment = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            type: file.type as "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm",
            base64: String(reader.result).split(",")[1] ?? "",
          });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      await send({ data: { request_id: active || undefined, body: body.trim(), attachment } });
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
      toast.success("Message envoyé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tc-messaging-page">
      {!data ? (
        <div className="tc-messaging-workspace"><p className="p-6">Chargement de votre messagerie…</p></div>
      ) : (
        <div className="tc-messaging-workspace">
          <aside className="tc-messaging-sidebar">
            <div className="tc-messaging-sidebar-top">
              <div><h2>Messages</h2><p>{conversations.length} conversation{conversations.length > 1 ? "s" : ""}</p></div>
              <button type="button" className="tc-messaging-new" onClick={startDirect} aria-label="Nouvelle discussion" title="Nouvelle discussion"><Plus size={19} /></button>
            </div>
            <label className="tc-messaging-search">
              <Search size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une conversation" aria-label="Rechercher une conversation" />
              {search && <button type="button" onClick={() => setSearch("")} aria-label="Effacer la recherche"><X size={15} /></button>}
            </label>
            <div className="tc-messaging-list-label">VOS CONVERSATIONS</div>
            <div className="tc-messaging-conversation-list">
              <button type="button" className={active === "" ? "tc-messaging-conversation selected" : "tc-messaging-conversation"} onClick={startDirect}>
                <span className="tc-messaging-avatar tc-messaging-avatar-brand">T</span>
                <span className="tc-messaging-conversation-copy">
                  <span className="tc-messaging-conversation-title">Contacter TClean</span>
                  <span className="tc-messaging-conversation-preview">Démarrer une discussion directe</span>
                </span>
                <span className="tc-messaging-conversation-time"><Plus size={14} /></span>
              </button>
              {filteredConversations.map((request) => {
                const messages = data.messages.filter((message) => message.request_id === request.id);
                const last = messages.at(-1);
                const selected = request.id === active;
                return (
                  <button key={request.id} type="button" className={selected ? "tc-messaging-conversation selected" : "tc-messaging-conversation"} onClick={() => setActive(request.id)}>
                    <span className="tc-messaging-avatar">{(request.customer_name || "TC").slice(0, 1).toLocaleUpperCase("fr-FR")}</span>
                    <span className="tc-messaging-conversation-copy">
                      <span className="tc-messaging-conversation-title">
                        {kindLabels[request.kind] ?? request.kind}
                        <small>{new Date(last?.created_at || request.created_at).toLocaleDateString("fr-FR")}</small>
                      </span>
                      <span className="tc-messaging-conversation-preview">{last ? (last.is_admin ? "TClean : " : "Vous : ") + (last.body || "Fichier joint") : "Aucun message pour le moment"}</span>
                    </span>
                    {selected && <span className="tc-messaging-selected-dot" />}
                  </button>
                );
              })}
              {filteredConversations.length === 0 && conversations.length > 0 && <p className="tc-messaging-no-results">Aucune conversation ne correspond à cette recherche.</p>}
            </div>
            <div className="tc-messaging-sidebar-footer"><ShieldCheck size={16} /><span>Vos échanges restent liés à votre compte.</span></div>
          </aside>

          <main className="tc-messaging-chat">
            <header className="tc-messaging-chat-header">
              <span className="tc-messaging-avatar tc-messaging-avatar-brand">T</span>
              <div className="tc-messaging-chat-identity">
                <strong>{activeRequest ? (kindLabels[activeRequest.kind] ?? activeRequest.kind) : "Équipe TClean"}</strong>
                <span><i className={adminOnline ? "tc-messaging-status-dot is-online" : "tc-messaging-status-dot is-offline"} /> {adminOnline ? "TClean est en ligne" : "TClean est hors ligne"}</span>
              </div>
              {activeRequest && <span className="tc-messaging-reference">Réf. {active.slice(0, 8).toUpperCase()}</span>}
              {thread.length > 0 && (
                <button type="button" className="tc-messaging-delete" onClick={async () => {
                  if (!window.confirm("Supprimer cette discussion de votre messagerie ?")) return;
                  try {
                    await hide({ data: { ids: thread.map((message) => message.id) } });
                    setActive("");
                    await refresh();
                    toast.success("Discussion supprimée.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Suppression impossible.");
                  }
                }} aria-label="Supprimer cette discussion" title="Supprimer cette discussion"><Trash2 size={16} /></button>
              )}
            </header>

            <div className="tc-messaging-chat-body">
              <div className="tc-messaging-day-divider"><span>VOTRE CONVERSATION</span></div>
              {adminTyping && <p className="text-xs italic text-muted-foreground animate-pulse my-2">L’équipe TClean est en train d’écrire…</p>}
              {thread.length === 0 ? (
                <div className="tc-messaging-welcome">
                  <div className="tc-messaging-welcome-icon"><MessageCircle size={27} /></div>
                  <h2>Bonjour !</h2>
                  <p>Comment pouvons-nous vous aider ? Écrivez votre message à l’équipe TClean. Vous pouvez également joindre une photo ou une vidéo pour préciser votre demande.</p>
                  <div className="tc-messaging-suggestions"><span><Clock3 size={15} /> Suivi des demandes</span><span><Paperclip size={15} /> Photos et vidéos</span></div>
                  <div className="tc-messaging-bot-label"><img src={botAvatar} alt="" /><span>Assistant TClean · réponses instantanées</span></div>
                  <div className="tc-messaging-quick-replies">
                    {[
                      "Comment préparer mon canapé ?",
                      "Combien de temps pour le séchage ?",
                      "Comment traiter une tache ?",
                      "Comment connaître le tarif ?",
                    ].map((question) => <button key={question} type="button" className="tc-messaging-quick-reply" disabled={botBusy} onClick={() => askBotQuestion(question)}>{question}</button>)}
                  </div>
                </div>
              ) : (
                <div className="tc-messaging-thread">
                  {thread.map((message) => (
                    <article key={message.id} className={message.is_admin ? "tc-message-row received" : "tc-message-row sent"}>
                      {message.is_admin && ((message as { is_bot?: boolean }).is_bot
                        ? <img src={botAvatar} alt="Assistant TClean" width={34} height={34} className="tc-message-avatar-img" />
                        : <span className="tc-messaging-avatar tc-message-avatar-small">T</span>)}
                      <div className="tc-message-stack">
                        <div className="tc-message-sender">{message.is_admin ? ((message as { is_bot?: boolean }).is_bot ? "Assistant TClean" : "Équipe TClean") : "Vous"}</div>
                        <div className={message.is_admin ? "tc-message-bubble received-bubble" : "tc-message-bubble sent-bubble"}>
                          {(message as { is_bot?: boolean }).is_bot && <strong>TClean</strong>}
                          {message.body && <p className="whitespace-pre-line">{message.body}</p>}
                          {message.attachment && <MediaButton path={message.attachment} label="Ouvrir le fichier joint" />}
                        </div>
                        <small className="tc-message-time">
                          {time(message.created_at)}
                          {!message.is_admin && <span className="tc-message-read-status"> · {message.read_at ? "Lu par TClean" : "Envoyé"}</span>}
                        </small>
                      </div>
                    </article>
                  ))}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <div className="tc-messaging-composer-wrap">
              {file && <div className="tc-messaging-file-preview"><Paperclip size={16} /><span>{file.name}</span><button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} aria-label="Retirer la pièce jointe"><X size={16} /></button></div>}
              <form onSubmit={submit} className="tc-messaging-composer">
                <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                <button type="button" className="tc-messaging-attach" aria-label="Joindre une photo ou une vidéo" title="Joindre une photo ou une vidéo" onClick={() => fileRef.current?.click()}><Paperclip size={20} /></button>
                <textarea value={body} maxLength={2000} rows={1} onChange={(event) => handleClientTyping(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    (event.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                  }
                }} placeholder="Écrivez votre message… (Entrée pour envoyer)" aria-label="Votre message" />
                <button type="submit" className="tc-messaging-send" disabled={busy || (!body.trim() && !file)} aria-label="Envoyer le message">
                  {busy ? <span className="tc-messaging-spinner" /> : <Send size={18} />}
                  <span>{busy ? "Envoi…" : "Envoyer"}</span>
                </button>
              </form>
              <div className="tc-messaging-composer-hint"><span>Entrée pour envoyer</span><span>Maj + Entrée pour un retour à la ligne</span><span>Fichiers jusqu’à 20 Mo</span></div>
              <div className="tc-messaging-bot-question">
                <button type="button" className="tc-messaging-bot-toggle" onClick={() => setBotQuestion((current) => current ? "" : " ")} disabled={botBusy}><Sparkles size={15} /> Poser une question à l’assistant TClean</button>
                {botQuestion !== "" && <form onSubmit={(event) => { event.preventDefault(); if (botQuestion.trim()) void askBotQuestion(botQuestion.trim()); }} className="tc-messaging-bot-form">
                  <input value={botQuestion.trimStart()} onChange={(event) => setBotQuestion(event.target.value)} maxLength={500} placeholder="Votre question sur les tissus, taches ou séchage…" aria-label="Question à l’assistant TClean" />
                  <button type="submit" disabled={botBusy || botQuestion.trim().length < 2}>{botBusy ? "Réponse…" : "Demander"}</button>
                </form>}
              </div>
            </div>
          </main>
        </div>
      )}
      <div className="tc-messaging-security-note"><ShieldCheck size={17} /><span>Votre confidentialité compte. Les messages sont accessibles depuis votre compte client.</span></div>
    </section>
  );
}
