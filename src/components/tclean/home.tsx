import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Phone,
  MapPin,
  Check,
  ShieldCheck,
  Leaf,
  House,
  Sparkles,
  HeartHandshake,
  ScanLine,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessQuery } from "@/lib/business-query";
import { telephone } from "@/lib/business";
import { ServicesGrid, ZoneBand, FaqList, Process } from "./shared";
import { reviewsQuery } from "./reviews";

function ReviewTicker() {
  const { data: reviews } = useSuspenseQuery(reviewsQuery);

  if (reviews.length === 0) return null;

  const entries = [...reviews, ...reviews, ...reviews];

  return (
    <section className="review-ticker" aria-label="Avis clients publiés sur le site TClean">
      <div className="review-ticker-label">
        <Star size={15} fill="currentColor" />
        Avis clients TClean
      </div>

      <div className="review-ticker-window">
        <div className="review-ticker-track">
          {entries.map((review, index) => (
            <article className="review-ticker-card" key={`${review.id}-${index}`} aria-hidden={index >= reviews.length}>
              <span className="review-ticker-stars">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <span className="review-ticker-author">{review.author}</span>
              {review.comment && <span className="review-ticker-comment">« {review.comment} »</span>}
            </article>
          ))}
        </div>
      </div>

      <Link to="/avis" className="review-ticker-link">
        Voir tous les avis
      </Link>
    </section>
  );
}

export function Home() {
  const { data: config } = useSuspenseQuery(businessQuery);
  const title = config.heroTitle;

  return (
    <>
      <section className="hero">
        <video
          className="hero-background-video"
          src="https://videos.pexels.com/video-files/4201911/4201911-hd_1920_1080_25fps.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />

        <div className="container-main hero-content fade-in">
          <div className="hero-eyebrow">
            <span>
              <Sparkles size={14} />
            </span>
            {config.name} · Nettoyage de canapé à {config.city}
          </div>

          <h1>
            {title === "Redonnez une seconde vie à vos canapés." ? (
              <>
                Redonnez une
                <br />
                <em>seconde vie</em>
                <br />à vos canapés.
              </>
            ) : (
              title
            )}
          </h1>

          <p className="hero-subtitle">{config.heroSubtitle}</p>

          <div className="hero-ctas">
            <Button asChild variant="hero" size="lg">
              <Link to="/configurateur">
                Tarifs
                <ArrowUpRight />
              </Link>
            </Button>

            <Button asChild variant="heroOutline" size="lg">
              <a href={`tel:${telephone(config)}`}>
                <Phone />
                Appeler le {config.phone}
              </a>
            </Button>
          </div>

          <div className="hero-details">
            <span>
              <Check size={13} />
              Devis gratuit & sans engagement
            </span>
            <span>
              <Check size={13} />
              Intervention à domicile
            </span>
            <span>
              <Check size={13} />
              Soin adapté à vos tissus
            </span>
          </div>
        </div>

        <div className="hero-location">
          <MapPin size={16} />
          {config.city} & alentours · {config.radius} km
        </div>


      </section>

      <ReviewTicker />

      <div className="trust-strip">
        <div className="container-main trust-inner">
          {[
            {
              icon: House,
              title: "Chez vous, tout simplement",
              text: "Aucun mobilier à transporter",
            },
            {
              icon: ScanLine,
              title: "Chaque textile est unique",
              text: "Une méthode adaptée à votre tissu",
            },
            {
              icon: ShieldCheck,
              title: "Un devis en toute transparence",
              text: "Les conditions avant l’intervention",
            },
            {
              icon: HeartHandshake,
              title: "Un interlocuteur local",
              text: `${config.city} et ses environs`,
            },
          ].map((item) => (
            <div className="trust-item" key={item.title}>
              <item.icon />
              <div>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="section">
        <div className="container-main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Le soin dans chaque fibre</span>
              <h2>
                Vos textiles méritent
                <br />
                une attention particulière.
              </h2>
              <p>
                Du canapé familial à votre fauteuil préféré, un nettoyage pensé pour les meubles qui font votre
                quotidien.
              </p>
            </div>

            <Button asChild variant="outline">
              <Link to="/prestations">
                Découvrir nos prestations
                <ArrowUpRight />
              </Link>
            </Button>
          </div>

          <ServicesGrid limit={3} />

          <p className="text-muted-foreground text-[10px] mt-4">
            Visuels d’illustration — ils ne représentent pas des interventions réalisées par TClean.
          </p>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container-main care-layout">
          <div className="care-image">
            <img
              src={config.carePhoto}
              alt="Nettoyage par extraction d’un canapé — illustration"
              width={1200}
              height={912}
              loading="lazy"
            />
            <small>Photographie d’illustration</small>
          </div>

          <div className="care-copy">
            <span className="eyebrow">Bien plus qu’un nettoyage</span>
            <h2>
              Le plaisir de retrouver
              <br />
              un intérieur soigné.
            </h2>
            <p>
              Un canapé accompagne les moments de vie. Avec TClean, offrez à vos textiles le soin qu’ils méritent,
              sans quitter votre domicile.
            </p>

            <div className="care-point">
              <Leaf />
              <div>
                <strong>Préserver plutôt que remplacer</strong>
                <span>Entretenir votre mobilier et prolonger le plaisir de l’utiliser.</span>
              </div>
            </div>

            <div className="care-point">
              <ScanLine />
              <div>
                <strong>Une attention portée au tissu</strong>
                <span>Un examen préalable, des précautions et un traitement adapté.</span>
              </div>
            </div>

            <div className="care-point">
              <HeartHandshake />
              <div>
                <strong>Une relation simple et de proximité</strong>
                <span>Un échange direct avec votre professionnel à Strasbourg.</span>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link to="/a-propos">
                Découvrir TClean
                <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-main">
          <span className="eyebrow">Simple, du premier contact au dernier soin</span>
          <h2>Votre nettoyage en quatre étapes.</h2>
          <Process />
        </div>
      </section>

      <ZoneBand />

      <section className="section">
        <div className="container-main faq-layout">
          <div>
            <span className="eyebrow">En toute confiance</span>
            <h2>
              Les réponses
              <br />à vos questions.
            </h2>
            <p className="text-muted-foreground text-sm mt-5 mb-6">
              Un doute sur votre tissu ou sur le déroulement de l’intervention ? Parlons-en.
            </p>

            <Button asChild variant="outline">
              <Link to="/faq">
                Toutes les questions
                <ArrowUpRight />
              </Link>
            </Button>
          </div>

          <FaqList limit={5} />
        </div>
      </section>
    </>
  );
}
