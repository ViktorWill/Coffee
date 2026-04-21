# Coffee Dialer — Improvement Brief for GitHub Copilot

> **Audience:** GitHub Copilot (and a human reviewer).
> **Goal:** Take this app from "feature-complete prototype" to a polished, production-grade barista tool.
> **Style of work:** Treat each section below as a self-contained work item. Open a PR per section, keep changes surgical, do not refactor unrelated files.

---

## 0. Context (read this first)

Stack: React 19 + Vite 7 + TypeScript + Tailwind v4 + shadcn/Radix + Phosphor icons + Recharts + Framer Motion + Azure Static Web Apps + Azure Functions (Node 20) for KV + LLM photo analysis.

Domain model (`src/lib/types.ts`):
- `CoffeeBean` (espresso | filter)
- `Extraction` (grindSetting, timeSeconds, outputGrams, optional dosingWeight, tasteNotes, notes)
- `TastingProfile` (FlavorNote[] across 6 categories)
- `AdvisorRecommendation` (finer | coarser | perfect)

State is persisted via `useKV` → `/api/kv`, scoped per user via `${userId}:coffee-beans` style keys. Auth via SWA `/.auth/me`.

The app works. The issues below are about **correctness, UX polish, data integrity, and depth of features**.

---

## 1. High-impact bugs and correctness issues

These are not opinions. Fix these first.

### 1.1 `useKV` race condition on first render
**File:** `src/hooks/useKV.ts`
**Problem:** The hook returns `defaultValue` immediately, then async-fetches the real value. If the user (or `useEffect`) calls `setValue` before the fetch resolves, the in-flight GET overwrites the user's write — silent data loss.
**Fix:**
- Track `initializedRef`. If `setValue` is called before init completes, mark a `dirtyRef` and have the GET ignore its result if dirty.
- Optionally, surface an `isLoading` flag from the hook so callers can guard rendering.
- Reject the GET response if it arrives after a local write happened.

### 1.2 KV writes are fire-and-forget with no error surfacing or retry
**File:** `src/hooks/useKV.ts`
**Problem:** A failed PUT only logs to console. The user sees the optimistic UI succeed, reloads, and the data is gone.
**Fix:**
- Show a `sonner` toast on persistence failure ("Couldn't save — retrying").
- Add a small in-memory retry queue with exponential backoff (3 attempts).
- Persist a "last unsaved change" snapshot to `localStorage` as a recovery net.

### 1.3 KV writes are not debounced
Rapid sequential writes (e.g., 10 beans imported) issue 10 PUTs. Coalesce writes per key with a ~250 ms trailing debounce.

### 1.4 Per-user storage key collisions / leaks
**File:** `src/App.tsx` lines 151–162
**Problem:** Keys are `"${currentUserId}:coffee-beans"`. If `currentUserId` ever contains `:`, parsing breaks. Also: there is no mechanism to delete a user's data when they sign out / delete account.
**Fix:**
- Encode userId (e.g., `encodeURIComponent`) when building keys.
- Add a "Delete my account & data" action in `UserHeader` that calls a new `/api/kv-delete-prefix` Function.

### 1.5 `useEffect` logging beans on every change leaks PII to console
**File:** `src/App.tsx` lines 179–181, 222–227
Remove `console.log` of bean contents in production. Gate behind `import.meta.env.DEV`.

### 1.6 Sort mutates the input array
**File:** `src/App.tsx` lines 194–212
`beansToFilter.sort(...)` mutates the array returned by `.filter()` — that's fine because filter returns a new array, but the pattern is fragile. Use `[...arr].sort(...)` everywhere for clarity and to prevent future bugs when the source changes.

### 1.7 Advisor doesn't use `dosingWeight` for ratio analysis
**File:** `src/lib/advisor.ts`
**Problem:** The espresso branch hardcodes `outputGrams / 18` (assumes 18 g dose). If the user sets dose = 20 g, the ratio is wrong.
**Fix:** Use `extraction.dosingWeight ?? 18`. Better, only compute ratio if `dosingWeight` is set; otherwise omit ratio reasoning.

### 1.8 Advisor ignores conflicting taste notes
PRD edge case: "When user selects contradictory tastes (sour + bitter), flag and ask for primary issue."
Currently the first matching branch wins silently. Detect conflicts (`sour && bitter`, `watery && too-intense`) and either:
- Require the user to pick one as "primary" before advice is given, or
- Return a recommendation explicitly addressing channeling / uneven extraction (which is what those combinations usually indicate).

