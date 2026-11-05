import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react"
import { GraduationCapIcon, XIcon } from "lucide-react"

const Chat = lazy(() => import("./Chat"))

type HelpBubbleProps = {
  copy: ComponentProps<typeof Chat>["copy"] & {
    bubbleOpen: string
    bubbleClose: string
    bubbleTitle: string
  }
}

export default function HelpBubble({ copy }: HelpBubbleProps) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const toggle = () => {
    setLoaded(true)
    setOpen((value) => !value)
  }

  return (
    <div className="fixed right-4 bottom-4 z-[1100] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      {loaded && (
        <div
          role="dialog"
          aria-label={copy.bubbleTitle}
          hidden={!open}
          data-lenis-prevent
          className="flex h-[min(36rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-2xl shadow-brand-dark/20"
        >
          <div className="flex items-center justify-between border-b border-brand-dark/10 px-4 py-3">
            <p className="text-sm font-semibold text-brand-dark">{copy.bubbleTitle}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={copy.bubbleClose} className="rounded-full p-1.5 text-brand-dark/60 hover:bg-brand-dark/5 hover:text-brand-dark">
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <Suspense fallback={null}>
              <Chat copy={copy} variant="panel" />
            </Suspense>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-dark/25 transition-transform hover:scale-105"
      >
        {open ? <XIcon className="size-4" /> : <GraduationCapIcon className="size-4" />}
        {open ? copy.bubbleClose : copy.bubbleOpen}
      </button>
    </div>
  )
}
