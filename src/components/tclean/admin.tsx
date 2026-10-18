import { AdminAdmins } from "./admin-admins";
import { AdminInterventions } from "./admin-interventions";
import { AdminDiscounts, AdminReviews } from "./admin-extras";
import { AdminMessages } from "./admin-messages";
import { AdminAvailability } from "./admin-availability";
import { AdminSav } from "./admin-sav";
import { AdminCommercial } from "./admin-commercial";
import { FurnitureSvg } from "./furniture-svg";
import { summarize, type Configuration } from "@/lib/configurator";
import { useEffect, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, LogOut, Plus, X, Image, MessageSquare, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { businessQuery } from "@/lib/business-query";
import { type BusinessConfig } from "@/lib/business";
import {
  getAdminData,
  saveBusiness,
  updateRequest,
  getPhotoUrl,
  getReviews,
  deleteRequests,
  prepareInterventionMedia,
} from "@/lib/business.functions";
import { SelectionBar, SelectBox } from "./selection-bar";
import { themeOptions, annualThemes, type SeasonalThemeSettings } from "@/lib/seasonal-theme";
import { siteMediaSchema } from "@/lib/interventions";
type Seen = { reviews: string; msgs: Record<string, string> };
const readSeen = (): Seen => {
  try {
    return { reviews: "", msgs: {}, ...JSON.parse(localStorage.getItem("tclean-admin-seen") || "{}") };
  } catch {
    return { reviews: "", msgs: {} };
  }
};
const Badge = ({ n }: { n: number }) =>
  n > 0 ? (
    <span className="nav-badge" aria-label={`${n} nouveau${n > 1 ? "x" : ""}`}>
      {n}
    </span>
  ) : null;
import { PageHeading } from "./shared";
import { toast } from "sonner";

export function AdminPage() {
  const { data: c } = useSuspenseQuery(businessQuery);
  const qc = useQueryClient();
  const load = useServerFn(getAdminData);
  const save = useServerFn(saveBusiness);
  const prepareHeroUpload = useServerFn(prepareInterventionMedia);
  const [session, setSession] = useState(false);
  const [checked, setChecked] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminData>> | null>(null);
  const [config, setConfig] = useState<BusinessConfig>(c);
  const [tab, setTab] = useState("Demandes");
  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "Messagerie") setTab("Messagerie");
  }, []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeConvId, setActiveConvId] = useState<string>("");
  const delReq = useServerFn(deleteRequests);
  const [selReq, setSelReq] = useState<Set<string>>(new Set());
  const [selConv, setSelConv] = useState<Set<string>>(new Set());
  const refresh = () =>
    load()
      .then((d) => {
        setData(d);
        if (!activeConvId && d.requests[0]?.id) setActiveConvId(d.requests[0].id);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
      setChecked(true);
      if (data.session) refresh();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(!!s);
      setChecked(true);
      if (s) refresh();
      else setData(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("Identifiants incorrects ou compte introuvable.");
  };

  const handleHeroMediaUpload = async (file?: File) => {
    if (!file) return;
    const validation = siteMediaSchema.safeParse({ type: file.type, size: file.size });
    if (!validation.success) {
      toast.error("Photo JPG/PNG/WebP : 5 Mo maximum. Vidéo MP4/WebM/MOV : 20 Mo maximum.");
      return;
    }
    setUploadingHero(true);
    try {
      const signed = await prepareHeroUpload({ data: validation.data });
      const uploaded = await supabase.storage
        .from("site-images")
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (uploaded.error) throw new Error("Envoi du fichier impossible. Vérifie le format et réessaie.");
      setConfig(previous => ({ ...previous, heroPhoto: signed.url }));
      toast.success("Fichier envoyé. Clique ensuite sur « Enregistrer les modifications » pour l’appliquer au site.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi du fichier impossible.");
    } finally {
      setUploadingHero(false);
    }
  };

  const persist = async () => {
    setBusy(true);
    setError("");
    try {
      await save({ data: config });
      qc.invalidateQueries({ queryKey: ["business"] });
      toast.success("Modifications enregistrées.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const field = (
    key: keyof Pick<
      BusinessConfig,
      | "name"
      | "phone"
      | "city"
      | "radius"
      | "email"
      | "hours"
      | "about"
      | "legalIdentity"
      | "legalAddress"
      | "registration"
      | "cancellation"
      | "paymentMethods"
      | "heroTitle"
      | "heroSubtitle"
      | "socialUrl"
    >,
    label: string,
    type = "text",
  ) => (
    <div className="field">
      <label>{label}</label>
      {type === "textarea" ? (
        <textarea value={config[key] as string} onChange={(e) => setConfig({ ...config, [key]: e.target.value })} />
      ) : (
        <input
          type={type}
          value={config[key] as string}
          onChange={(e) => setConfig({ ...config, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        />
      )}
    </div>
  );

  const [seen, setSeen] = useState<Seen>(readSeen);
  const allReviews = useServerFn(getReviews);
  const [reviewsList, setReviewsList] = useState<Awaited<ReturnType<typeof getReviews>>>([]);
  useEffect(() => {
    if (session)
      allReviews()
        .then(setReviewsList)
        .catch(() => {});
  }, [session]);
  const newReviews = reviewsList.filter((r) => !seen.reviews || r.created_at > seen.reviews).length;
  const unreadPerConv = (reqId: string) => {
    const lastSeen = seen.msgs[reqId] || "";
    const msgs = data?.messages.filter((m) => m.request_id === reqId && !m.is_admin) || [];
    return msgs.filter((m) => !lastSeen || m.created_at > lastSeen).length;
  };
  const totalUnreadMsgs = (data?.requests || []).reduce((acc, r) => acc + unreadPerConv(r.id), 0);
  const markConvRead = (reqId: string) => {
    const latest = data?.messages.filter((m) => m.request_id === reqId).slice(-1)[0]?.created_at;
    if (!latest) return;
    const next = { ...seen, msgs: { ...seen.msgs, [reqId]: latest } };
    setSeen(next);
    localStorage.setItem("tclean-admin-seen", JSON.stringify(next));
  };
  const markReviewsRead = () => {
    const latest = reviewsList[0]?.created_at || new Date().toISOString();
    const next = { ...seen, reviews: latest };
    setSeen(next);
    localStorage.setItem("tclean-admin-seen", JSON.stringify(next));
  };

  const ordersOnly = (data?.requests || []).filter((r) => r.kind === "booking" || r.kind === "quote");
  const conversations = (data?.requests || []).slice().sort((a, b) => {
    const aMsgs = (data?.messages || []).filter((m) => m.request_id === a.id);
    const bMsgs = (data?.messages || []).filter((m) => m.request_id === b.id);
    const aLatest = aMsgs[aMsgs.length - 1]?.created_at || a.created_at;
    const bLatest = bMsgs[bMsgs.length - 1]?.created_at || b.created_at;
    return bLatest.localeCompare(aLatest);
  });
  const demandesCount = ordersOnly.filter((r) => r.status === "pending").length;

  const currentThemeSettings: SeasonalThemeSettings = {
    mode: "automatic",
    manualTheme: "none",
    audience: "all",
    enabled: true,
    ...(config.seasonalTheme ?? {}),
  };

  return (
    <>
      <PageHeading
        title="Administration TClean"
        description="Gestion des réservations, demandes de devis et informations commerciales réelles."
        breadcrumbs={[{ label: "Accueil", to: "/" }, { label: "Administration" }]}
      />
      <section className="container-main section">
        {!checked ? null : !session ? (
          <div className="form-panel auth-panel">
            <h2>Connexion administrateur</h2>
            <form onSubmit={login} className="mt-5">
              <div className="field">
                <label htmlFor="admin-email">E-mail</label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="field">
                <label htmlFor="admin-password">Mot de passe</label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                Se connecter
              </Button>
            </form>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/administration`,
                });
                if (result.error) setError("Connexion Google indisponible.");
              }}
            >
              Continuer avec Google
            </Button>
            <p className="text-xs text-muted-foreground mt-5">
              L’accès aux données est réservé aux comptes auxquels le propriétaire a attribué un rôle administrateur.
            </p>
          </div>
        ) : !data ? (
          <p>Chargement de l’espace administrateur…</p>
        ) : !data.allowed ? (
          <div className="notice">
            <h2>Accès administrateur non attribué</h2>
            <p className="mt-4">
              Votre compte est connecté, mais ne dispose pas du rôle administrateur. Les demandes clients restent
              protégées.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => supabase.auth.signOut()}>
              Se déconnecter
            </Button>
          </div>
        ) : (
          <>
            <div className="inline-actions justify-between mb-7">
              <div>
                <h2>{ordersOnly.length} commande(s) reçue(s)</h2>
                <p className="text-muted-foreground text-xs mt-2">
                  {ordersOnly.filter((r) => r.status === "pending").length} en attente ·{" "}
                  {ordersOnly.filter((r) => r.kind === "booking" && r.status === "confirmed").length} réservation(s)
                  confirmée(s)
                </p>
              </div>
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                <LogOut />
                Déconnexion
              </Button>
            </div>
            <div className="admin-tabs">
              {[
                "Demandes",
                "Messagerie",
                "SAV",
                "Budget",
                "Prestations & tarifs",
                "Disponibilités",
                "Entreprise",
                "Événements & saisons",
                "Contenus",
                "Zones",
                "Photos & FAQ",
                "Réalisations",
                "Codes promo",
                "Avis",
                "Administrateurs",
              ].map((t) => (
                <Button
                  key={t}
                  variant={tab === t ? "default" : "outline"}
                  onClick={() => {
                    setTab(t);
                    if (t === "Messagerie" && !activeConvId && data.requests[0]?.id)
                      setActiveConvId(data.requests[0].id);
                  }}
                >
                  {t}
                  {t === "Demandes" && <Badge n={demandesCount} />}
                  {t === "Messagerie" && <Badge n={totalUnreadMsgs} />}
                  {t === "Avis" && <Badge n={newReviews} />}
                </Button>
              ))}
            </div>

            {tab === "Demandes" && (
              <div className="admin-list">
                <SelectionBar
                  ids={ordersOnly.map((r) => r.id)}
                  selected={selReq}
                  setSelected={setSelReq}
                  noun="demande(s)"
                  onDelete={async (ids) => {
                    await delReq({ data: { ids } });
                    await refresh();
                  }}
                />
                {ordersOnly.length === 0 ? (
                  <p>Aucune commande reçue pour le moment.</p>
                ) : (
                  ordersOnly.map((r) => (
                    <div key={r.id} className="selectable-row">
                      <SelectBox
                        id={r.id}
                        selected={selReq}
                        setSelected={setSelReq}
                        label={`Sélectionner la demande de ${r.customer_name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <RequestItem
                          request={r}
                          messages={data.messages.filter((m) => m.request_id === r.id)}
                          refresh={refresh}
                          unread={unreadPerConv(r.id)}
                          markRead={() => markConvRead(r.id)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {tab === "Messagerie" && (
              <div>
                <SelectionBar
                  ids={conversations.map((r) => r.id)}
                  selected={selConv}
                  setSelected={setSelConv}
                  noun="discussion(s)"
                  onDelete={async (ids) => {
                    await delReq({ data: { ids } });
                    setSelConv(new Set());
                    await refresh();
                  }}
                />
                <div className="admin-messages-layout">
                  <aside className="admin-conv-list" aria-label="Liste des conversations">
                    <div className="admin-conv-list-header">
                      <strong>Conversations ({conversations.length})</strong>
                      <span className="text-xs text-muted-foreground">{totalUnreadMsgs} non lu(s)</span>
                    </div>
                    {conversations.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground">Aucune conversation.</p>
                    ) : (
                      conversations.map((r) => {
                        const convMsgs = (data.messages || []).filter((m) => m.request_id === r.id);
                        const lastMsg = convMsgs[convMsgs.length - 1];
                        const unread = unreadPerConv(r.id);
                        const isActive = (activeConvId || conversations[0]?.id) === r.id;
                        const hasOrdered = r.kind === "booking" || r.kind === "quote";
                        return (
                          <div
                            key={r.id}
                            className={`admin-conv-item ${isActive ? "active" : ""}`}
                            onClick={() => {
                              setActiveConvId(r.id);
                              markConvRead(r.id);
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="admin-conv-avatar-wrapper">
                              <SelectBox
                                id={r.id}
                                selected={selConv}
                                setSelected={setSelConv}
                                label={`Sélectionner ${r.customer_name}`}
                              />
                              <div className="admin-conv-avatar">
                                {r.customer_name.slice(0, 2).toUpperCase()}
                                {hasOrdered && (
                                  <span
                                    className="admin-conv-order-badge"
                                    title="Client ayant commandé (devis ou réservation)"
                                    aria-label="Client ayant commandé"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="admin-conv-body">
                              <div className="admin-conv-row">
                                <span className="admin-conv-name">{r.customer_name}</span>
                                <span className="admin-conv-date">
                                  {new Date(lastMsg?.created_at || r.created_at).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="admin-conv-preview">
                                {lastMsg ? (lastMsg.is_admin ? "Vous : " : "") + lastMsg.body : "Aucun message"}
                              </div>
                            </div>
                            {unread > 0 && <span className="nav-badge">{unread}</span>}
                          </div>
                        );
                      })
                    )}
                  </aside>
                  <main className="admin-conv-main">
                    {(() => {
                      const cur = conversations.find((r) => r.id === (activeConvId || conversations[0]?.id));
                      if (!cur) return <p className="p-6 text-muted-foreground">Sélectionnez une conversation.</p>;
                      const msgs = (data.messages || []).filter((m) => m.request_id === cur.id);
                      return (
                        <div>
                          <div className="admin-conv-header">
                            <div>
                              <h3 className="text-base font-semibold">{cur.customer_name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {cur.phone} · {cur.email} · {cur.city || "Ville non précisée"}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-muted">
                              {cur.kind === "booking"
                                ? "Réservation"
                                : cur.kind === "quote"
                                  ? "Devis"
                                  : "Contact simple"}
                            </span>
                          </div>
                          <AdminMessages requestId={cur.id} messages={msgs} refresh={refresh} />
                        </div>
                      );
                    })()}
                  </main>
                </div>
              </div>
            )}
            {tab === "SAV" && <AdminSav />}
            {tab === "Budget" && <AdminCommercial requests={data.requests} />}
            {tab === "Codes promo" && <AdminDiscounts />}
            {tab === "Avis" && <AdminReviews onSeen={markReviewsRead} />}
            {tab === "Administrateurs" && <AdminAdmins />}
            {tab === "Prestations & tarifs" && (
              <>
                <div className="field-grid">
                  <div className="field">
                    <label>Frais de déplacement forfaitaires (€ TTC)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.travelFee ?? ""}
                      placeholder="Gratuit (0 €)"
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          travelFee: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                    <small>TClean applique 9 € sous 30 €, gratuit dès 30 €.</small>
                  </div>
                  <div className="field">
                    <label>Déplacement offert à partir de (€ TTC)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.travelFreeFrom}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          travelFreeFrom: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Montant minimal de commande (€ TTC)</label>
                    <input
                      type="number"
                      min={0}
                      value={config.minimum ?? ""}
                      placeholder="Aucun minimum"
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          minimum: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <h3 className="mt-8 mb-4">Grille du configurateur de canapés (€ TTC)</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Ces montants sont appliqués en direct sur le devis interactif et recalculés côté serveur.
                </p>
                <div className="field-grid">
                  {[
                    ["sofa2", "Canapé 2 places"],
                    ["sofa3", "Canapé 3 places"],
                    ["sofa4", "Canapé 4 places"],
                    ["sofa5", "Canapé 5 places"],
                    ["angle", "Canapé d’angle"],
                    ["panoramic", "Canapé panoramique (U)"],
                    ["armchair", "Fauteuil"],
                    ["pouf", "Pouf"],
                    ["decoCushion", "Coussin décoratif"],
                    ["chair1", "Chaise (l’unité)"],
                    ["chair4", "Chaises (lot de 4)"],
                    ["chair6", "Chaises (lot de 6)"],
                    ["chair8", "Chaises (lot de 8)"],
                    ["mattress1one", "Matelas 1 place (1 face)"],
                    ["mattress1two", "Matelas 1 place (2 faces)"],
                    ["mattress2one", "Matelas 2 places (1 face)"],
                    ["mattress2two", "Matelas 2 places (2 faces)"],
                  ].map(([key, label]) => (
                    <div className="field" key={key}>
                      <label>{label}</label>
                      <input
                        type="number"
                        min={0}
                        value={config.configuratorPrices[key] ?? ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            configuratorPrices: {
                              ...config.configuratorPrices,
                              [key]: Number(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>

                <h3 className="mt-8 mb-4">Pages de prestations visibles</h3>
                <div className="admin-list">
                  {config.services.map((s, i) => (
                    <div className="admin-item" key={s.slug}>
                      <div className="field-grid">
                        <div className="field">
                          <label>Nom de la prestation</label>
                          <input
                            value={s.name}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                services: config.services.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)),
                              })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Prix de départ par meuble (€ TTC)</label>
                          <input
                            type="number"
                            min={0}
                            value={s.price ?? ""}
                            placeholder="Sur devis"
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                services: config.services.map((v, j) =>
                                  j === i ? { ...v, price: e.target.value === "" ? null : Number(e.target.value) } : v,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="field">
                        <label>Description</label>
                        <textarea
                          value={s.description}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              services: config.services.map((v, j) =>
                                j === i ? { ...v, description: e.target.value } : v,
                              ),
                            })
                          }
                        />
                      </div>
                      <label className="choice-label">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              services: config.services.map((v, j) =>
                                j === i ? { ...v, enabled: e.target.checked } : v,
                              ),
                            })
                          }
                        />
                        Prestation effectivement proposée et visible
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab === "Événements & saisons" && (
              <div className="admin-list">
                <div className="admin-item">
                  <h3>Adaptation automatique du calendrier</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Le site TClean détecte automatiquement la date du jour (heure de Paris) et calcule les fêtes mobiles
                    (dont Pâques) pour activer un ruban et une ambiance graphique adaptée sans modifier vos tarifs ni
                    vos coordonnées.
                  </p>

                  <label className="choice-label mb-4">
                    <input
                      type="checkbox"
                      checked={currentThemeSettings.enabled}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          seasonalTheme: {
                            ...currentThemeSettings,
                            enabled: e.target.checked,
                          },
                        })
                      }
                    />
                    Activer les décorations saisonnières sur le site
                  </label>

                  <div className="field-grid">
                    <div className="field">
                      <label>Mode de fonctionnement</label>
                      <select
                        value={currentThemeSettings.mode}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            seasonalTheme: {
                              ...currentThemeSettings,
                              mode: e.target.value as "automatic" | "manual",
                            },
                          })
                        }
                      >
                        <option value="automatic">Automatique (selon le calendrier réel de l’année)</option>
                        <option value="manual">Manuel (choisir un thème spécifique)</option>
                      </select>
                      <small>En mode automatique, le thème bascule seul à la date prévue.</small>
                    </div>

                    <div className="field">
                      <label>Audience visible</label>
                      <select
                        value={currentThemeSettings.audience}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            seasonalTheme: {
                              ...currentThemeSettings,
                              audience: e.target.value as "all" | "client" | "admin",
                            },
                          })
                        }
                      >
                        <option value="all">Tout le monde (visiteurs, clients et administrateur)</option>
                        <option value="client">Visiteurs et clients uniquement</option>
                        <option value="admin">Administrateur uniquement (pour tester)</option>
                      </select>
                    </div>
                  </div>

                  {currentThemeSettings.mode === "manual" && (
                    <div className="field mt-4">
                      <label>Thème forcé</label>
                      <select
                        value={currentThemeSettings.manualTheme}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            seasonalTheme: {
                              ...currentThemeSettings,
                              manualTheme: e.target.value as SeasonalThemeSettings["manualTheme"],
                            },
                          })
                        }
                      >
                        {themeOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="admin-item">
                  <h3>Calendrier annuel des fêtes et saisons prises en charge</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {annualThemes().map((item) => (
                      <div key={item.id} className="p-3 border rounded text-xs bg-muted/40">
                        <strong>{item.name}</strong>
                        <p className="text-muted-foreground mt-1">{item.description}</p>
                        <span className="text-[10px] text-primary font-mono block mt-1">
                          Du {item.startsOn} au {item.endsOn}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === "Entreprise" && (
              <div className="field-grid">
                {field("name", "Nom commercial")}
                {field("phone", "Téléphone")}
                {field("email", "E-mail de contact", "email")}
                {field("city", "Ville principale")}
                {field("radius", "Rayon maximal (km)", "number")}
                {field("hours", "Horaires réels")}
                {field("legalIdentity", "Identité juridique")}
                {field("legalAddress", "Adresse professionnelle")}
                {field("registration", "SIRET")}
                {field("paymentMethods", "Moyens de paiement acceptés")}
                {field("socialUrl", "Lien réseau social (HTTPS)")}
              </div>
            )}
            {tab === "Contenus" && (
              <>
                <div className="field-grid">
                  {field("heroTitle", "Titre principal")}
                  {field("heroSubtitle", "Sous-titre")}
                </div>
                <div className="admin-item mt-5 mb-6">
                  <h3 className="font-semibold mb-2">Arrière-plan de la page d’accueil</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choisis une photo ou une vidéo à afficher derrière le titre principal. Photo : JPG, PNG ou WebP (5 Mo max). Vidéo : MP4, WebM ou MOV (20 Mo max).
                  </p>
                  {config.heroPhoto && (
                    <div className="mb-4 overflow-hidden rounded-lg">
                      {/\.(mp4|webm|mov)(\?|$)/i.test(config.heroPhoto) ? (
                        <video src={config.heroPhoto} muted loop autoPlay playsInline className="w-full max-h-64 object-cover" />
                      ) : (
                        <img src={config.heroPhoto} alt="Aperçu de l’arrière-plan de l’accueil" className="w-full max-h-64 object-cover" />
                      )}
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="hero-media-upload">Importer une nouvelle photo ou vidéo</label>
                    <input
                      id="hero-media-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                      disabled={uploadingHero || busy}
                      onChange={e => {
                        const file = e.currentTarget.files?.[0];
                        void handleHeroMediaUpload(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  {uploadingHero && <p className="text-sm text-muted-foreground mt-2">Envoi du fichier en cours…</p>}
                  <p className="text-xs text-muted-foreground mt-3">Après l’envoi, clique sur « Enregistrer les modifications » en bas de la page pour publier ce choix. Tu pourras revenir ici et le changer quand tu veux.</p>
                </div>
                {field("about", "Présentation de l’entreprise", "textarea")}
                {field("cancellation", "Conditions d’annulation", "textarea")}
              </>
            )}
            {tab === "Zones" && (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Communes desservies pour la vérification du code postal sur le site.
                </p>
                {config.areas.map((a, i) => (
                  <div className="admin-item mb-4" key={i}>
                    <div className="field-grid">
                      <div className="field">
                        <label>Nom de la commune</label>
                        <input
                          value={a.name}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              areas: config.areas.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)),
                            })
                          }
                        />
                      </div>
                      <div className="field">
                        <label>Code(s) postal(aux)</label>
                        <input
                          value={a.codes}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              areas: config.areas.map((v, j) => (j === i ? { ...v, codes: e.target.value } : v)),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          className="mt-2"
                          onClick={() => setConfig({ ...config, areas: config.areas.filter((_, j) => j !== i) })}
                        >
                          <X />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setConfig({ ...config, areas: [...config.areas, { name: "", codes: "" }] })}
                >
                  <Plus />
                  Ajouter une commune
                </Button>
              </>
            )}
            {tab === "Réalisations" && (
              <AdminInterventions
                gallery={config.gallery}
                onChange={(gallery) => setConfig((previous) => ({ ...previous, gallery }))}
                onPublished={() => qc.invalidateQueries({ queryKey: ["business"] })}
              />
            )}
            {tab === "Photos & FAQ" && (
              <>
                <h2 className="mb-5">Photographies réelles autorisées</h2>
                {config.gallery.map((g, i) => (
                  <div className="admin-item mb-4" key={i}>
                    {(["title", "category", "url", "beforeUrl"] as const).map((k) => (
                      <div className="field" key={k}>
                        <label>
                          {
                            {
                              title: "Description",
                              category: "Catégorie",
                              url: "Image après / photo (HTTPS)",
                              beforeUrl: "Image avant (facultative, HTTPS)",
                            }[k]
                          }
                        </label>
                        <input
                          value={g[k]}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              gallery: config.gallery.map((v, j) => (j === i ? { ...v, [k]: e.target.value } : v)),
                            })
                          }
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => setConfig({ ...config, gallery: config.gallery.filter((_, j) => j !== i) })}
                    >
                      Retirer cette photo
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfig({
                      ...config,
                      gallery: [...config.gallery, { url: "", beforeUrl: "", title: "", category: "Canapés" }],
                    })
                  }
                >
                  <Plus />
                  Ajouter une photo
                </Button>

                <h2 className="mt-8 mb-5">Questions fréquentes</h2>
                {config.faqs.map((f, i) => (
                  <div className="admin-item mb-4" key={i}>
                    <div className="field">
                      <label>Question</label>
                      <input
                        value={f.q}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            faqs: config.faqs.map((v, j) => (j === i ? { ...v, q: e.target.value } : v)),
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Réponse</label>
                      <textarea
                        value={f.a}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            faqs: config.faqs.map((v, j) => (j === i ? { ...v, a: e.target.value } : v)),
                          })
                        }
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
            {tab === "Disponibilités" && (
              <AdminAvailability
                slots={data.slots}
                duration={config.bookingDuration}
                onDurationChange={(duration) => setConfig({ ...config, bookingDuration: duration })}
                saveDuration={persist}
                refresh={refresh}
              />
            )}
            {tab !== "Demandes" && tab !== "Disponibilités" && tab !== "Messagerie" && (
              <Button className="mt-8" size="lg" disabled={busy} onClick={persist}>
                <Save />
                {busy ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            )}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}

function RequestItem({
  request: r,
  messages,
  refresh,
  unread,
  markRead,
}: {
  unread: number;
  markRead: () => void;
  request: Awaited<ReturnType<typeof getAdminData>>["requests"][number];
  messages: {
    id: string;
    request_id: string;
    is_admin: boolean;
    body: string;
    attachment: string;
    created_at: string;
  }[];
  refresh: () => void;
}) {
  const update = useServerFn(updateRequest);
  const photo = useServerFn(getPhotoUrl);
  const [status, setStatus] = useState(r.status);
  const [notes, setNotes] = useState(r.internal_notes);
  const [amount, setAmount] = useState(r.amount?.toString() ?? "");
  const [error, setError] = useState("");
  const details = typeof r.details === "object" && r.details !== null ? r.details : {};
  return (
    <article
      className="admin-item"
      onClick={() => {
        if (unread) markRead();
      }}
    >
      <div className="admin-request-head">
        <div>
          <h3>
            {r.customer_name} · {r.kind === "booking" ? "Réservation" : r.kind === "contact" ? "Contact" : "Devis"}
            {r.status === "pending" && <span className="nav-badge">Nouvelle</span>}
            {unread > 0 && (
              <span
                className="nav-badge"
                aria-label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}
              >
                {unread} message{unread > 1 ? "s" : ""}
              </span>
            )}
          </h3>
          <p>
            {new Date(r.created_at).toLocaleString("fr-FR")} · Réf. {r.id.slice(0, 8).toUpperCase()}
          </p>
          <a href={`tel:${r.phone}`} className="text-sm">
            {r.phone}
          </a>{" "}
          ·{" "}
          <a href={`mailto:${r.email}`} className="text-sm">
            {r.email}
          </a>
          <p className="text-xs text-muted-foreground mt-1">
            {r.address ? `${r.address}, ` : ""}
            {r.postal_code} {r.city}
          </p>
        </div>
        <span
          className={`status-pill ${
            r.status === "pending"
              ? "status-pending"
              : r.status === "confirmed"
                ? "status-confirmed"
                : r.status === "completed"
                  ? "status-completed"
                  : "status-cancelled"
          }`}
        >
          {r.status === "pending"
            ? "En attente"
            : r.status === "confirmed"
              ? "Confirmée"
              : r.status === "completed"
                ? "Terminée"
                : "Annulée"}
        </span>
      </div>

      <div className="mt-4 text-xs space-y-1">
        {"service" in details && <p>Prestation : {String(details.service)}</p>}
        {"quantity" in details && <p>Quantité : {String(details.quantity)}</p>}
        {"size" in details && <p>Format : {String(details.size)}</p>}
        {"condition" in details && <p>État : {String(details.condition)}</p>}
        {"date" in details && <p>Date souhaitée : {String(details.date)}</p>}
        {"message" in details && details.message && <p className="italic mt-2">« {String(details.message)} »</p>}
      </div>

      {details.configurator && typeof details.configurator === "object" && (
        <div className="admin-cfg-preview mt-4">
          <h4>Mobilier configuré</h4>
          <p className="text-xs text-muted-foreground mb-3">{summarize(details.configurator as Configuration)}</p>
          <div className="admin-cfg-visual">
            <FurnitureSvg cfg={details.configurator as Configuration} />
          </div>
        </div>
      )}

      {r.photos && r.photos.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold mb-2">Photos fournies :</p>
          <div className="flex gap-2 flex-wrap">
            {r.photos.map((p, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const { url } = await photo({ data: { path: p } });
                    window.open(url, "_blank");
                  } catch (e) {
                    setError("Chargement de la photo impossible.");
                  }
                }}
              >
                <Image />
                Photo {i + 1}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="field-grid mt-5">
        <div className="field">
          <label>Statut de la demande</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmée</option>
            <option value="completed">Terminée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
        <div className="field">
          <label>Montant final (€ TTC)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            placeholder="Calculé automatiquement"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Notes internes (privées, invisibles pour le client)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await update({
              data: {
                id: r.id,
                status,
                internal_notes: notes,
                amount: amount === "" ? null : Number(amount),
              },
            });
            refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Modification impossible.");
          }
        }}
      >
        <Save />
        Mettre à jour
      </Button>
      {r.user_id && <AdminMessages requestId={r.id} messages={messages} refresh={refresh} />}
      {error && <p className="form-error">{error}</p>}
    </article>
  );
}