### 1.9 `dosingWeight` not validated on espresso when present
**File:** `src/components/ExtractionDialog.tsx` line 72
The check `dosingWeight && (isNaN(dose!) || dose! <= 0)` is a string-truthiness check — `"0"` passes the truthy check but fails validation. Fine today, but use `parseFloat` first.

### 1.10 Filter coffee form has no dose field
The brew ratio is just as critical for filter (1:15–1:18). Add `dosingWeight` for filter mode too, and surface the ratio in the brew-ratio card.

### 1.11 Time input UX is hostile
For filter, the user types `180` seconds for a 3:00 brew. Provide a `mm:ss` masked input or two fields (`min`, `sec`) with derived seconds. For espresso, allow sub-second precision (some pros track 27.5 s).

### 1.12 `EditBeanDialog` and confirm-delete state declared twice
**File:** `src/App.tsx` lines 33–36 and 167–169
The outer `App` component declares `editBeanDialogOpen`, `deleteConfirmOpen`, `beanToDelete` and never uses them; `AuthenticatedApp` redeclares them. Remove the dead state from `App`.

### 1.13 No archive UI exposed
`CoffeeBean.archived` exists in the type and is filtered out, but there's no UI to archive/unarchive. Either implement (recommended) or delete the field.

### 1.14 `staticwebapp.config.json` forces AAD on `/api/*` only
The frontend depends on `/api/kv` returning the user — if a session expires mid-use, KV writes silently 401 and `useKV` swallows it. Detect 401 in `useKV` and trigger a re-auth flow.

### 1.15 `vite.config.ts` and TS strictness
Run `npm run build` once; the `tsc -b --noCheck` flag means TypeScript errors are not enforced in CI. Drop `--noCheck` and fix whatever surfaces.

---

## 2. Data model gaps

These additions unlock entire feature classes; do them before the feature work in §4.

### 2.1 Track water and machine variables
Add to `Extraction`:
```ts
waterTempC?: number      // brew water temp
preInfusionSeconds?: number
pressureBar?: number     // espresso
bloomSeconds?: number    // filter
bloomGrams?: number
brewMethod?: 'V60' | 'Chemex' | 'Aeropress' | 'Kalita' | 'French Press' | 'Espresso' | 'Other'
```

### 2.2 Bag-level metadata for freshness warnings
Add to `CoffeeBean`:
```ts
roastDate?: number       // epoch ms
openedDate?: number
bagWeightGrams?: number
remainingGrams?: number  // decremented per extraction by dose
pricePer100g?: number    // optional, enables "cost per shot"
```
Freshness warning logic:
- `< 7 days post-roast` → "Still resting, may taste flat"
- `7–28 days` → optimal
- `> 35 days` → "Past peak"
- `opened > 21 days ago` → "Oxidation likely"

### 2.3 Versioned schema + migration runner
Wrap KV reads in a versioned envelope `{ schemaVersion: 3, data: ... }` and include a one-shot migration utility. Right now any future shape change silently corrupts data.

### 2.4 Export / import
Add a JSON export of all beans + extractions + tasting profiles, and a corresponding import. Critical for user trust when KV is the only persistence layer.

---

## 3. UX & visual polish

### 3.1 Empty state dedup
**File:** `src/App.tsx` lines 422–486
The espresso and filter `TabsContent` blocks are near-identical 30-line copies. Extract `<BeanGrid coffeeType={...} />`.

### 3.2 No loading skeletons for beans
`useKV` returns `[]` then populates async. Show a skeleton grid while `isLoading`.

### 3.3 Filter / sort bar overflows on mobile
The sort + filter row stacks into ~5 controls. Collapse into a single "Sort & filter" sheet on small screens (use `vaul`, already a dep).

### 3.4 No search field
With more than ~10 beans, scrolling is painful. Add a debounced text search over `name`, `blend`, `tasteNotes`, `origin`.

### 3.5 Bean card density
Each card is tall. Offer a list/compact view toggle persisted per-user.

### 3.6 Dark mode
`next-themes` is installed but no toggle is wired up. Add a theme switcher in `UserHeader`. Ensure the brand brown/cream palette has tested dark counterparts (the PRD specifies light-mode contrast ratios only).

