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
