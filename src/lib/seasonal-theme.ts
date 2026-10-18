export type ThemeAudience = "all" | "client" | "admin";

export type SeasonalThemeId =
  | "none"
  | "new-year"
  | "valentine"
  | "spring"
  | "easter"
  | "summer"
  | "back-to-school"
  | "autumn"
  | "halloween"
  | "black-friday"
  | "christmas";

export type SeasonalTheme = {
  id: SeasonalThemeId;
  name: string;
  description: string;
  priority: number;
  startsOn: string;
  endsOn: string;
  className: string;
};

export type SeasonalThemeSettings = {
  mode: "automatic" | "manual";
  manualTheme: SeasonalThemeId;
  audience: ThemeAudience;
  enabled: boolean;
};

export const defaultSeasonalThemeSettings: SeasonalThemeSettings = {
  mode: "automatic",
  manualTheme: "none",
  audience: "all",
  enabled: true,
};

const pad = (value: number) => String(value).padStart(2, "0");

function parisParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return { year: read("year"), month: read("month"), day: read("day") };
}

function parisDateKey(date: Date) {
  const value = parisParts(date);
  return `${value.year}-${pad(value.month)}-${pad(value.day)}`;
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function plusDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function fixedTheme(
  id: SeasonalThemeId,
  name: string,
  description: string,
  priority: number,
  year: number,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): SeasonalTheme {
  return {
    id,
    name,
    description,
    priority,
    startsOn: `${year}-${pad(startMonth)}-${pad(startDay)}`,
    endsOn: `${year}-${pad(endMonth)}-${pad(endDay)}`,
    className: `season-${id}`,
  };
}

export function annualThemes(date = new Date()): SeasonalTheme[] {
  const { year } = parisParts(date);
  const easter = easterSunday(year);

  return [
    fixedTheme(
      "new-year",
      "Nouvel An",
      "Une ambiance légère de début d’année, élégante et lumineuse.",
      80,
      year,
      12,
      29,
      1,
      5,
    ),
    fixedTheme(
      "valentine",
      "Saint-Valentin",
      "Une touche chaleureuse et discrète autour de la Saint-Valentin.",
      60,
      year,
      2,
      8,
      2,
      15,
    ),
    fixedTheme(
      "spring",
      "Printemps",
      "Des accents végétaux et doux pour l’arrivée du printemps.",
      20,
      year,
      3,
      20,
      6,
      20,
    ),
    {
      id: "easter",
      name: "Pâques",
      description: "Une ambiance printanière douce autour du week-end de Pâques.",
      priority: 70,
      startsOn: isoDate(plusDays(easter, -3)),
      endsOn: isoDate(plusDays(easter, 2)),
      className: "season-easter",
    },
    fixedTheme(
      "summer",
      "Été",
      "Un thème lumineux et frais pour la période estivale.",
      20,
      year,
      6,
      21,
      8,
      31,
    ),
    fixedTheme(
      "back-to-school",
      "Rentrée",
      "Une présentation sobre et structurée pour la rentrée.",
      30,
      year,
      9,
      1,
      9,
      20,
    ),
    fixedTheme(
      "autumn",
      "Automne",
      "Des accents chauds et naturels pour la saison automnale.",
      20,
      year,
      9,
      21,
      11,
      30,
    ),
    fixedTheme(
      "halloween",
      "Halloween",
      "Une touche de saison discrète, sans nuire à la lisibilité.",
      75,
      year,
      10,
      24,
      10,
      31,
    ),
    fixedTheme(
      "black-friday",
      "Black Friday",
      "Un habillage sobre pour les communications commerciales validées par l’administrateur.",
      90,
      year,
      11,
      20,
      12,
      2,
    ),
    fixedTheme(
      "christmas",
      "Noël et fêtes de fin d’année",
      "Des détails hivernaux, professionnels et non intrusifs.",
      85,
      year,
      12,
      3,
      12,
      28,
    ),
  ];
}

export const themeOptions = [
  { id: "none" as const, name: "Aucun thème" },
  { id: "new-year" as const, name: "Nouvel An" },
  { id: "valentine" as const, name: "Saint-Valentin" },
  { id: "spring" as const, name: "Printemps" },
  { id: "easter" as const, name: "Pâques" },
  { id: "summer" as const, name: "Été" },
  { id: "back-to-school" as const, name: "Rentrée" },
  { id: "autumn" as const, name: "Automne" },
  { id: "halloween" as const, name: "Halloween" },
  { id: "black-friday" as const, name: "Black Friday" },
  { id: "christmas" as const, name: "Noël" },
];

export function activeSeasonalTheme(
  settings: SeasonalThemeSettings | undefined,
  date = new Date(),
): SeasonalTheme | null {
  const safe = { ...defaultSeasonalThemeSettings, ...(settings ?? {}) };

  if (!safe.enabled) return null;

  const themes = annualThemes(date);

  if (safe.mode === "manual") {
    return themes.find((theme) => theme.id === safe.manualTheme) ?? null;
  }

  const today = parisDateKey(date);

  return (
    themes
      .filter((theme) => {
        if (theme.startsOn <= theme.endsOn) {
          return today >= theme.startsOn && today <= theme.endsOn;
        }

        return today >= theme.startsOn || today <= theme.endsOn;
      })
      .sort((a, b) => b.priority - a.priority)[0] ?? null
  );
}

export function audienceCanSeeTheme(
  audience: ThemeAudience,
  viewer: "admin" | "client",
) {
  return audience === "all" || audience === viewer;
}
