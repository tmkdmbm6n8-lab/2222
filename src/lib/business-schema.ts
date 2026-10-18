import { z } from "zod";
import { configuratorSchema } from "./configurator";
import { themeColorsSchema, elementColorsSchema, placedMediaMapSchema } from "./site-colors";
import { typographyValueSchema } from "./site-typography";
import { editHistorySchema } from "./editor-history";
import { galleryItemSchema } from "./interventions";

const image = z
  .string()
  .max(2000)
  .refine(
    (v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\//.test(v),
    "Utilisez une image HTTPS ou du site.",
  );

const seasonalThemeSchema = z
  .object({
    mode: z.enum(["automatic", "manual"]).default("automatic"),
    manualTheme: z
      .enum([
        "none",
        "new-year",
        "valentine",
        "spring",
        "easter",
        "summer",
        "back-to-school",
        "autumn",
        "halloween",
        "black-friday",
        "christmas",
      ])
      .default("none"),
    audience: z.enum(["all", "client", "admin"]).default("all"),
    enabled: z.boolean().default(true),
  })
  .default({
    mode: "automatic",
    manualTheme: "none",
    audience: "all",
    enabled: true,
  });

export const configSchema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().regex(/^[+\d\s().-]{8,25}$/),
  city: z.string().min(1).max(80),
  radius: z.number().min(1).max(50),
  email: z.union([z.literal(""), z.string().email()]),
  hours: z.string().max(300),
  travelFee: z.number().nonnegative().nullable(),
  minimum: z.number().nonnegative().nullable(),
  whatsappVerified: z.boolean(),
  logo: image,
  heroPhoto: image,
  carePhoto: image,
  heroTitle: z.string().min(1).max(160),
  heroSubtitle: z.string().max(600),
  about: z.string().max(4000),
  legalIdentity: z.string().max(500),
  legalAddress: z.string().max(500),
  registration: z.string().max(100),
  cancellation: z.string().max(4000),
  paymentMethods: z.string().max(300),
  searchConsoleVerification: z.string().max(200),
  socialUrl: image,
  travelFreeFrom: z.number().nonnegative().default(30),
  bookingDuration: z.number().int().min(30).max(1440).default(180),
  disabledPages: z.array(z.string().regex(/^\/[a-zA-Z0-9\-_/]*$/).max(200)).max(100).default([]),
  permanentlyDeletedPages: z.array(z.string().regex(/^\/[a-zA-Z0-9\-_/]*$/).max(200)).max(100).default([]),
  content: z.record(z.string().max(2000), z.string().max(4000)).default({}),
  typography: z.record(z.string().max(2000), typographyValueSchema).default({}),
  editHistory: editHistorySchema.default([]),
  images: z.record(z.string().max(2000), z.string().max(2000)).default({}),
  links: z
    .record(
      z.string().max(400),
      z
        .string()
        .regex(/^\/[a-zA-Z0-9\-_/]*$/)
        .max(200),
    )
    .default({}),
  hidden: z.record(z.string().max(2000), z.string().max(4000)).default({}),
  permanentHidden: z.record(z.string().max(2000), z.boolean()).default({}),
  audience: z.record(z.string().max(2100), z.enum(["admin", "client"])).default({}),
  themeColors: themeColorsSchema.default({}),
  media: placedMediaMapSchema.default({}),
  elementColors: elementColorsSchema.default({}),
  seasonalTheme: seasonalThemeSchema,
  configuratorPrices: z.record(z.string().max(40), z.number().nonnegative()).default({}),
  services: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string().min(1).max(100),
        category: z.string().max(80),
        description: z.string().max(1000),
        enabled: z.boolean(),
        price: z.number().nonnegative().nullable(),
      }),
    )
    .max(30),
  areas: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        codes: z.string().regex(/^\d{5}(\s*,\s*\d{5})*$/),
      }),
    )
    .max(100),
  gallery: z.array(galleryItemSchema).max(500),
  faqs: z
    .array(
      z.object({
        q: z.string().min(1).max(300),
        a: z.string().max(2000),
      }),
    )
    .max(50),
});

export const requestSchema = z
  .object({
    kind: z.enum(["quote", "booking", "contact"]),
    customer_name: z.string().trim().min(2).max(120),
    phone: z.string().regex(/^[+\d\s().-]{8,25}$/),
    email: z.union([z.literal(""), z.string().email().max(200)]),
    postal_code: z.union([z.literal(""), z.string().regex(/^\d{5}$/)]),
    city: z.string().max(100),
    address: z.string().max(400),
    slot_id: z.string().uuid().nullable(),
    details: z.object({
      service: z.string().max(80),
      quantity: z.number().int().min(1).max(30),
      size: z.string().max(100),
      condition: z.string().max(500),
      date: z.string().max(100),
      message: z.string().max(3000),
      configurator: configuratorSchema.optional(),
    }),
    discount_code: z.string().max(40).default(""),
    payment_method: z.enum(["onsite", "online"]).default("onsite"),
    photos: z
      .array(
        z.object({
          name: z.string().max(120),
          type: z.enum(["image/jpeg", "image/png", "image/webp"]),
          base64: z.string().max(7000000),
        }),
      )
      .max(4),
    honeypot: z.string().max(100),
  })
  .refine((d) => d.kind === "contact" || (d.email !== "" && d.postal_code !== "" && d.city.trim().length >= 2), {
    message: "Coordonnées incomplètes.",
  });
