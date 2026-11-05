# UniPath (uni-agency)

Website for a UK agency that gives free advice to **UK students** (school leavers and mature students) on choosing a university and course, applying, and student finance. Its main job is to **capture leads** and get students to book a free consultation.

- Live: https://uni-agency.vercel.app (Vercel, auto-deploys from `main`). Domain not bought yet. When it is, update `SITE_URL` in `site.config.mjs` and `siteUrl` in `src/data/global/company.json`.
- "UniPath" is a **placeholder name**, set in `company.json` (logo, schema) and the copy.
- Content and structure follow https://gcrdhub.com (UK and international sections dropped). All text is rewritten in our own words. Never copy from it.
- Original plan: `~/development/grill-docs/uni-agency-plan.md`.

## Stack

Astro 7 (static output + `@astrojs/vercel` adapter for the API routes), React islands, TypeScript, Tailwind 4, built on the **Nova** theme by WebScale (see `AI-QUICKSTART.md`, `CUSTOMIZATION.md`). The theme licence (`LICENSE.md`) requires replacing the demo images in `public/assets/images/t001-nova/`.

```bash
npm run dev            # restart after adding .env vars or new files if imports fail
npx astro check        # types
npx vitest run         # tests
npm run build          # full build (scopes pages, prunes assets). Use this, not `astro build`
```

## Where things live

| What | Where |
| --- | --- |
| Universities (1 JSON per uni) | `src/content/universities/*.json` |
| Courses (1 JSON per course, `universities` references uni ids) | `src/content/courses/*.json` |
| Collection schemas | `src/content.config.ts` |
| Level labels, course/uni helpers | `src/utils/courses.ts`, `src/utils/universities.ts` |
| Homepage + menu + footer + chat copy | `src/data/i18n/nova.json` |
| Homepage section order | `src/data/pages/index.json` |
| Custom homepage sections | `src/components/registry/home/` (registered in `src/config/section-registry/*` + `component-manifest.ts`) |
| Desktop menu with Courses dropdown | `src/components/ui/molecules/Navbar/shared/DesktopNav.astro` |
| Text pages (About, Student Finance) | `src/pages/*.astro` using `src/components/content/ContentPage.astro` |
| Legal (UK GDPR privacy, cookies) | `src/content/legal/*.json` |
| Pages included in production build | `BUILD_SCOPE.pages` in `site.config.mjs`. **New top-level routes must be added here** |

Adding a university or course = add a JSON file. Its page, listings, sitemap and the chat's knowledge update automatically.

## Find your course (AI chat)

- Page `/find-your-course/` (`src/components/ai/AiPage.astro`), plus a "Need help?" bubble on every page (`HelpBubble.tsx`, lazy-loads the chat, persists across navigation).
- Endpoint `src/pages/api/chat.ts`: Anthropic SDK, `claude-opus-5-5`, streams to Vercel AI SDK `useChat`. The system prompt includes a catalogue generated from the collections (`src/utils/course-catalogue.ts`).
- The model calls an `offer_consultation` tool after recommending a course. The server turns it into a `data-consultation` UI part, which renders a booking card with an inline lead form (`Chat.tsx`).
- Presented as a course finder, not "AI". It must never pretend to be human.
- `?q=` on `/find-your-course/` auto-sends a question (used by "Can I get in?" buttons on course and uni pages).

## Leads

- Form: `src/components/leads/LeadForm.tsx`, used in the chat card and on `/book/`. All "Book a free consultation" and Contact links go to `/book/` (course pages pass `?course=`).
- Endpoint `src/pages/api/lead.ts` saves to **HubSpot** (`src/lib/hubspot.ts`): creates the contact, or updates it by email if it exists. Custom contact properties: `course_interest`, `enquiry_summary`, `enquiry_source` (created once by `node --env-file=.env scripts/hubspot-setup.mjs`).
- The form also works without JS (POST, then redirect to `/book/?sent=1`). Never let it fall back to GET, because personal data would end up in the URL.

## Env vars (`.env` locally, Vercel as **Sensitive**)

`ANTHROPIC_API_KEY`, `HUBSPOT_TOKEN` (HubSpot service key). Never read or commit `.env`. Never prefix secrets with `PUBLIC_`.

## Gotchas learned

- **Lenis smooth scroll** (`public/js/lenis.js`) hijacks the wheel. `allowNestedScroll: true` lets scrollable boxes (the chat) scroll and then hands off to the page. Hash links are handled in a capture-phase click listener so they beat Astro's ClientRouter.
- **Theme fade-in motion** staggers every card in a section (120ms each), so long lists appear slowly. Put `data-motion="fade"` on the heading block to opt the section out (see the universities and courses pages).
- **Vite "Failed to fetch dynamically imported module"** in dev means restart the dev server. It's not a code bug.
- The theme came with **Polish** demo content. Most is removed, but leftovers remain in dev-only demo pages (`src/pages/dev`, `qa`, blog posts, unused section JSON, code comments).
- `Schema.astro` outputs an `Organization` (no address) until real company details exist.
- Streamdown (chat markdown) shows a link-safety popup. Internal links skip it via `onLinkCheck` in `Chat.tsx`.

## Status (Nov 2026)

Done: universities, courses, homepage rewrite, About, Student Finance, UK privacy/cookies, Find your course chat + bubble, consultation card, HubSpot lead capture, `/book/`, social preview image.

Next / open:
1. **Cal.com booking** after the lead form (waiting on the booking link). Add the Cal.com webhook to update the HubSpot lead status.
2. Real agency name, contact details (`company.json` email is a placeholder), real images, logo.
3. Rate limiting on `/api/chat` and `/api/lead`. Set a spend limit in the Anthropic Console.
4. Verify the `/ai/` → `/find-your-course/` redirect works with the trailing slash on Vercel.
5. Remove unused `src/pages/terms.astro` + `src/content/legal/terms*` and `src/data/ai/product.md`.
6. Facts in uni and course JSON are general/typical and need checking before launch. Course→university links are only filled where confident.
7. Lighthouse: mobile LCP (hero image) and some accessibility issues (contrast, aria-hidden fixed header).
