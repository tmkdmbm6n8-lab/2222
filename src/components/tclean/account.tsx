import { useEffect, useRef, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  CheckCheck,
  Camera,
  LogOut,
  MessageCircle,
  Paperclip,
  Send,
  ShoppingBag,
  UserRound,
  Shield,
  LifeBuoy,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ACCOUNT_DISCOUNT, PROFILE_DISCOUNT } from "@/lib/discounts";
import { getClientData, getMediaUrl, saveProfile, sendClientMessage, profileComplete } from "@/lib/business.functions";
import { PageHeading } from "./shared";
import { toast } from "sonner";
import { clientSummary } from "@/lib/client-summary";
import { useUnread } from "./contact-inbox";
import { ClientSav } from "./client-sav";

type ClientData = Awaited<ReturnType<typeof getClientData>>;
const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  accepted: "Devis accepté",
  refused: "Refusée",
  cancelled: "Annulée",
  completed: "Terminée",
  expired: "Expirée",
};
const kindLabels: Record<string, string> = { booking: "Réservation", quote: "Devis", contact: "Contact" };

export function MediaButton({ path, label }: { path: string; label: string }) {
  const open = useServerFn(getMediaUrl);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        const win = window.open("about:blank", "_blank");
        try {
          const url = await open({ data: path });
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
      <Paperclip />
      {label}
    </Button>
  );
}

