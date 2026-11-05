import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useChat } from "@ai-sdk/react"
import { ArrowUpIcon, GraduationCapIcon, SquareIcon } from "lucide-react"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { MessageResponse } from "@/components/ai-elements/message"
import LeadForm from "@/components/leads/LeadForm"
import { cn } from "@/lib/utils"

type ChatCopy = {
  placeholder: string
  send: string
  stop: string
  greeting: string
  empty: string
  suggestions: string[]
  error: string
  disclaimer: string
}

type ChatProps = {
  copy: ChatCopy
  variant?: "page" | "panel"
  readQueryParam?: boolean
}

function AssistantAvatar() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white">
      <GraduationCapIcon className="size-4" />
    </div>
  )
}

type ConsultationOffer = { course: string; coursePath?: string; summary: string }

function ConsultationCard({ offer }: { offer: ConsultationOffer }) {
  const [open, setOpen] = useState(false)
  const generalAdvice = offer.course === "General advice"

  return (
    <div className="mt-3 rounded-2xl border border-brand-dark/10 bg-brand-dark/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/50">Free consultation</p>
      <p className="mt-1 font-semibold text-brand-dark">
        {generalAdvice ? "Talk it through with an advisor" : `Talk to an advisor about ${offer.course}`}
      </p>
      {open ? (
        <div className="mt-3">
          <LeadForm source="chat" course={generalAdvice ? undefined : offer.course} summary={offer.summary} compact />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-85"
          >
            Book a free consultation
          </button>
          {offer.coursePath?.startsWith("/courses/") && (
            <a href={offer.coursePath} className="rounded-full border border-brand-dark/15 px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-dark/5">
              View course
            </a>
          )}
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-3">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-bounce rounded-full bg-brand-dark/40"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

export default function Chat({ copy, variant = "page", readQueryParam = false }: ChatProps) {
  const { messages, sendMessage, status, stop, error } = useChat()
  const [input, setInput] = useState("")
  const busy = status === "submitted" || status === "streaming"
  const sentInitial = useRef(false)

  useEffect(() => {
    if (!readQueryParam || sentInitial.current) return
    const url = new URL(window.location.href)
    const question = url.searchParams.get("q")?.trim().slice(0, 2000)
    if (!question) return
    sentInitial.current = true
    url.searchParams.delete("q")
    history.replaceState(history.state, "", url)
    sendMessage({ text: question })
  }, [readQueryParam, sendMessage])

  const send = (value: string) => {
    const text = value.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput("")
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-white",
        variant === "page"
          ? "h-[70vh] min-h-[28rem] rounded-3xl border border-brand-dark/10 shadow-xl shadow-brand-dark/5"
          : "h-full",
      )}
    >
      <Conversation className="flex-1">
        <ConversationContent className="gap-6 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-6 text-center",
                variant === "page" ? "min-h-[20rem]" : "min-h-[16rem]",
              )}
            >
              <AssistantAvatar />
              <div className="space-y-1.5">
                <p className="text-lg font-semibold text-brand-dark">{copy.greeting}</p>
                <p className="text-sm text-brand-dark/60">{copy.empty}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {copy.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-brand-dark/10 bg-brand-dark/[0.03] px-4 py-2 text-sm text-brand-dark/80 transition-colors hover:border-brand-dark/20 hover:bg-brand-dark/[0.06]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-brand-dark px-4 py-2.5 text-sm text-white">
                    {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3">
                  <AssistantAvatar />
                  <div className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-brand-dark">
                    {m.parts.map((part, i) => {
                      if (part.type === "text") {
                        return <MessageResponse key={`${m.id}-${i}`}>{part.text}</MessageResponse>
                      }
                      if (part.type === "data-consultation") {
                        return <ConsultationCard key={`${m.id}-${i}`} offer={part.data as ConsultationOffer} />
                      }
                      return null
                    })}
                  </div>
                </div>
              ),
            )
          )}
          {status === "submitted" && (
            <div className="flex items-start gap-3">
              <AssistantAvatar />
              <TypingDots />
            </div>
          )}
          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
              {copy.error}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <form onSubmit={onSubmit} className="p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-3xl border border-brand-dark/10 bg-brand-dark/[0.03] p-2 pl-4 transition-colors focus-within:border-brand-dark/25 focus-within:bg-white">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            maxLength={2000}
            rows={1}
            className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent p-0 py-2 text-sm text-brand-dark shadow-none outline-none placeholder:text-brand-dark/40 focus:border-0 focus:ring-0 focus:outline-none"
          />
          <button
            type={busy ? "button" : "submit"}
            onClick={busy ? () => stop() : undefined}
            disabled={!busy && !input.trim()}
            aria-label={busy ? copy.stop : copy.send}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white transition-opacity",
              "disabled:opacity-25 hover:opacity-85",
            )}
          >
            {busy ? <SquareIcon className="size-3.5 fill-current" /> : <ArrowUpIcon className="size-4" />}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-brand-dark/50">{copy.disclaimer}</p>
      </form>
    </div>
  )
}
