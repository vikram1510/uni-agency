import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import { getCourseCatalogue } from "@utils/course-catalogue";

export const prerender = false;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

const INSTRUCTIONS = `You are the course finder on the website of UniPath, a UK agency that gives free advice to UK students (school leavers and mature students) on choosing a university and course, applying, and student finance.

Your goal is to help the student find 1–3 courses from the catalogue below that genuinely fit them, then encourage them to book a free consultation with an advisor.

How to help:
- Find out what they want to study, what qualifications they have (e.g. GCSEs, A-levels, BTEC, Access course, HND, a degree, or none), and anything that matters to them such as location or start date. Ask one or two short questions at a time, never a long list.
- Once you know enough, recommend courses from the catalogue. For each, link to its page using the path given, e.g. [Adult Nursing](/courses/undergraduate/adult-nursing/), say briefly why it fits and mention the typical entry requirements.
- If they lack the usual entry requirements, explain routes like Access courses, foundation years, Level 3–5 diplomas and top-up degrees, using courses in the catalogue where possible.
- For money questions, give a short general answer and link to [our student finance guide](/student-finance/).
- When they have a shortlist, want help applying, or ask something you can't answer, suggest they [book a free consultation](/#contact) with an advisor.

Rules:
- Only recommend courses and universities in the catalogue. If nothing fits, say so honestly and suggest a free consultation.
- Never invent fees, dates, entry requirements, rankings or promises, and never guarantee a place. Entry requirements vary by university.
- You are an automated assistant. Never pretend to be a person. If asked, say an advisor can follow up after a consultation.
- Don't ask for contact details in the chat.
- Keep replies short, warm and plain. Use British English.
- Politely decline requests unrelated to studying at university.`;

const client = new Anthropic({ apiKey: import.meta.env.ANTHROPIC_API_KEY });

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).loose()),
      }).loose(),
    )
    .min(1)
    .max(MAX_MESSAGES),
});

function toAnthropicMessages(messages: Pick<UIMessage, "role" | "parts">[]): Anthropic.Beta.BetaMessageParam[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.parts
        .map((p) => (p.type === "text" && "text" in p ? p.text : ""))
        .join("")
        .slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content.trim().length > 0);
}

export const POST: APIRoute = async ({ request }) => {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Invalid request", { status: 400 });
  }

  const messages = toAnthropicMessages(parsed.data.messages as Pick<UIMessage, "role" | "parts">[]);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response("Invalid request", { status: 400 });
  }

  const catalogue = await getCourseCatalogue();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const response = client.beta.messages.stream(
        {
          model: "claude-opus-5-5",
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          system: [
            { type: "text", text: INSTRUCTIONS },
            {
              type: "text",
              text: `<catalogue>\n${catalogue}\n</catalogue>`,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        },
        { signal: request.signal },
      );

      const textId = crypto.randomUUID();
      writer.write({ type: "text-start", id: textId });
      for await (const event of response) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          writer.write({ type: "text-delta", id: textId, delta: event.delta.text });
        }
      }

      const final = await response.finalMessage();
      if (final.stop_reason === "refusal") {
        writer.write({
          type: "text-delta",
          id: textId,
          delta: "Sorry, I can't help with that. You can [book a free consultation](/#contact) to talk to an advisor.",
        });
      }
      writer.write({ type: "text-end", id: textId });
    },
    onError: (error) => {
      console.error("chat error", error);
      if (import.meta.env.DEV && error instanceof Error) return error.message;
      return "Something went wrong. Please try again.";
    },
  });

  return createUIMessageStreamResponse({ stream });
};
