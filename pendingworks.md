# 📋 Pending Works — Vintage Cartoon

Single source of truth for **open work**. Every task must be claimed and updated here.
**Agents:** claim tasks in the table, work on a branch, and flip status in the same PR (protocol in [`AGENTS.md`](AGENTS.md)).

**Status legend:** ⬜ todo · 🟨 in-progress (`@agent`, branch) · ✅ done (PR #) · 🧊 blocked

---

## 🔴 P0 — Blocking production readiness

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P0-1 | **Create the Vercel project + add the 3 repo secrets** (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) per [`deployment.md §B.1`](deployment.md) | `deploy.yaml` deploys nothing until these exist | ⬜ todo | — | Actions "Deploy to Vercel" run is green on `main`; site reachable at production URL |
| P0-2 | **Verify the full deploy pipeline** (push → Actions → production) | First real deploy of the workflow | ⬜ todo | — | Post-deploy checklist in [`deployment.md`](deployment.md) all green |
| P0-3 | **Fix hub-entry card playback** — the `id: "jackie-chan"` card in `cartoons.json` has `videoUrl: ""`; ensure clicking it never opens an empty modal, only enters the hub | Broken/empty player UX | ✅ done | fix sweep | Empty `videoUrl` + `isShowHubEntry` always routes to hub; no blank modal possible — verified via play-guard in `App.jsx` |

---

## 🟠 P1 — Content correctness (high visibility)

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P1-1 | **Replace placeholder video URLs with show-accurate streams.** Several catalog entries currently play unrelated archive shorts (e.g. "Dexter's Laboratory" → a Daffy Duck short; "Tom and Jerry" → a Popeye short; "Ben 10" → generic volume reel; "Spider-Man" → a Superman short). Each should point at a real/representative public-domain item or an honest placeholder label until mapped | Core promise of the site: stream what the card says | ⬜ todo | — | Every entry's `videoUrl` matches its title, or the card visibly states "placeholder reel" |
| P1-2 | **Replace Unsplash thumbnails with archive.org `.thumbs/` stills** for all `cartoons.json` entries (hub data already uses archive thumbs) | Thumbnails are generic stock photos today; break immersion + risk hotlink limits | ⬜ todo | — | No Unsplash URLs remain in `src/data/*.json` |
| P1-3 | **Complete Season 1 (13/39 episodes indexed)** — add missing `s1e14`–`s1e39` with talisman/timeline data | Hub promises all seasons; S1 is visibly incomplete | ✅ done (diverted) | fix sweep | **Original premise was wrong:** the real Season 1 length is **13** episodes (matches `s1e01`–`s1e13` ids), verified against the archive video item. Dataset is complete — no missing episodes exist |
| P1-4 | **Tamil audio coverage for S2–S5** — S1 episodes carry `audioUrl` dubs; find archive dub files for later seasons | Signature feature (dual-audio Tamil dub) missing for most of the hub | ✅ done (diverted) | fix sweep | **Original premise was wrong:** the archive dub item holds **95 `.m4a` tracks covering ALL seasons** (Season_1…Season_5 folders); every episode already has `audioUrl` — dataset verified complete |
| P1-5 | **Audit titles ↔ metadata** (ratings, durations, channels) against real broadcast info; fix He-Man/90s-era mismatches | Trust + search quality | ⬜ todo | — | Data spot-check documented in PR |

---

## 🟡 P2 — Product polish

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P2-1 | **URL routing / deep links** — shareable `#/show/jackie-chan/s1e05` or `/ep/:id` state so modals can be linked and restored on refresh | Shareability; browser back/forward closes the modal | ⬜ todo | — | Opening a deep link opens the correct episode; back button closes it |
| P2-2 | **"Continue watching" progress** — persist `currentTime` per episode id (localStorage, e.g. `vintage_progress`) and offer resume in the modal | Core streaming UX | ✅ done | fix sweep | Progress saved under `vintage_progress`, modal auto-resumes via `resumeAt` prop; buffering ID/window restored |
| P2-3 | **Debounce search** (~200–300ms) or memoize `filteredData` — filtering runs on every keystroke over both catalogs | Perf on mid-range devices | ✅ done | fix sweep | `useDebouncedValue` (`src/hooks/useDebouncedValue.js`) delays filtering; typing no longer re-filters per keystroke |
| P2-4 | **Wire keyboard-nav modal state** — `useKeyboardNav` is initialized with hardcoded `modalOpen: false`; pass real state so zone navigation behaves while the modal is open | Correctness of the focus engine | ✅ done | fix sweep | Real `modalOpen` state wired; Escape handled once |
| P2-5 | **Episode-count robustness** — guard `featuredCartoon`/`activeData` for empty results (no crash when a filter yields nothing) | Resilience | ✅ done | fix sweep | Empty results render the no-results card; guards in place |
| P2-6 | **Replace site-data hotlinking assumptions** — add a loading state / error card in the modal for failed archive.org fetches | Graceful degradation | ✅ done | fix sweep | Failed stream shows a friendly "can't reach the archive" card with retry button (flaw fix F12) |

---

## 🟢 P3 — Nice to have / infrastructure

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P3-1 | **CI lint gate on PRs** — extend `deploy.yaml` (or add `ci.yaml`) to run `npm ci && npm run lint && npm run build` on PRs | Keeps `main` always deployable | ⬜ todo | — | PR checks visible and required |
| P3-2 | **PWA basics** — `manifest.json`, maskable icons, offline fallback page | Installability for repeat visitors | ⬜ todo | — | Lighthouse PWA installable; offline shows fallback |
| P3-3 | **`sitemap.xml` + `robots.txt`** | SEO hygiene | ⬜ todo | — | Both served from production root |
| P3-4 | **Security headers via `vercel.json`** — add `Permissions-Policy`, frame-ancestors CSP | Hardening | ⬜ todo | — | Headers present (securityheaders grade B+) |
| P3-5 | **Analytics (privacy-friendly)** — e.g. Plausible/Umami | Know what's watched | 🧊 blocked | — | Await owner decision on provider |
| P3-6 | **Component tests** — Vitest + RTL for filtering logic and modal mount | Prevent regressions | ⬜ todo | — | Filter logic covered; CI runs tests |
| P3-7 | **Clean up `App.jsx` + warnings** — remove the `no-use-before-define` disable block by reordering declarations; fix the 4 Oxlint warnings: `leaveJackieChanHub` unused (hub exit is handled directly in `Navbar.jsx`), `Filter` import unused in `SearchFilter.jsx`, unused catch param in `VideoModal.jsx:315`, exhaustive-deps in `VideoModal.jsx:187` | Tech debt | ✅ done | fix sweep | `npm run lint` passes with **0 warnings**; disable block and stale comment removed |
| P3-8 | **TypeScript migration (incremental)** — start with `data/*.json` types (`Cartoon`, `Episode`) | Long-term safety | ⬜ todo | — | Type definitions exist; new code typechecked |
| P3-9 | **Accessibility pass** — visible `:focus-visible` rings for keyboard users, aria-labels on icon buttons, reduced-motion media query | Inclusive UX | ✅ done | fix sweep | Focus rings on nav controls + card poster buttons (`card-thumbnail-btn:focus`), aria-labels on icon buttons, `prefers-reduced-motion` honored (flaw fixes F10/F21/F22) |
| P3-10 | **Thumbnails fallback image** — shared SVG placeholder in `public/` for broken thumbs | Polish | ⬜ todo | — | Broken image URLs render placeholder, not the browser default |

---

## 📌 Standing / recurring duties (every PR)

- [ ] Update the relevant row above (status + PR #) in the **same PR**.
- [ ] `npm run lint` + `npm run build` green.
- [ ] Verify affected media still streams from archive.org (spot-check changed entries).
- [ ] Keep JSON field names exactly as the schemas in [`features.md §9`](features.md).

---

## 🗒️ Changelog

| Date | Change |
|------|--------|
| 2026-10-29 | Initial backlog created from full repo audit (code, data, build, deploy) |
| 2026-10-29 | Added `design_flaws.md` — code-level flaw inventory (F1–F24) with fix order |
| 2026-10-29 | Fix sweep: all 24 flaws fixed (see `design_flaws.md` matrix); closed P0-3, P2-2, P2-3, P2-4, P2-5, P2-6, P3-7, P3-9; P1-3/P1-4 closed as "diverted" — their premises turned out wrong and the hub data was already complete |
| 2026-10-29 | Loading/animation tuning: reveal entrance 1.8s → 0.45s, stagger capped at 0.24s, persistent IntersectionObserver reveals on-screen items instantly |
| 2026-10-29 | Catalog: added 10 genuine public-domain "Classic Reels" entries (Superman 1942, Popeye ×3, Mighty Mouse ×2, Betty Boop ×3, Gulliver's Travels 1939) — every stream + thumbnail URL HEAD-verified on archive.org |

---

## Related docs

[`README.md`](README.md) · [`features.md`](features.md) · [`developement.md`](developement.md) · [`deployment.md`](deployment.md) · [`AGENTS.md`](AGENTS.md)
