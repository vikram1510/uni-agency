import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

type LeadFormProps = {
  source: "chat" | "book-page"
  course?: string
  summary?: string
  compact?: boolean
}

type Status = "idle" | "sending" | "done" | "error"

const inputClass =
  "w-full rounded-xl border border-brand-dark/15 bg-white px-3.5 py-2.5 text-sm text-brand-dark outline-none placeholder:text-brand-dark/40 focus:border-brand-dark/40"

export default function LeadForm({ source, course, summary, compact = false }: LeadFormProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")
  const [firstName, setFirstName] = useState("")
  const [courseValue, setCourseValue] = useState(course ?? "")

  useEffect(() => {
    if (source !== "book-page") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("sent") === "1") setStatus("done")
    if (params.get("error") === "1") {
      setError("Something went wrong. Please try again.")
      setStatus("error")
    }
    const fromUrl = params.get("course")
    if (fromUrl && !course) setCourseValue(fromUrl.slice(0, 200))
  }, [source, course])

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    setStatus("sending")
    setError("")

    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: String(form.get("email") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim() || undefined,
        course: String(form.get("course") ?? course ?? "").trim() || undefined,
        summary: [summary, String(form.get("message") ?? "").trim()].filter(Boolean).join("\n\n") || undefined,
        source,
        consent: form.get("consent") === "on",
        website: String(form.get("website") ?? ""),
      }),
    }).catch(() => null)

    if (res?.ok) {
      setFirstName(name.split(/\s+/)[0])
      setStatus("done")
      return
    }
    const body = await res?.json().catch(() => null)
    setError(body?.error ?? "Something went wrong. Please try again.")
    setStatus("error")
  }

  if (status === "done") {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-brand-dark/[0.04] p-4 text-sm text-brand-dark">
        <CheckCircle2Icon className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>Thanks{firstName && `, ${firstName}`}!</strong> An advisor will be in touch soon to arrange your free consultation.
        </p>
      </div>
    )
  }

  return (
    <form method="post" action="/api/lead" onSubmit={onSubmit} className={cn("grid gap-3 text-left", compact ? "text-sm" : "")}>
      <input type="hidden" name="source" value={source} />
      {compact && course && <input type="hidden" name="course" value={course} />}
      {summary && <input type="hidden" name="summary" value={summary} />}
      <div className={cn("grid gap-3", !compact && "sm:grid-cols-2")}>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-brand-dark/70">Full name</span>
          <input name="name" required maxLength={100} autoComplete="name" className={inputClass} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-brand-dark/70">Email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className={inputClass} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-brand-dark/70">Phone (optional)</span>
        <input name="phone" type="tel" maxLength={30} autoComplete="tel" className={inputClass} />
      </label>
      {!compact && (
        <>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-brand-dark/70">Course you're interested in (optional)</span>
            <input name="course" value={courseValue} onChange={(e) => setCourseValue(e.target.value)} maxLength={200} className={inputClass} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-brand-dark/70">Anything else we should know? (optional)</span>
            <textarea name="message" rows={3} maxLength={800} className={cn(inputClass, "resize-none")} />
          </label>
        </>
      )}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="flex items-start gap-2 text-xs text-brand-dark/70">
        <input name="consent" type="checkbox" required className="mt-0.5" />
        <span>
          I agree to be contacted about my enquiry and to my details being handled as described in the{" "}
          <a href="/privacy-policy/" className="underline" target="_blank" rel="noopener">privacy policy</a>.
        </span>
      </label>
      {status === "error" && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:opacity-85 disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Request a free consultation"}
      </button>
    </form>
  )
}
