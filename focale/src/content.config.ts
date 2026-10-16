import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob, file } from "astro/loaders";

const faq = defineCollection({
  loader: file("src/content/faq.yaml"),
  schema: z.object({
    q: z.string(),
    a: z.string(),
    home: z.boolean().default(false),
    order: z.number(),
  }),
});

const settori = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "src/content/settori" }),
  schema: z.object({
    order: z.number(),
    short: z.string(),
    formOption: z.string(),
    title: z.string(),
    description: z.string(),
    h1: z.string(),
    lead: z.string(),
    problems: z.array(z.string()).length(3),
    build: z.array(z.string()),
    requests: z.string(),
    mock: z.object({ heading: z.string(), lines: z.array(z.tuple([z.string(), z.string()])) }),
    demo: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    whatsapp: z.string(),
  }),
});

const lavori = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "src/content/lavori" }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      name: z.string(),
      sector: z.string(),
      goal: z.string(),
      problems: z.array(z.string()),
      choices: z.array(z.string()),
      outcome: z.array(z.string()),
      settore: z.string(),
      /** A real client's site, online here. Without it the project is a demo at /lavori/<slug>/demo/. */
      url: z.url().optional(),
      /**
       * What the site would cost at our prices: the estimator's answers for it, plus anything made
       * to measure (priced by a key of site.estimate). `why` explains each line, keyed by its label.
       */
      quote: z
        .object({
          intro: z.string(),
          /** What the client really paid (Lorenzo), in euro. Without it the section is a list-price estimate. */
          paid: z.number().optional(),
          answers: z
            .object({
              activity: z.enum(["edile", "serramenti", "ospitalita", "eventi", "altro"]),
              size: z.enum(["una", "completo", "grande"]),
              key: z.enum(["base", "link", "auto"]),
              languages: z.union([z.literal(0), z.literal(1), z.literal(2)]),
              selfUpdate: z.boolean(),
              photos: z.boolean(),
            })
            .partial(),
          extras: z.array(z.object({ label: z.string(), price: z.string(), why: z.string() })).default([]),
          why: z.record(z.string(), z.string()),
          skipped: z.array(z.string()).default([]),
          /** Costs paid to others, when the estimator's own list does not fit this site ({dominio}: the domain's price). */
          apart: z.array(z.string()).optional(),
        })
        .optional(),
      /** A real site's scrolling tour: a selector on the site and what that part does (RealTour.astro). */
      tour: z.array(z.object({ sel: z.string(), t: z.string() })).optional(),
      /** A makeover film on the project page: an invented old site, then the real one (ProjectFilm.astro). */
      film: z
        .object({
          title: z.string(),
          lead: z.string(),
          oldUrl: z.string(),
          first: z.string(),
          mid: z.string(),
          last: z.string(),
          lastLaptop: z.string(),
          fixes: z.array(z.object({ old: z.string(), at: z.number(), bad: z.string(), good: z.string() })).length(5),
        })
        .optional(),
      /** The button the makeover film clicks at the end, on the real site (measured with the tour). */
      tourEnd: z.string().optional(),
      shotPhone: image(),
      shotDesktop: image(),
    }),
});

const anteprime = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "src/content/anteprime" }),
  schema: ({ image }) =>
    z.object({
      businessName: z.string(),
      sector: z.string(),
      area: z.string(),
      currentSiteUrl: z.string().optional(),
      beforeImage: image().optional(),
      afterImage: image().optional(),
      afterUrl: z.string().optional(),
      changes: z.array(z.string()).length(3),
      note: z.string(),
      published: z.boolean().default(false),
    }),
});

export const collections = { faq, settori, lavori, anteprime };
