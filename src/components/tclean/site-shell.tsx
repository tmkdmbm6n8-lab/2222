import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import {
  Phone,
  Menu,
  X,
  ArrowUpRight,
  CalendarDays,
  FileText,
  LogOut,
  UserRound,
  Shield,
  Headphones,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessQuery } from "@/lib/business-query";
import { telephone } from "@/lib/business";
import { useReviewRedirect, useUnread } from "./contact-inbox";
const baseNav = [
  { to: "/" as const, label: "Accueil" },
  { to: "/contact" as const, label: "Messagerie" },
  { to: "/realisations" as const, label: "Réalisations" },
  { to: "/devis" as const, label: "Demande spécifique sur devis" },
  { to: "/avis" as const, label: "Avis" },
  { to: "/sav" as const, label: "SAV" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const { data: config } = useSuspenseQuery(businessQuery);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const tel = `tel:${telephone(config)}`;
  const disabledPages: string[] = Array.isArray((config as typeof config & { disabledPages?: string[] }).disabledPages)
    ? (config as typeof config & { disabledPages?: string[] }).disabledPages!
    : [];
  const permanentlyDeletedPages: string[] = Array.isArray((config as typeof config & { permanentlyDeletedPages?: string[] }).permanentlyDeletedPages)
    ? (config as typeof config & { permanentlyDeletedPages?: string[] }).permanentlyDeletedPages!
    : [];
  const unavailablePages = [...new Set([...disabledPages, ...permanentlyDeletedPages])];

  useEffect(() => {
    const guardDisabledLinks = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      let path = "";
      try { path = new URL(anchor.href, window.location.origin).pathname; } catch { return; }
      if (!unavailablePages.includes(path)) return;
      event.preventDefault();
      event.stopPropagation();
      navigate({ to: "/", replace: true });
    };
    document.addEventListener("click", guardDisabledLinks, true);
    return () => document.removeEventListener("click", guardDisabledLinks, true);
  }, [unavailablePages.join("|"), navigate]);


  const unread = useUnread(pathname);
  useReviewRedirect(pathname);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signed = !!userId;

  const adminQuery = useQuery({
    queryKey: ["is-admin-shell", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return false;
      const result = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      return result.data === true;
    },
  });

  const isAdmin = adminQuery.data === true;
  const previewRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tclean-preview");
  useEffect(() => {
    if (!unavailablePages.includes(pathname)) return;
    if (previewRequested && adminQuery.isLoading) return;
    if (previewRequested && isAdmin) return;
    navigate({ to: "/", replace: true });
  }, [unavailablePages.join("|"), pathname, navigate, previewRequested, adminQuery.isLoading, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase.channel("tclean-admin-presence", { config: { presence: { key: "admin-viewer" } } });
    const track = () => channel.track({ role: "admin", online: document.visibilityState === "visible", at: new Date().toISOString() }).catch(() => {});
    channel.subscribe((status) => { if (status === "SUBSCRIBED") track(); });
    const onVisibility = () => track();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); supabase.removeChannel(channel); };
  }, [isAdmin, userId]);


  const logout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const nav = (isAdmin ? [...baseNav, { to: "/administration" as const, label: "Admin" }] : baseNav).filter(item => !unavailablePages.includes(item.to));

  const label = (item: { to: string; label: string }) => (
    <>
      {item.to === "/administration" && <Shield size={14} className="inline mr-1 text-primary" />}
      {item.label}

      {item.to === "/contact" && unread > 0 && (
        <span
          className="nav-badge"
          aria-label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}
        >
          {unread}
        </span>
      )}
    </>
  );

  return (
    <>
      <header className="site-header">
        <div className="container-main header-inner">
          <Link to="/" className="brand" aria-label={`${config.name} — Accueil`}>
            <img src={config.logo} alt={config.name} width={142} height={50} />
            <div className="brand-caption">Le soin de votre intérieur</div>
          </Link>

          <nav className="desktop-nav" aria-label="Navigation principale">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} className={pathname === item.to ? "active" : ""}>
                {label(item)}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <Button asChild variant="outline" size="icon" className="header-icon-button" title={signed ? "Mon compte" : "Connexion"} aria-label={signed ? "Mon compte" : "Connexion"}>
              <Link to="/compte" aria-label={signed ? "Mon compte" : "Connexion"}>
                <UserRound size={16} />
              </Link>
            </Button>

            {isAdmin ? (
              <>
                <Button asChild variant="outline" size="icon" className="header-icon-button" title="Messagerie" aria-label="Messagerie">
                  <Link to="/administration?tab=Messagerie" aria-label="Messagerie">
                    <MessageCircle size={17} />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="icon" className="header-icon-button" title={`Appeler ${config.name}`} aria-label={`Appeler ${config.name}`}>
                  <a href={tel} aria-label={`Appeler ${config.name}`}>
                    <Phone size={17} />
                  </a>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="icon" className="header-icon-button" title="Messagerie" aria-label="Messagerie">
                  <Link to="/contact" className="relative" aria-label="Messagerie">
                    <MessageCircle size={17} />
                    {unread > 0 && (
                      <span className="nav-badge" aria-label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}>
                        {unread}
                      </span>
                    )}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="icon" className="header-icon-button" title={`Appeler ${config.name}`} aria-label={`Appeler ${config.name}`}>
                  <a href={tel} aria-label={`Appeler ${config.name}`}>
                    <Phone size={17} />
                  </a>
                </Button>
                <Button asChild>
                  <Link to="/reservation">
                    Réserver un nettoyage
                    <ArrowUpRight />
                  </Link>
                </Button>
              </>
            )}

            {signed && (
              <Button variant="outline" size="icon" className="header-icon-button" title="Déconnexion" aria-label="Déconnexion" onClick={logout}>
                <LogOut size={16} />
              </Button>
            )}
          </div>

          <div className="mobile-account-actions" aria-label="Compte utilisateur">
            <Button asChild variant="outline" size="icon" className="header-icon-button" title={signed ? "Mon compte" : "Connexion"} aria-label={signed ? "Mon compte" : "Connexion"}>
              <Link to="/compte" aria-label={signed ? "Mon compte" : "Connexion"}>
                <UserRound size={16} />
              </Link>
            </Button>
            {signed && (
              <Button variant="outline" size="icon" className="header-icon-button" title="Déconnexion" aria-label="Déconnexion" onClick={logout}>
                <LogOut size={16} />
              </Button>
            )}
          </div>
          <Button
            className="mobile-menu-trigger"
            variant="ghost"
            size="icon"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>

        {open && (
          <nav className="mobile-nav" aria-label="Menu mobile">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                {label(item)}
              </Link>
            ))}

            {isAdmin ? (
              <Button asChild variant="default">
                <Link to="/administration" onClick={() => setOpen(false)}>
                  <Shield size={16} />
                  Admin
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link to="/contact" onClick={() => setOpen(false)}>
                    <MessageCircle size={16} />
                    Messagerie
                    {unread > 0 && <span className="nav-badge">{unread}</span>}
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/reservation" onClick={() => setOpen(false)}>
                    Réserver un nettoyage
                  </Link>
                </Button>
              </>
            )}

            {signed && (
              <Button variant="outline" onClick={logout}>
                <LogOut />
                Déconnexion
              </Button>
            )}
          </nav>
        )}
      </header>

      <main>{children}</main>

      <section className="cta-band">
        <div className="container-main cta-inner">
          <div>
            <h2>Un intérieur frais. Un esprit serein.</h2>
            <p>Parlons de votre mobilier et trouvons le soin qui lui convient.</p>
          </div>

          <div className="inline-actions">
            <Button asChild size="lg">
              <Link to="/configurateur">
                Tarifs
                <ArrowUpRight />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <a href={tel}>
                <Phone />
                Appeler {config.name}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container-main">
          <div className="footer-grid">
            <div>
              <img className="footer-logo" src={config.logo} alt={config.name} width={135} height={50} />
              <p>
                Nettoyage professionnel de canapés et textiles d’ameublement. Le soin de votre intérieur, directement à
                domicile.
              </p>
            </div>

            <div>
              <h3>Nos prestations</h3>
              {config.services
                .filter((service) => service.enabled)
                .map((service) => (
                  <Link key={service.slug} to="/prestations/$slug" params={{ slug: service.slug }}>
                    {service.name}
                  </Link>
                ))}
            </div>

            <div>
              <h3>À votre service</h3>
              <Link to="/a-propos">À propos de {config.name}</Link>
              <Link to="/tarifs">Nos tarifs</Link>
              <Link to="/devis">Demander un devis</Link>
              <Link to="/configurateur">Configurateur de canapé</Link>
              <Link to="/reservation">Réserver un nettoyage</Link>
              <Link to="/faq">Questions fréquentes</Link>
              <Link to="/realisations">Nos réalisations</Link>
            </div>

            <div>
              <h3>Rencontrons-nous</h3>
              <a href={tel}>{config.phone}</a>
              {config.email && <a href={`mailto:${config.email}`}>{config.email}</a>}
              <Link to="/zone-intervention">
                {config.city} et rayon de {config.radius} km
              </Link>
              <Link to="/contact">Nous contacter</Link>
              {config.hours && <p>{config.hours}</p>}
              {config.whatsappVerified && (
                <a href={`https://wa.me/${telephone(config).replace("+", "")}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              )}
              {config.socialUrl && (
                <a href={config.socialUrl} target="_blank" rel="noreferrer">
                  Nos réseaux sociaux
                </a>
              )}
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {config.name}. Le soin de votre intérieur.
            </span>

            <div className="inline-actions">
              <Link to="/mentions-legales">Mentions légales</Link>
              <Link to="/confidentialite">Confidentialité</Link>
              <Link to="/cookies">Cookies</Link>
              <Link to="/conditions">Conditions</Link>
              <Link to="/compte">Mon compte (-5 %)</Link>
              <Link to="/administration">Administration</Link>
            </div>
          </div>
        </div>
      </footer>

      <nav className="mobile-actions" aria-label="Actions rapides">
        <a href={tel}>
          <Phone />
          Appeler
        </a>

        <Link to="/devis">
          <FileText />
          Mon devis
        </Link>

        <Link to="/reservation">
          <CalendarDays />
          Réserver
        </Link>
      </nav>
    </>
  );
}
