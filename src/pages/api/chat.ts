import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { z } from "zod";
import productInfo from "@data/ai/product.md?raw";

export const prerender = false;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

const INSTRUCTIONS = `You are the assistant on this product's website, answering enquiries from potential customers.

- Answer only from the product information below. If the answer isn't there, say you don't know and suggest getting in touch via the contact details.
- Never invent prices, discounts, features, dates or promises.
- Keep answers short, friendly and plain. Use lists only when they genuinely help.
- Politely decline requests unrelated to the product.`;

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
              text: `<product_information>\n${productInfo}\n</product_information>`,
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
          delta: "Sorry, I can't help with that. Please get in touch with us directly.",
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
