import nettoyage from "@/assets/tclean-nettoyage.jpg";
import logo from "@/assets/tclean-logo.png";
import type { ElementColors } from "./site-colors";
import type { HistoryEntry } from "./editor-history";
import type { Intervention } from "./interventions";
import { defaultSeasonalThemeSettings, type SeasonalThemeSettings } from "./seasonal-theme";

export const defaultConfig = {
  name: "TClean",
  phone: "06 77 69 50 79",
  city: "Strasbourg",
  radius: 50,
  email: "",
  hours: "",
  travelFee: 9 as number | null,
  travelFreeFrom: 30,
  minimum: null as number | null,
  bookingDuration: 180,
  whatsappVerified: false,
  logo,
  heroPhoto: "https://videos.pexels.com/video-files/4201911/4201911-uhd_3840_2160_25fps.mp4",
  carePhoto: nettoyage,
  heroTitle: "Redonnez une seconde vie à vos canapés.",
  heroSubtitle:
    "Un nettoyage professionnel de vos textiles d’ameublement, directement à domicile. TClean prend soin de votre intérieur à Strasbourg et dans un rayon de 50 km.",
  about:
    "TClean est une entreprise de nettoyage de canapés et de textiles d’ameublement à domicile, à Strasbourg. Notre approche : prendre le temps de comprendre votre mobilier pour proposer une intervention adaptée à son tissu et à son état.",
  legalIdentity: "",
  legalAddress: "",
  registration: "",
  cancellation: "",
  paymentMethods: "",
  searchConsoleVerification: "",
  socialUrl: "",
  disabledPages: [] as string[],
  permanentlyDeletedPages: [] as string[],
  content: {} as Record<string, string>,
  images: {} as Record<string, string>,
  links: {} as Record<string, string>,
  hidden: {} as Record<string, string>,
  permanentHidden: {} as Record<string, boolean>,
  typography: {} as Record<string, string>,
  editHistory: [] as HistoryEntry[],
  themeColors: {} as Record<string, string>,
  elementColors: {} as Record<string, ElementColors>,
  media: {} as Record<string, import("./site-colors").PlacedMedia>,
  seasonalTheme: { ...defaultSeasonalThemeSettings } as SeasonalThemeSettings,

  configuratorPrices: {
    sofa2: 59,
    sofa3: 69,
    sofa4: 79,
    sofa5: 89,
    angle: 89,
    panoramic: 99,
    armchair: 29,
    pouf: 15,
    decoCushion: 5,
    mattress1one: 29,
    mattress1two: 39,
    mattress2one: 49,
    mattress2two: 69,
    chair1: 8,
    chair4: 29,
    chair6: 39,
    chair8: 49,
  },

  services: [
    {
      slug: "canape-tissu",
      name: "Canapé en tissu",
      category: "Canapés",
      description: "Un soin en profondeur pour le cœur de votre salon.",
      enabled: true,
      price: 59 as number | null,
    },
    {
      slug: "canape-angle",
      name: "Canapé d’angle",
      category: "Canapés",
      description: "Chaque assise, chaque recoin, avec la même attention.",
      enabled: true,
      price: 89 as number | null,
    },
    {
      slug: "fauteuil",
      name: "Fauteuil",
      category: "Fauteuils",
      description: "Retrouvez le plaisir de votre place préférée.",
      enabled: true,
      price: 29 as number | null,
    },
    {
      slug: "matelas",
      name: "Matelas",
      category: "Matelas",
      description: "Un nettoyage adapté à votre espace de repos.",
      enabled: true,
      price: 29 as number | null,
    },
    {
      slug: "chaises",
      name: "Chaises en tissu",
      category: "Chaises",
      description: "Prenez soin des textiles qui vous accompagnent au quotidien.",
      enabled: true,
      price: 8 as number | null,
    },
    {
      slug: "pouf",
      name: "Pouf",
      category: "Fauteuils",
      description: "Un coup de fraîcheur pour votre pouf ou votre repose-pieds.",
      enabled: true,
      price: 15 as number | null,
    },
    {
      slug: "canape-convertible",
      name: "Canapé convertible",
      category: "Canapés",
      description: "Un soin adapté aux assises et aux parties accessibles.",
      enabled: true,
      price: 69 as number | null,
    },
    {
      slug: "coussins",
      name: "Coussins",
      category: "Accessoires",
      description: "Vos coussins décoratifs nettoyés à l’unité, sans les déplacer.",
      enabled: true,
      price: 5 as number | null,
    },
    {
      slug: "tapis",
      name: "Tapis",
      category: "Tapis",
      description: "Une intervention adaptée aux fibres de votre tapis.",
      enabled: false,
      price: null as number | null,
    },
    {
      slug: "textiles",
      name: "Autres textiles",
      category: "Textiles",
      description: "Une étude personnalisée de votre textile d’ameublement.",
      enabled: false,
      price: null as number | null,
    },
  ],

  areas: [
    { name: "Strasbourg", codes: "67000,67100,67200" },
    { name: "Schiltigheim", codes: "67300" },
    { name: "Illkirch-Graffenstaden", codes: "67400" },
    { name: "Lingolsheim", codes: "67380" },
    { name: "Ostwald", codes: "67540" },
    { name: "Bischheim", codes: "67800" },
    { name: "Hoenheim", codes: "67800" },
    { name: "Eckbolsheim", codes: "67201" },
    { name: "Oberhausbergen", codes: "67205" },
    { name: "Vendenheim", codes: "67550" },
    { name: "Molsheim", codes: "67120" },
    { name: "Obernai", codes: "67210" },
    { name: "Haguenau", codes: "67500" },
  ],

  gallery: [] as Intervention[],

  faqs: [
    {
      q: "Combien coûte le nettoyage d’un canapé ?",
      a: "Le tarif dépend du nombre de places, du tissu, de son état et des contraintes d’accès. Demandez un devis gratuit pour connaître le montant de votre intervention.",
    },
    {
      q: "Combien de temps dure une intervention ?",
      a: "La durée varie selon la taille du mobilier et son état. Nous précisons l’organisation de l’intervention lors de l’établissement du devis.",
    },
    {
      q: "Combien de temps faut-il pour que le canapé sèche ?",
      a: "Le séchage dépend du textile, de la méthode retenue, de la ventilation et de la température de la pièce. Les consignes adaptées sont données lors de l’intervention. Ne réutilisez pas le mobilier avant séchage complet.",
    },
    {
      q: "Toutes les taches peuvent-elles être retirées ?",
      a: "Non. Certaines taches anciennes ou ayant altéré les fibres peuvent rester visibles. L’examen du textile permet d’évaluer les possibilités, sans garantir la disparition de toutes les taches ou odeurs.",
    },
    {
      q: "Peut-on nettoyer un tissu délicat ?",
      a: "Le textile et son étiquette d’entretien doivent être examinés avant de choisir une méthode. Certains tissus peuvent nécessiter un traitement particulier ou ne pas être adaptés à l’intervention.",
    },
    {
      q: "Et si j’ai des animaux à la maison ?",
      a: "Signalez les poils, taches et odeurs lors du devis. Le traitement est étudié selon le tissu et l’état du mobilier, sans garantie de disparition de toutes les odeurs.",
    },
    {
      q: "Comment préparer le mobilier ?",
      a: "Dégagez l’accès au mobilier et retirez les objets personnels. Nous vous indiquons les autres préparatifs utiles avant le rendez-vous.",
    },
    {
      q: "Les produits sont-ils adaptés aux enfants et aux animaux ?",
      a: "Les précautions dépendent des produits et du textile. Demandez les informations relatives au traitement retenu et respectez les consignes de séchage et de ventilation. Aucune innocuité universelle n’est garantie.",
    },
    {
      q: "Nettoyez-vous aussi les matelas ?",
      a: "Oui, TClean propose le nettoyage de matelas à domicile, après étude de leur composition et de leur état.",
    },
    {
      q: "Intervenez-vous à domicile autour de Strasbourg ?",
      a: "Oui, à Strasbourg et dans un rayon maximal de 50 km. La prise en charge reste soumise à la validation de l’adresse et des conditions de déplacement.",
    },
    {
      q: "Quels sont les moyens de paiement acceptés ?",
      a: "Les modalités de paiement vous sont précisées avec votre devis, avant toute intervention.",
    },
    {
      q: "Comment annuler ou déplacer un rendez-vous ?",
      a: "Contactez TClean au 06 77 69 50 79. Les conditions applicables vous sont communiquées avant la confirmation du rendez-vous.",
    },
  ],
};

export type BusinessConfig = typeof defaultConfig;

export function telephone(config: BusinessConfig) {
  const digits = config.phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `+33${digits.slice(1)}` : `+${digits}`;
}

export function travelCharge(config: BusinessConfig, subtotal: number | null) {
  return subtotal === null ? null : subtotal < config.travelFreeFrom ? config.travelFee ?? 0 : 0;
}

export function estimate(config: BusinessConfig, slug: string, quantity: number) {
  const service = config.services.find((item) => item.slug === slug && item.enabled);
  if (service?.price == null) return null;

  const subtotal = service.price * quantity;
  return Math.round(Math.max(subtotal + (travelCharge(config, subtotal) ?? 0), config.minimum ?? 0) * 100) / 100;
}

export function checkArea(config: BusinessConfig, code: string) {
  return config.areas.filter((area) => area.codes.split(",").map((item) => item.trim()).includes(code));
}
