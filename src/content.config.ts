// Dlaczego: definicja kolekcji Content Collections w Astro v7
// Astro v7 uzywa nowego API z `loader` zamiast `type: "content"`
// `glob()` loader automatycznie wykrywa pliki markdown w podanym katalogu
import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
  }),
});

const levelSchema = z.enum(["foundation", "undergraduate", "top-up", "postgraduate"]);

const universitiesCollection = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/universities" }),
  schema: z.object({
    name: z.string(),
    locations: z.array(z.string()).min(1),
    summary: z.string(),
    description: z.array(z.string()).min(1),
    levels: z.array(levelSchema).min(1),
    subjects: z.array(z.string()).min(1),
    website: z.url(),
    featured: z.boolean().default(false),
  }),
});

const coursesCollection = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/courses" }),
  schema: z.object({
    title: z.string(),
    level: levelSchema,
    subject: z.string(),
    summary: z.string(),
    description: z.array(z.string()).min(1),
    duration: z.string(),
    intakes: z.array(z.string()).min(1),
    entryRequirements: z.array(z.string()).min(1),
    modules: z.array(z.string()).default([]),
    careers: z.array(z.string()).default([]),
    universities: z.array(reference("universities")).default([]),
  }),
});

export const collections = {
  blog: blogCollection,
  universities: universitiesCollection,
  courses: coursesCollection,
};
