import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, Send, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminReply, getMediaUrl, deleteMessages, markMessagesRead } from "@/lib/business.functions";
import { SelectionBar, SelectBox } from "./selection-bar";
import botAvatar from "@/assets/tclean-bot.png";
import { supabase } from "@/integrations/supabase/client";

type Messages = {
  id: string;
  request_id: string;
  is_admin: boolean;
  is_bot?: boolean;
  read_at?: string | null;
  body: string;
  attachment: string;
  created_at: string;
}[];

export function AdminMessages({
  requestId,
  messages,
  refresh,
}: {
  requestId: string;
  messages: Messages;
  refresh: () => void;
}) {
  const reply = useServerFn(adminReply);
  const markRead = useServerFn(markMessagesRead);
  const open = useServerFn(getMediaUrl);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [isClientTyping, setIsClientTyping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const del = useServerFn(deleteMessages);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const thread = messages.filter((m) => m.request_id === requestId);

  useEffect(() => {
    let alive = true;
    const markIncomingRead = async () => {
      try {
        await markRead({ data: { request_id: requestId } });
        if (alive) refresh();
      } catch (error) {
        console.error("[TClean messenger] Impossible de confirmer la lecture.", error);
      }
    };
    void markIncomingRead();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2000);
    const onFocus = () => {
      if (document.visibilityState === "visible") void markIncomingRead();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [requestId, thread.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const channel = supabase.channel(`admin-thread-${requestId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages", filter: `request_id=eq.${requestId}` }, () => {
        void refresh();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canal Realtime pour l'indicateur "en train d'écrire"
  useEffect(() => {
    const channel = supabase
      .channel(`typing-${requestId}`)
      .on("broadcast", { event: "client-typing" }, () => {
        setIsClientTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsClientTyping(false), 2500);
      });
    typingChannelRef.current = channel;
    channel.subscribe();

    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [requestId]);

  const handleTyping = (text: string) => {
    setBody(text);
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "admin-typing",
      payload: { typing: true },
    }).catch(() => {});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setBusy(true);
    try {
      let attachment: {
        type: "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/webm";
        base64: string;
      } | null = null;
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error("Le fichier doit peser moins de 20 Mo.");
        attachment = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res({ type: file.type as "image/jpeg", base64: String(r.result).split(",")[1] ?? "" });
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }
      await reply({ data: { request_id: requestId, body: body.trim(), attachment } });
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Réponse envoyée, le client est informé en direct.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="msg-thread">
      <h4>Discussion privée</h4>
      <SelectionBar ids={thread.map((m) => m.id)} selected={sel} setSelected={setSel} noun="message(s)" onDelete={async (ids) => { await del({ data: { ids } }); refresh(); }} />
      {thread.length === 0 && <p className="text-sm text-muted-foreground">Aucun message échangé pour le moment.</p>}

      {thread.map((m) => {
        return (
          <div key={m.id} className={m.is_admin ? "msg msg-admin" : "msg msg-client"}>
            <p className="msg-meta">
              <SelectBox id={m.id} selected={sel} setSelected={setSel} label="Sélectionner ce message" />{" "}
              {m.is_bot && <img src={botAvatar} alt="" width={22} height={22} className="bot-avatar-sm" />}
              {m.is_bot ? "TClean" : m.is_admin ? "Vous (TClean)" : "Client"} ·{" "}
              {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            {m.body && <p>{m.body}</p>}
            {m.attachment && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const win = window.open("about:blank", "_blank");
                  try {
                    const url = await open({ data: m.attachment });
                    if (win) {
                      win.opener = null;
                      win.location.href = url;
                    }
                  } catch {
                    win?.close();
                    toast.error("Fichier inaccessible.");
                  }
                }}
              >
                <Paperclip size={14} /> Fichier joint
              </Button>
            )}
            {m.is_admin && (
              <span className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-1">
                {m.read_at ? (
                  <span className="inline-flex items-center gap-1 text-[11px] opacity-80">
                    <CheckCheck size={14} className="text-primary" /> Lu
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] opacity-70">
                    <Check size={14} /> Envoyé
                  </span>
                )}
              </span>
            )}
          </div>
        );
      })}

      {isClientTyping && (
        <p className="text-xs italic text-muted-foreground animate-pulse my-2">Le client est en train d'écrire…</p>
      )}

      <form onSubmit={submit} className="msg-form mt-4">
        <div className="field">
          <label htmlFor={`reply-${requestId}`}>Votre réponse</label>
          <textarea
            id={`reply-${requestId}`}
            value={body}
            maxLength={2000}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Écrivez votre message à destination du client…"
          />
        </div>
        <div className="inline-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            aria-label="Joindre une photo ou une vidéo"
          />
          <Button type="submit" variant="default" disabled={busy || (!body.trim() && !file)}>
            <Send size={15} /> {busy ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
