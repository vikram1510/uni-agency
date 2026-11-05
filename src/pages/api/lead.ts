import type { APIRoute } from "astro";
import { z } from "zod";
import { saveLead } from "@/lib/hubspot";

export const prerender = false;

const leadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  phone: z.string().trim().max(30).optional(),
  course: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(1000).optional(),
  source: z.enum(["chat", "book-page"]),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});

async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    return request.json().catch(() => null);
  }
  const form = Object.fromEntries(await request.formData());
  const optional = (value: FormDataEntryValue | undefined) => (typeof value === "string" && value.trim() ? value : undefined);
  return {
    ...form,
    phone: optional(form.phone),
    course: optional(form.course),
    summary: [optional(form.summary), optional(form.message)].filter(Boolean).join("\n\n") || undefined,
    consent: form.consent === "on",
  };
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const isFormPost = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded");
  const respond = (ok: boolean, error = "") =>
    isFormPost
      ? redirect(ok ? "/book/?sent=1" : "/book/?error=1", 303)
      : ok
        ? Response.json({ ok: true })
        : Response.json({ error }, { status: error.startsWith("Please") ? 400 : 500 });

  const parsed = leadSchema.safeParse(await readBody(request));
  if (!parsed.success) return respond(false, "Please check your details and try again.");

  const { website: _honeypot, consent: _consent, ...lead } = parsed.data;

  try {
    await saveLead(lead);
    return respond(true);
  } catch (error) {
    console.error("lead error", error);
    return respond(false, "Something went wrong. Please try again.");
  }
};
