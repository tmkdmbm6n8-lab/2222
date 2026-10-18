import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LifeBuoy, ShieldCheck, MessageCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageHeading } from "@/components/tclean/shared";
import { ClientSav } from "@/components/tclean/client-sav";

export function SavPage() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session?.user);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <>
      <PageHeading
        title="Service après-vente TClean"
        description="Une question après votre nettoyage ? Retrouvez vos demandes et échangez directement avec notre équipe."
      />
      <section className="section">
        <div className="container-main">
          <div className="content-narrow prose-content">
            <div className="inline-actions mb-4"><LifeBuoy className="h-6 w-6 text-primary" /><span className="eyebrow">Votre suivi, au même endroit</span></div>
            <h2>Comment fonctionne le SAV ?</h2>
            <p>Depuis cette page, vous pouvez envoyer une demande à TClean, suivre son statut et retrouver les réponses dans un fil de discussion dédié.</p>
            <div className="service-grid mt-6">
              <article className="service-card">
                <div className="service-body"><ClipboardList className="h-6 w-6 text-primary" /><h3>Une demande centralisée</h3><p>Décrivez votre question ou votre problème après une prestation pour que nous puissions l’examiner.</p></div>
              </article>
              <article className="service-card">
                <div className="service-body"><MessageCircle className="h-6 w-6 text-primary" /><h3>Un échange suivi</h3><p>Retrouvez les messages envoyés et les réponses de TClean sans perdre le fil de la demande.</p></div>
              </article>
              <article className="service-card">
                <div className="service-body"><ShieldCheck className="h-6 w-6 text-primary" /><h3>Un accès personnel</h3><p>Vos demandes sont rattachées à votre compte client. Connectez-vous pour les consulter et y répondre.</p></div>
              </article>
            </div>
          </div>
          <div className="mt-8">
            {!ready ? (
              <div className="form-panel"><p role="status">Vérification de votre connexion…</p></div>
            ) : signedIn ? (
              <ClientSav />
            ) : (
              <div className="form-panel content-narrow">
                <h2>Accéder à mon SAV</h2>
                <p className="text-muted-foreground mt-2 mb-5">Connectez-vous ou créez votre compte client pour ouvrir une demande et retrouver vos échanges avec TClean.</p>
                <Button asChild><Link to="/compte">Se connecter ou créer un compte</Link></Button>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