export function MessageThread({
  requestId,
  messages,
  refresh,
}: {
  requestId: string;
  messages: ClientData["messages"];
  refresh: () => void;
}) {
  const send = useServerFn(sendClientMessage);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const thread = messages.filter((m) => m.request_id === requestId);
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
      await send({ data: { request_id: requestId, body: body.trim(), attachment } });
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Message envoyé à TClean.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="msg-thread">
      {thread.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun message pour le moment. Écrivez-nous, nous vous répondons ici.
        </p>
      )}
      {thread.map((m) => (
        <div key={m.id} className={m.is_admin ? "msg msg-admin" : "msg msg-client"}>
          <p className="msg-meta">
            {(m as { is_bot?: boolean }).is_bot ? "TClean" : m.is_admin ? "TClean" : "Vous"} · {new Date(m.created_at).toLocaleString("fr-FR")}
          </p>
          {m.body && <p>{m.body}</p>}
          {m.attachment && <MediaButton path={m.attachment} label="Voir le fichier joint" />}
        </div>
      ))}
      <form onSubmit={submit} className="msg-form">
        <div className="field">
          <label htmlFor={`msg-${requestId}`}>Votre message</label>
          <textarea
            id={`msg-${requestId}`}
            value={body}
            maxLength={2000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Écrivez à TClean…"
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
          <Button type="submit" disabled={busy || (!body.trim() && !file)}>
            <Send />
            {busy ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ProfileForm({ data, refresh }: { data: ClientData; refresh: () => void }) {
  const save = useServerFn(saveProfile);
  const p = data.profile;
  const [form, setForm] = useState({
    full_name: p?.full_name ?? "",
    phone: p?.phone ?? "",
    address: p?.address ?? "",
    postal_code: p?.postal_code ?? "",
    city: p?.city ?? "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const filled = [form.full_name, form.phone, form.address, form.postal_code, form.city].filter((v) => v.trim()).length;
  const hasPhoto = !!p?.photo_path || !!photo;
  const percent = Math.round(((filled + (hasPhoto ? 1 : 0)) / 6) * 100);
  const complete = profileComplete({ ...form }) && percent === 100;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let photoData: { type: "image/jpeg" | "image/png" | "image/webp"; base64: string } | null = null;
      if (photo) {
        if (photo.size > 5 * 1024 * 1024) throw new Error("La photo doit peser moins de 5 Mo.");
        photoData = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res({ type: photo.type as "image/jpeg", base64: String(r.result).split(",")[1] ?? "" });
          r.onerror = rej;
          r.readAsDataURL(photo);
        });
      }
      await save({ data: { ...form, photo: photoData } });
      toast.success("Profil enregistré.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="account-profile">
      <div className="inline-actions justify-between">
        <h2>Mon profil</h2>
        <strong>{percent} %</strong>
      </div>
      <div
        className="profile-progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm">
        {complete
          ? `Profil complet : ${PROFILE_DISCOUNT} % de réduction supplémentaires sont appliqués automatiquement, en plus des ${ACCOUNT_DISCOUNT} % du compte.`
          : `Complétez votre profil à 100 % (coordonnées + photo) pour obtenir ${PROFILE_DISCOUNT} % de réduction supplémentaires, cumulables.`}
      </p>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="pf-name">Nom complet</label>
          <input
            id="pf-name"
            value={form.full_name}
            maxLength={80}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-phone">Téléphone</label>
          <input
            id="pf-phone"
            type="tel"
            value={form.phone}
            maxLength={20}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-address">Adresse</label>
          <input
            id="pf-address"
            value={form.address}
            maxLength={200}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-cp">Code postal</label>
          <input
            id="pf-cp"
            value={form.postal_code}
            maxLength={10}
            onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-city">Commune</label>
          <input
            id="pf-city"
            value={form.city}
            maxLength={80}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pf-photo">Photo de profil</label>
          <input
            id="pf-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          {p?.photo_path && !photo && <small>Photo enregistrée.</small>}
        </div>
      </div>
      <Button type="submit" disabled={busy}>
        <Camera />
        {busy ? "Enregistrement…" : "Enregistrer mon profil"}
      </Button>
    </form>
  );
}

export function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ClientData | null>(null);
  const load = useServerFn(getClientData);
  const [view, setView] = useState<"orders" | "profile" | "sav">("orders");
  const [loadError, setLoadError] = useState(false);
  const unread = useUnread("/compte");

  const refresh = () =>
    load()
      .then((d) => {
        setData(d);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));

  useEffect(() => {
    let active = true;

    // Restore the saved browser session first. getSession() reads the persisted
    // session, while getUser() depends on a successful server request at startup.
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setEmail(data.session?.user.email ?? null);
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      setReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Détection administrateur
  const adminQuery = useQuery({
    queryKey: ["account-is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const res = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      return res.data === true;
    },
  });
  const isAdmin = adminQuery.data === true;

  useEffect(() => {
    if (!email) {
      setData(null);
      return;
    }
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    if (mode === "signup") {
      const r = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/compte` },
      });
      setMsg(
        r.error
          ? "Création impossible : vérifiez l’e-mail et choisissez un mot de passe d’au moins 6 caractères."
          : "Compte créé. Ouvrez l’e-mail de confirmation pour l’activer.",
      );
    } else {
      const r = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (r.error) setMsg("Connexion impossible. Vérifiez vos identifiants.");
    }
    setBusy(false);
  };

  const summary = clientSummary(data?.requests ?? []);

  return (
    <>
      <PageHeading
        title={isAdmin ? "Espace Administrateur & Client" : "Mon espace client"}
        description={
          email
            ? `Connecté avec ${email}.${isAdmin ? " Vous disposez des droits administrateur." : " Retrouvez vos nettoyages et vos échanges."}`
            : `Votre compte vous donne ${ACCOUNT_DISCOUNT} % de réduction sur chaque nettoyage.`
        }
      />
      <section className="section container-main account-page-section">
        {!ready ? (
          <p>Vérification…</p>
        ) : !email ? (
          <div className="account-auth-layout">
            <aside className="account-auth-story">
              <span className="account-auth-kicker">TCLEAN · ESPACE PRIVÉ</span>
              <h2>Le soin de votre intérieur continue ici.</h2>
              <p>Retrouvez vos demandes, suivez vos nettoyages et échangez directement avec notre équipe, dans un espace pensé pour vous.</p>
              <div className="account-auth-benefit">
                <span className="account-auth-benefit-icon"><BadgePercent size={20} /></span>
                <div><strong>{ACCOUNT_DISCOUNT} % de réduction</strong><small>Votre avantage client, appliqué automatiquement à vos nettoyages.</small></div>
              </div>
              <div className="account-auth-promise"><span /> Un espace personnel, simple et sécurisé</div>
            </aside>
            <div className="form-panel auth-panel">
            <div className="account-auth-form-kicker">BIENVENUE CHEZ TCLEAN</div>
            <div className="notice">
              <BadgePercent size={18} /> <strong>{ACCOUNT_DISCOUNT} % de réduction</strong> appliqués automatiquement à
              votre prix dans « Tarifs » dès que vous êtes connecté.
            </div>
            <h2 className="mt-6">{mode === "signup" ? "Créer mon compte" : "Me connecter"}</h2>
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="acc-email">E-mail</label>
                <input
                  id="acc-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="acc-pass">Mot de passe</label>
                <input
                  id="acc-pass"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signup" ? "Créer mon compte" : "Se connecter"}
              </Button>
            </form>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={async () => {
                const r = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/compte`,
                });
                if (r.error) setMsg("Connexion Google indisponible.");
              }}
            >
              Continuer avec Google
            </Button>
            {msg && (
              <p className="mt-4" role="status">
                {msg}
              </p>
            )}
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setMsg("");
              }}
            >
              {mode === "signup" ? "J’ai déjà un compte" : "Créer un compte"}
            </Button>
            </div>
          </div>
        ) : (
          <div className="account-space">
            {isAdmin && (
              <div className="notice my-4 bg-primary/10 border-primary p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-primary">
                    <Shield size={18} /> Rôle Administrateur actif
                  </h3>
                  <p className="text-sm mt-1">
                    Vous avez accès à la gestion des commandes, à la messagerie centralisée, aux disponibilités et aux
                    tarifs.
                  </p>
                </div>
                <Button asChild size="lg" className="shrink-0 gap-2">
                  <Link to="/administration">
                    <Shield size={16} /> Ouvrir le panneau d'administration
                  </Link>
                </Button>
              </div>
            )}

            <div className="account-welcome">
              <div className="account-welcome-info">
                <span className="eyebrow">{isAdmin ? "ESPACE ADMINISTRATEUR" : "BIENVENUE DANS VOTRE ESPACE CLIENT"}</span>
                <h2>{isAdmin ? "Votre espace TClean" : "Vos avantages TClean"}</h2>
                <p className="account-welcome-email"><span>Compte connecté</span><strong className="break-all">{email}</strong></p>
                <div className="account-member-benefit">
                  <span className="account-member-discount"><BadgePercent size={28} /> {ACCOUNT_DISCOUNT} %</span>
                  <div>
                    <strong>Votre avantage membre</strong>
                    <p>Profitez de votre réduction exclusive, automatiquement appliquée à vos nettoyages lorsque vous êtes connecté.</p>
                    <p><strong>Bonne nouvelle :</strong> toutes les réductions sont cumulables entre elles, y compris les offres promotionnelles et les réductions liées à votre profil.</p>
                    <Button asChild size="sm" className="account-benefit-cta">
                      <Link to="/configurateur">Demander mon devis</Link>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="inline-actions">
                {isAdmin && (
                  <Button asChild variant="default">
                    <Link to="/administration">
                      <Shield size={16} /> Panneau Admin
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link to="/configurateur">
                    <CalendarDays /> Réserver un nettoyage
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                  <LogOut /> Se déconnecter
                </Button>
              </div>
            </div>

            {loadError && (
              <div role="alert" className="notice">
                Votre espace n’a pas pu être actualisé.{" "}
                <Button variant="outline" size="sm" onClick={refresh}>
                  Réessayer
                </Button>
              </div>
            )}

            {!data ? (
              <p role="status">
                {loadError ? "Vos commandes sont momentanément indisponibles." : "Chargement de votre espace…"}
              </p>
            ) : (
              <>
                <dl className="account-stats" aria-label="Bilan de mes commandes">
                  {[
                    { label: "Commandes effectuées", value: summary.orders, Icon: ShoppingBag },
                    { label: "Nettoyages terminés", value: summary.completed, Icon: CheckCheck },
                    { label: "Réservations en cours", value: summary.upcoming, Icon: CalendarDays },
                    { label: "Messages non lus", value: unread, Icon: MessageCircle },
                  ].map(({ label, value, Icon }) => (
                    <div key={label}>
                      <Icon size={22} />
                      <dd>{value}</dd>
                      <dt>{label}</dt>
                    </div>
                  ))}
                </dl>

                <div className="account-tabs" role="tablist" aria-label="Mon espace client">
                  <Button
                    id="orders-tab"
                    role="tab"
                    aria-controls="orders-panel"
                    aria-selected={view === "orders"}
                    variant={view === "orders" ? "default" : "ghost"}
                    onClick={() => setView("orders")}
                  >
                    <ShoppingBag /> Mes commandes
                  </Button>
                  <Button
                    id="profile-tab"
                    role="tab"
                    aria-controls="profile-panel"
                    aria-selected={view === "profile"}
                    variant={view === "profile" ? "default" : "ghost"}
                    onClick={() => setView("profile")}
                  >
                    <UserRound /> Mon profil
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/contact">
                      <MessageCircle /> Messagerie{unread > 0 && <span className="nav-badge">{unread}</span>}
                    </Link>
                  </Button>
                  <Button
                    id="sav-tab"
                    role="tab"
                    aria-controls="sav-panel"
                    aria-selected={view === "sav"}
                    variant={view === "sav" ? "default" : "ghost"}
                    onClick={() => setView("sav")}
                  >
                    <LifeBuoy /> SAV
                  </Button>
                </div>

                {view === "profile" ? (
                  <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
                    <ProfileForm data={data} refresh={refresh} />
                  </div>
                ) : view === "sav" ? (
                  <div id="sav-panel" role="tabpanel" aria-labelledby="sav-tab">
                    <ClientSav />
                  </div>
                ) : (
                  <div id="orders-panel" role="tabpanel" aria-labelledby="orders-tab">
                    <div className="section-heading">
                      <h2>Mes commandes</h2>
                    </div>
                    {data.requests.length === 0 ? (
                      <div className="account-empty">
                        <ShoppingBag size={32} />
                        <h3>Votre premier nettoyage vous attend</h3>
                        <p>Aucune commande pour le moment.</p>
                        <Button asChild>
                          <Link to="/configurateur">Choisir mon nettoyage</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="account-orders">
                        {data.requests.map((r) => (
                          <article key={r.id} className="account-order">
                            <div className="inline-actions justify-between">
                              <strong>{kindLabels[r.kind] ?? r.kind}</strong>
                              <span className="account-status">{statusLabels[r.status] ?? r.status}</span>
                            </div>
                            <h3>Réf. {r.id.slice(0, 8).toUpperCase()}</h3>
                            <p className="text-sm text-muted-foreground">
                              Le{" "}
                              {new Date(r.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            <div className="inline-actions justify-between">
                              <strong>
                                {r.amount !== null ? `${Number(r.amount).toLocaleString("fr-FR")} € TTC` : "Sur devis"}
                              </strong>
                              <Button asChild variant="outline" size="sm">
                                <Link to="/contact">
                                  <MessageCircle /> Voir les messages
                                </Link>
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </>
  );
}