### 3.7 Keyboard accessibility
- The taste-note `Badge` chips in `ExtractionDialog` are clickable `div`s without `role="button"` / `tabIndex` / Enter+Space handlers. Use a real button or `<Toggle>` from Radix.
- Trap focus inside dialogs (Radix does this; verify that the close-on-escape works after the advisor appears — currently the cancel button label changes but focus isn't moved).

### 3.8 Mobile dialog ergonomics
PRD calls for "full-screen sheet on mobile". Currently `Dialog` is centered with `sm:max-w-[550px]` — on a 360 px phone it works but the keyboard covers the save button. Switch to `vaul` `Drawer` below `sm`.

### 3.9 Numeric inputs need steppers and units
Use `<Input type="number" inputMode="decimal" />` and add a unit suffix inside the input (e.g., a right-aligned `g`, `s`). Today users mistype seconds vs minutes regularly.

### 3.10 Advisor placement
After saving, the dialog stays open showing the advisor with a "Close" button. Better: close the dialog, surface the advisor as a non-blocking toast/inline panel under the bean card, and offer a "Try again with this adjustment" CTA that pre-fills the next extraction with `grindSetting + suggestedChange`.

### 3.11 Bean card photo treatment
A 64×64 thumbnail next to the name is awkward. Either:
- Use a `bg-image` header strip with subtle gradient overlay, or
- Hide it on mobile and show on hover/expand on desktop.

### 3.12 Animations are stacked
`framer-motion` is wrapping every card with an `initial={{opacity:0,scale:0.97}}`. With 30 beans the first paint shudders. Use `staggerChildren` with a max of ~8 animated children, then snap the rest.

### 3.13 Iconography is mixed
`@phosphor-icons/react`, `@heroicons/react`, and `lucide-react` are all installed. Pick one (Phosphor is most used) and remove the other two — saves ~200 KB and avoids style mismatches.

### 3.14 No app-wide error boundary feedback
`ErrorFallback.tsx` exists; verify it's wired in `main.tsx` and shows actionable info (reload + report).

---

## 4. Feature additions (ranked by ROI)

### 4.1 ⭐ "Next shot" guided dial-in flow
Today each extraction is independent. Add a flow:
1. User taps "Start dial-in" on a bean.
2. App proposes starting parameters (from history median, or sensible defaults if none).
3. User logs the shot; advisor proposes next grind.
4. App auto-creates the next session pre-filled with the new grind.
5. Stop when user marks "Dialed in".

This turns the app from a logbook into a coach — closer to the PRD vision.

### 4.2 ⭐ Charts: actually use Recharts
`recharts` is installed and `ExtractionChart.tsx` exists; verify it's reachable from the bean card chart icon. Add:
- Grind setting over time (line)
- Brew ratio over time
- Extraction time vs taste outcome (scatter, color-coded by perfect/sour/bitter)
- "Sweet spot" highlight band

### 4.3 Recipe presets per bean
Once dialed in, save "this is my recipe": dose, grind, time, output, water temp, profile. One tap to log a shot using the recipe with only "did it taste right?" feedback.

### 4.4 Voice / one-tap timer
Espresso pulls are 25–35 s; users juggle a phone, a scale, and a portafilter. Add a giant in-dialog timer button (tap to start/stop) that auto-fills `timeSeconds`. Bonus: integrate `navigator.vibrate` on milestone seconds.

### 4.5 Compare extractions side-by-side
Multi-select 2–3 extractions, see a diff view. Hugely useful for figuring out what changed between a great and a bad shot.

### 4.6 Smarter LLM photo analysis
`/api/analyze-photo` only fills name/blend/notes. Extend it to also extract:
- Roast date (printed on most specialty bags)
- Origin / region / farm
- Process (washed, natural, honey, anaerobic)
- Variety (Bourbon, Geisha…)
- Roaster name
Return structured JSON with confidence per field; show low-confidence fields with a yellow underline so the user reviews them.

### 4.7 Roaster / shop directory
Auto-aggregate a per-user list of roasters. Quick filter "show me all my Hasbean beans".

### 4.8 Cost per shot
With `pricePer100g` and `dosingWeight`, render "€0.42 per shot" on each bean card. Surprisingly motivating data.

### 4.9 Public / shared dial-in cards
Generate a read-only URL for a dialed-in recipe (`/r/:slug`) so users can share with friends. Server-side store, no auth needed for reading.

### 4.10 Brew method intelligence
Filter advice currently treats all methods identically. V60 vs French Press want very different grind sizes and brew times. Branch `getAdvisorRecommendation` on `extraction.brewMethod` with method-specific targets.

### 4.11 Notifications / reminders
"Bean opened 25 days ago — consider finishing soon." "You haven't logged a shot in 5 days." Web push via the SW.

### 4.12 PWA install
Add a manifest, install prompt, offline shell. The app is used in a kitchen; offline matters.

### 4.13 Internationalization
Hardcoded English everywhere. Pull strings into `i18next` (or built-in `Intl.MessageFormat`). At minimum add German given the dev's locale.

---

## 5. Code organization & quality

### 5.1 `App.tsx` is 540 lines and renders both auth gate and the entire app shell
Split into:
- `App.tsx` — auth gate only
- `routes/Dashboard.tsx` — current `AuthenticatedApp` body
- `routes/Dashboard/BeanGrid.tsx`
- `routes/Dashboard/FilterBar.tsx`
- `state/useBeans.ts`, `state/useExtractions.ts`, `state/useTastingProfiles.ts` — wrap `useKV` and expose typed helpers (`addBean`, `updateBean`, `deleteBeanCascade`).

### 5.2 No state management beyond `useKV`
For features like "start dial-in" that span dialogs, lift to `zustand` or a `BeansContext`. `@tanstack/react-query` is already a dep; consider using it as the source of truth over `/api/kv` (with optimistic mutations) and dropping `useKV`.

### 5.3 Validation
`zod` is a dep but unused for forms. Define schemas for `CoffeeBean` and `Extraction`, hand them to `react-hook-form` + `@hookform/resolvers/zod`. Replaces all the manual `parseFloat / isNaN` checks in dialogs.

### 5.4 Tests
There are zero. Minimum viable:
- `src/lib/advisor.test.ts` — table-driven tests of every input → recommendation path
- `src/hooks/useKV.test.ts` — race conditions and retry behavior (mock fetch)
- A Playwright smoke test: sign in → add bean → log extraction → see advisor.

### 5.5 ESLint / formatting
`eslint` is configured but no `format` script. Add Prettier (or use `eslint --fix`) and a pre-commit hook (`lint-staged` + `husky` or `simple-git-hooks`).

### 5.6 Bundle audit
Three icon libraries, `three.js` (175 KB+ gzipped) — is it actually used? Run `npm run build -- --analyze` (add `rollup-plugin-visualizer`) and prune. Likely savings: 30–40 % of JS.

### 5.7 Backend (`api/`)
Not visible in detail here, but verify:
- KV functions enforce that `key` belongs to the calling user (defense in depth — don't trust the client to namespace).
- Rate-limit `/api/analyze-photo`.
- `analyze-photo` body size limit (image base64 can be multi-MB).
- Add a `/api/health` endpoint for SWA monitoring.

---

## 6. Documentation

### 6.1 `README.md` is the Spark template stub
Replace with:
- What the app does (1 paragraph)
- Screenshots / GIF
- Local dev (`npm install`, `npm run dev`, how to run the Functions locally with `swa start`)
- Required env vars (LLM key, etc.)
- Architecture diagram (Mermaid is fine)
- Deployment notes (SWA + AAD setup)

### 6.2 Inline docs
Add JSDoc to `getAdvisorRecommendation` explaining the heuristic boundaries; users will eventually want to tune them.

---

## 7. Suggested PR order

1. §1 bug fixes (single PR, no behavior changes beyond correctness)
2. §2.3 schema versioning + §2.4 export/import (de-risks future data work)
3. §5.3 zod + react-hook-form refactor of dialogs
4. §2.1–2.2 data model expansions
5. §3 UX polish pass
6. §4.1 + 4.2 dial-in flow + charts (the killer features)
7. §4.4 timer, §4.5 compare, §4.6 richer LLM
8. §4.11–4.12 PWA + notifications

---

## 8. Out of scope (don't do)

- Don't migrate away from SWA / Azure Functions.
- Don't replace Tailwind v4 with anything else.
- Don't introduce a new component library; stay on shadcn/Radix.
- Don't add server-side rendering — this is a client app.
- Don't add a custom auth flow; keep SWA `/.auth/*`.

---

*End of brief. When implementing, prefer surgical PRs that match the section numbers above so review is manageable.*
