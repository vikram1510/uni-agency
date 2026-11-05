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
- As soon as they mention a subject or course, recommend matching courses from the catalogue straight away. Don't wait until you know their qualifications.
- Then you can ask about their qualifications (e.g. GCSEs, A-levels, BTEC, Access course, HND, a degree, or none) and anything that matters to them, such as location or start date, to refine the suggestions. Ask one or two short questions at a time, never a long list.
- When recommending courses, link each to its page using the path given, e.g. [Adult Nursing](/courses/undergraduate/adult-nursing/), say briefly why it fits and mention the typical entry requirements.
- If they lack the usual entry requirements, explain routes like Access courses, foundation years, Level 3–5 diplomas and top-up degrees, using courses in the catalogue where possible.
- For money questions, give a short general answer and link to [our student finance guide](/student-finance/).
- As soon as you have recommended at least one course, call the offer_consultation tool so a booking button appears below your message, and end your reply by inviting them to book a free consultation with an advisor to talk through it and get help applying. Also call it if they want help applying or ask something only an advisor can answer.
- Call offer_consultation only once per conversation, unless the course they're focused on changes. The button handles booking. If you need to link to booking in text, only ever use [book a free consultation](/book/).
- Only link to pages listed in the catalogue, /student-finance/ or /book/. Never make up other links.

Rules:
- Only recommend courses and universities in the catalogue. If nothing fits, say so honestly and suggest a free consultation.
- Never invent fees, dates, entry requirements, rankings or promises, and never guarantee a place. Entry requirements vary by university.
- You are an automated assistant. Never pretend to be a person. If asked, say an advisor can follow up after a consultation.
- Don't ask for contact details in the chat.
- Keep replies short, warm and plain. Use British English.
- Politely decline requests unrelated to studying at university.`;

const CONSULTATION_SHOWN = "[A 'Book a free consultation' button was shown to the student.]";

const consultationSchema = z.object({
  course: z.string().min(1).max(200),
  coursePath: z.string().max(200).optional(),
  summary: z.string().min(1).max(500),
});

const offerConsultationTool: Anthropic.Beta.BetaTool = {
  name: "offer_consultation",
  description:
    "Shows the student a button to book a free consultation with an advisor, pre-filled with the course you discussed. Call it right after recommending a course, or when the student wants help applying.",
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    properties: {
      course: { type: "string", description: "Title of the main course discussed, exactly as in the catalogue, or 'General advice' if none yet." },
      coursePath: { type: "string", description: "The course page path from the catalogue, e.g. /courses/undergraduate/adult-nursing/. Omit for general advice." },
      summary: { type: "string", description: "One or two sentences for the advisor: what the student wants, their qualifications and any preferences." },
    },
    required: ["course", "summary"],
  },
};

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
        .map((p) => {
          if (p.type === "text" && "text" in p) return p.text;
          if (p.type === "data-consultation" && m.role === "assistant") return `\n\n${CONSULTATION_SHOWN}`;
          return "";
        })
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
          tools: [offerConsultationTool],
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
          delta: "Sorry, I can't help with that. You can [book a free consultation](/book/) to talk to an advisor.",
        });
      }
      writer.write({ type: "text-end", id: textId });

      if (final.stop_reason === "tool_use") {
        const call = final.content.find((block) => block.type === "tool_use" && block.name === offerConsultationTool.name);
        const offer = call?.type === "tool_use" ? consultationSchema.safeParse(call.input) : undefined;
        if (offer?.success) {
          writer.write({ type: "data-consultation", data: offer.data });
        }
      }
    },
    onError: (error) => {
      console.error("chat error", error);
      if (import.meta.env.DEV && error instanceof Error) return error.message;
      return "Something went wrong. Please try again.";
    },
  });

  return createUIMessageStreamResponse({ stream });
};
