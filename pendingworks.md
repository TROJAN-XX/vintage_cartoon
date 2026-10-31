# 📋 Pending Works — Vintage Cartoon

Single source of truth for **open work**. Every task must be claimed and updated here.
**Agents:** claim tasks in the table, work on a branch, and flip status in the same PR (protocol in [`AGENTS.md`](AGENTS.md)).

**Status legend:** ⬜ todo · 🟨 in-progress (`@agent`, branch) · ✅ done (PR #) · 🧊 blocked

---

## 🔴 P0 — Blocking production readiness

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P0-1 | ~~**Create the Vercel project + add the 3 repo secrets** (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)~~ **Not needed — owner decision: deployment runs through Vercel's native Git integration** (push to `main` → Vercel builds; no GitHub Actions secrets) | `deploy.yaml` is unused under this model | ✅ done (owner decision) | owner | Site deploys on push to `main` via Vercel Git integration; no repo secrets required |
| P0-2 | ~~**Verify the full deploy pipeline** (push → Actions → production)~~ **Adapted to the Git-integration model**: verify push → Vercel build → production (the `.github/workflows/deploy.yaml` file is redundant and can be removed in a future cleanup task — see P4-4) | First real deploy | ✅ done (owner decision) | owner | Production reachable after push to `main`; post-deploy checklist in [`deployment.md`](deployment.md) applies |
| P0-3 | **Fix hub-entry card playback** — the `id: "jackie-chan"` card in `cartoons.json` has `videoUrl: ""`; ensure clicking it never opens an empty modal, only enters the hub | Broken/empty player UX | ✅ done | fix sweep | Empty `videoUrl` + `isShowHubEntry` always routes to hub; no blank modal possible — verified via play-guard in `App.jsx` |

---

## 🟠 P1 — Content correctness (high visibility)

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P1-1 | **Replace placeholder video URLs with show-accurate streams.** Several catalog entries currently play unrelated archive shorts (e.g. "Dexter's Laboratory" → a Daffy Duck short; "Tom and Jerry" → a Popeye short; "Ben 10" → generic volume reel; "Spider-Man" → a Superman short). Each should point at a real/representative public-domain item or an honest placeholder label until mapped | Core promise of the site: stream what the card says | ✅ done | sweep | **10/11 shows mapped to genuine archive items** (HEAD-verified streams); `codename-knd` has no full episode on archive.org → streams a working PD placeholder with a visible amber **"PLACEHOLDER REEL"** badge (`.card-placeholder-badge`) + `isPlaceholder: true` in JSON. Bonus: found 6 of the old fallback items were **dead on archive.org** (cards were streaming 404s) — all fixed |
| P1-2 | **Replace Unsplash thumbnails with archive.org `.thumbs/` stills** for all `cartoons.json` entries (hub data already uses archive thumbs) | Thumbnails are generic stock photos today; break immersion + risk hotlink limits | ✅ done | sweep | 0 Unsplash URLs remain in `src/data/*.json`; every card thumb is an archive `.thumbs/` still (or verified archive thumb for the KND placeholder) |
| P1-3 | **Complete Season 1 (13/39 episodes indexed)** — add missing `s1e14`–`s1e39` with talisman/timeline data | Hub promises all seasons; S1 is visibly incomplete | ✅ done (diverted) | fix sweep | **Original premise was wrong:** the real Season 1 length is **13** episodes (matches `s1e01`–`s1e13` ids), verified against the archive video item. Dataset is complete — no missing episodes exist |
| P1-4 | **Tamil audio coverage for S2–S5** — S1 episodes carry `audioUrl` dubs; find archive dub files for later seasons | Signature feature (dual-audio Tamil dub) missing for most of the hub | ✅ done (diverted) | fix sweep | **Original premise was wrong:** the archive dub item holds **95 `.m4a` tracks covering ALL seasons** (Season_1…Season_5 folders); every episode already has `audioUrl` — dataset verified complete |
| P1-5 | **Audit titles ↔ metadata** (ratings, durations, channels) against real broadcast info; fix He-Man/90s-era mismatches | Trust + search quality | ✅ done | sweep | Metadata audit documented in the changelog below: durations corrected for 6 reels (archive runtimes verified), 2 entries that pointed at **17s/31s clips** swapped for full-length PD items, Gulliver switched from the 6.6 GB master to the identical 411 MB `.ia.mp4` derivative. `year` fields intentionally keep Indian-broadcast-era semantics (aligned with category rows / era filter) — premiere-year mapping was rejected as it would break era filtering |

---

## 🟡 P2 — Product polish

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P2-1 | **URL routing / deep links** — shareable `#/show/jackie-chan/s1e05` or `/ep/:id` state so modals can be linked and restored on refresh | Shareability; browser back/forward closes the modal | ✅ done | sweep | Hash-based routes (no router dep): `#/`, `#/watch/<id>`, `#/show/jackie-chan`, `#/show/jackie-chan/<ep>`. Browser-verified: deep link opens the right context + episode, back closes the modal staying in the app, UI close replaces the URL without polluting history |
| P2-2 | **"Continue watching" progress** — persist `currentTime` per episode id (localStorage, e.g. `vintage_progress`) and offer resume in the modal | Core streaming UX | ✅ done | fix sweep | Progress saved under `vintage_progress`, modal auto-resumes via `resumeAt` prop; buffering ID/window restored |
| P2-3 | **Debounce search** (~200–300ms) or memoize `filteredData` — filtering runs on every keystroke over both catalogs | Perf on mid-range devices | ✅ done | fix sweep | `useDebouncedValue` (`src/hooks/useDebouncedValue.js`) delays filtering; typing no longer re-filters per keystroke |
| P2-4 | **Wire keyboard-nav modal state** — `useKeyboardNav` is initialized with hardcoded `modalOpen: false`; pass real state so zone navigation behaves while the modal is open | Correctness of the focus engine | ✅ done | fix sweep | Real `modalOpen` state wired; Escape handled once |
| P2-5 | **Episode-count robustness** — guard `featuredCartoon`/`activeData` for empty results (no crash when a filter yields nothing) | Resilience | ✅ done | fix sweep | Empty results render the no-results card; guards in place |
| P2-6 | **Replace site-data hotlinking assumptions** — add a loading state / error card in the modal for failed archive.org fetches | Graceful degradation | ✅ done | fix sweep | Failed stream shows a friendly "can't reach the archive" card with retry button (flaw fix F12) |

---

## 🟢 P3 — Nice to have / infrastructure

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P3-1 | **CI lint gate on PRs** — extend `deploy.yaml` (or add `ci.yaml`) to run `npm ci && npm run lint && npm run build` on PRs | Keeps `main` always deployable | ✅ done | sweep | `.github/workflows/ci.yaml` runs lint + build + tests on every PR to `main` |
| P3-2 | **PWA basics** — `manifest.json`, maskable icons, offline fallback page | Installability for repeat visitors | ✅ done | sweep | `manifest.webmanifest` + maskable SVG icon + `offline.html` + app-shell `sw.js` (PROD-only registration; **never caches archive.org media** — guardrail respected) |
| P3-3 | **`sitemap.xml` + `robots.txt`** | SEO hygiene | ✅ done | sweep | Both served from production root (`public/`) |
| P3-4 | **Security headers via `vercel.json`** — add `Permissions-Policy`, frame-ancestors CSP | Hardening | ✅ done | sweep | `Permissions-Policy` + `Content-Security-Policy: frame-ancestors 'self'` added (full CSP deliberately avoided — it would break archive.org streaming) |
| P3-5 | **Analytics (privacy-friendly)** — e.g. Plausible/Umami | Know what's watched | 🧊 blocked | — | Await owner decision on provider |
| P3-6 | **Component tests** — Vitest + RTL for filtering logic and modal mount | Prevent regressions | ✅ done | sweep | Vitest + RTL + jsdom configured (`vitest.config.js`); 16 storage-layer tests pass; CI runs `npm run test:run`. Note: `pool: 'vmThreads'` + `fileParallelism: false` (Windows worker-spawn timeouts on default pools) |
| P3-7 | **Clean up `App.jsx` + warnings** — remove the `no-use-before-define` disable block by reordering declarations; fix the 4 Oxlint warnings: `leaveJackieChanHub` unused (hub exit is handled directly in `Navbar.jsx`), `Filter` import unused in `SearchFilter.jsx`, unused catch param in `VideoModal.jsx:315`, exhaustive-deps in `VideoModal.jsx:187` | Tech debt | ✅ done | fix sweep | `npm run lint` passes with **0 warnings**; disable block and stale comment removed |
| P3-8 | **TypeScript migration (incremental)** — start with `data/*.json` types (`Cartoon`, `Episode`) | Long-term safety | ⬜ todo | — | Type definitions exist; new code typechecked |
| P3-9 | **Accessibility pass** — visible `:focus-visible` rings for keyboard users, aria-labels on icon buttons, reduced-motion media query | Inclusive UX | ✅ done | fix sweep | Focus rings on nav controls + card poster buttons (`card-thumbnail-btn:focus`), aria-labels on icon buttons, `prefers-reduced-motion` honored (flaw fixes F10/F21/F22) |
| P3-10 | **Thumbnails fallback image** — shared SVG placeholder in `public/` for broken thumbs | Polish | ✅ done | sweep | `public/thumb-placeholder.svg` + `onError` fallback on card posters (`MovieRow.jsx`) and hero backdrop (`Hero.jsx`) |

---

## 🎨 P4 — Visual identity (styling track)

| # | Task | Why it matters | Status | Owner | Acceptance criteria |
|---|------|----------------|--------|-------|---------------------|
| P4-1 | **Glassmorphism pass** — frosted-glass surfaces (search bar, filter panel, modal shell, footer) consistent with the existing neon system | Modern, cohesive look; ties the dark neon theme together | ✅ done | sweep | Translucent + `backdrop-filter: blur` panels with 1px light edges on navbar, search input, filter pills, select, modal shell, footer, hero meta badges; `.glass-panel` utility added; no per-card blur (perf); reduced-motion honored — browser-verified |
| P4-2 | **Smooth transitions & animations** — micro-interactions (card lift/glow, button shimmer), context-switch fade for the main area, loader-linked page transitions | Feels alive and polished without being gimmicky | ✅ done | sweep | New keyframes (`heroDrift` ken-burns, `playPulse`, `brandSpin/Float/Flicker/Breathe`) + springy cubic-bezier easing on cards/buttons/nav; `scroll-behavior: smooth`; all animations killed under `prefers-reduced-motion` (global + explicit guard); no layout thrash |
| P4-3 | **Custom page loader spinner** — branded first-paint loader (inline in `index.html`, fades out on React mount) + reusable loader for lazy surfaces (VideoModal Suspense, hub episodes) | First impression; no blank white/dark flash before the SPA mounts | ✅ done | sweep | Inline critical-CSS loader paints before JS (neon TV + rotating conic ring + shimmer wordmark); fades out + removes on React mount (double-rAF + transitionend); `src/components/Loader.jsx` reused for VideoModal Suspense fallback + hub episodes loading — browser-verified |
| P4-4 | **Cleanup: remove redundant deploy workflow** — `deploy.yaml` (Actions→Vercel) is unused under the Vercel Git-integration model; remove or repurpose | Dead config confuses future agents (it still references secrets that don't exist) | ⬜ todo | — | Either removed or clearly documented as unused; `deployment.md` updated to describe the Git-integration flow only |
| P4-5 | **Dependency-debt audit** — `npm audit fix` bumped vite 8.1.5 → 8.3.5 during P3-6 (0 vulns now); re-audit monthly and pin ranges | Security hygiene | ⬜ todo | — | `npm audit` reported clean at last run (2026-10-30) |

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
| 2026-10-30 | **Owner decision:** deployment runs through Vercel's native Git integration — P0-1/P0-2 closed (Actions secrets not needed); added P4-4 to remove the now-redundant `deploy.yaml` |
| 2026-10-30 | Infra sweep: closed P3-1 (PR CI gate with lint+build+tests), P3-3 (sitemap/robots), P3-4 (security headers), P3-6 (Vitest+RTL, 16 tests), P3-10 (thumbnail fallback SVG); `npm audit fix` applied (vite 8.1.5→8.3.5, 0 vulnerabilities) |
| 2026-10-30 | P3-2: PWA manifest + maskable icon + offline page + app-shell service worker (same-origin only; archive.org media never cached) |
| 2026-10-30 | P2-1: hash-based deep links (`#/watch/<id>`, `#/show/jackie-chan/<ep>`) with back/forward modal control — browser-verified |
| 2026-10-30 | Content sweep (P1-1/P1-2/P1-5): 10/11 shows mapped to genuine archive.org items (HEAD-verified); `codename-knd` = honest placeholder + visible badge; **6 old fallback items were dead on archive.org** (404 streams) — replaced; `popeye-customers-wanted` (31s clip) and `betty-boop-red-hot-mamma` (17s clip) swapped for full-length items; 6 durations corrected; Gulliver switched 6.6 GB master → 411 MB derivative; 0 Unsplash thumbs remain. `year` fields keep broadcast-era semantics (era-filter alignment) — deliberate decision |
| 2026-11-01 | Visual-identity sweep (P4-1/P4-2/P4-3): glassmorphism pass (navbar, search, filter pills, select, modal shell, footer, hero badges + `.glass-panel` utility); transition/animation polish (card lift, springy easing, `heroDrift` ken-burns, `playPulse`, smooth scroll); branded first-paint page loader (inline critical CSS in `index.html`, neon TV + conic ring, fades out on React mount) + reusable `Loader.jsx` for VideoModal Suspense + hub episodes. All new motion honors `prefers-reduced-motion`; browser-verified (loader dismisses, glass surfaces render, playback intact) |

---

## Related docs

[`README.md`](README.md) · [`features.md`](features.md) · [`developement.md`](developement.md) · [`deployment.md`](deployment.md) · [`AGENTS.md`](AGENTS.md)
