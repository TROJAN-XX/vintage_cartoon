# 🤖 AGENTS.md — Multi-Agent Collaboration Protocol

**Agents must read this file before making any change to the repo.**
It defines what this project is, the guardrails you must respect, the data contracts, file ownership, and the handoff protocol that lets multiple agents work in parallel without conflicts.

---

## 1. Project in 30 seconds

- **Vintage Cartoon** — a Netflix-style, free streaming site for nostalgic **Tamil-dubbed cartoons** (90s/2000s) with a dedicated **Jackie Chan Adventures** hub (5 seasons, talisman filter).
- **Stack:** React 19 + Vite 8, lucide-react, plain CSS (`src/index.css`), Oxlint. No router, no backend, no state library.
- **Media model:** videos are hot-linked **directly from the Internet Archive** (`https://archive.org/download/<item>/<file>.mp4`) inside `<video>`/`<audio>` elements. Some episodes stream a muted video plus a separate Tamil `.m4a` dub, kept in sync with 0.15s drift correction.
- **State:** everything lives in `App.jsx` (context, filters, watchlist). localStorage keys (never rename): **`vintage_watchlist`** (watchlist id strings), **`vintage_progress`** (resume positions), **`vintage_player_prefs`** (volume/mute).
- **Deploy:** every push to `main` → GitHub Actions (`.github/workflows/deploy.yaml`) → **Vercel production**. No runtime secrets or env vars exist or are needed.

Deep dives: [`README.md`](README.md) (overview) · [`features.md`](features.md) (behavior + schemas) · [`developement.md`](developement.md) (dev how-tos) · [`deployment.md`](deployment.md) (deploy) · [`pendingworks.md`](pendingworks.md) (open tasks) · [`design_flaws.md`](design_flaws.md) (known flaws — check before "fixing" things that are intentionally listed there).

---

## 2. Golden guardrails (never break these)

1. **No media in the repo.** Never commit, download, proxy or bundle any video/audio/image-from-archive file. Reference archive.org URLs in JSON only. (`.gitignore` enforces the usual offenders; watch for `*.mp4`, `*.m4a`, media dirs.)
2. **No backend, no proxy.** Do not add a server, serverless function, or CORS proxy for archive.org. Direct streaming works; keep it that way. If a stream fails, handle it in the UI (see `pendingworks.md P2-6`).
3. **Respect archive.org.** Stream on demand only. Never write scripts that bulk-download or hammer the archive (tests included).
4. **Do not break the streaming player.** `VideoModal.jsx` is the most intricate file (dual-audio sync engine). Changes there require an actual playback test, not just a build.
5. **Do not add heavyweight dependencies** (routers, state managers, UI kits, players) without an issue/discussion entry. Current dependency surface is intentionally tiny. New vendor deps must be mapped into existing chunks in `vite.config.js`.
6. **Do not rename JSON fields or localStorage keys.** Components match on literal names (`tamilTitle`, `audioUrl`, `captionsUrl`, `isShowHubEntry`, `isFeatured`, `category`, `season`, `talisman`, `episode`) and the storage keys `vintage_watchlist`, `vintage_progress`, `vintage_player_prefs`. Renames ripple everywhere.
7. **Keep the single-page contract.** `vercel.json` rewrites all paths to `/index.html`; a router may be added later (`pendingworks.md P2-1`) but must preserve direct streaming and deep links.
8. **Minimal diffs.** Do not reformat files, reorder imports wholesale, or change quote styles globally. Parallel agents will conflict.
9. **Content is family-friendly nostalgia.** Only add public-domain / archive-hosted items; keep metadata honest; Tamil text must be accurate.
10. **Every change ships with verification:** `npm run lint` + `npm run build` green, plus a UI smoke test of affected flows (rows render, search works, a video streams).

---

## 3. Repo map & file ownership

| Path                        | Owner domain                | Notes                                                        |
| --------------------------- | --------------------------- | ------------------------------------------------------------ |
| `src/App.jsx`               | App logic / filtering       | State owner; most conflict-prone — coordinate before editing  |
| `src/data/cartoons.json`    | Content (general catalog)   | Follow schema in `features.md §9.1`; exactly one hub-entry card |
| `src/data/jackie_chan.json` | Content (JCA hub)           | `s<season>e<episode>` ids; S1 incomplete (tracked task P1-3)  |
| `src/components/VideoModal.jsx` | Player / streaming     | Test playback after every change                              |
| `src/components/MovieRow.jsx` | Rows / grid             | Registers a focus zone per row (`zoneId`)                     |
| `src/components/Navbar.jsx` | Navigation                  | Registers `navbar` zone; context-aware pills                  |
| `src/components/Hero.jsx`   | Featured banner             | Reads `isShowHubEntry` / `isFeatured`                         |
| `src/components/SearchFilter.jsx` | Filters              | Context-specific dropdowns                                    |
| `src/components/CustomCursor.jsx` | Visual               | Touch/mobile disabled                                         |
| `src/hooks/useKeyboardNav.js` | Focus engine            | Global key handling                                           |
| `src/index.css`             | Design system               | Reuse existing utilities before adding new ones               |
| `vite.config.js`            | Build                       | Manual chunks — extend, don't restructure                     |
| `vercel.json`               | Deploy config               | Headers/rewrites pinned here                                  |
| `.github/workflows/deploy.yaml` | CI/CD                  | Vercel production deploy                                      |
| `index.html`                | SEO / preloads              | Keep archive.org preconnect                                   |
| `pendingworks.md`           | Task board                  | **Claim + update here in the same PR**                        |

**Rule:** before editing `App.jsx` or shared data files, check `pendingworks.md` for in-progress claims (🟨) by other agents.

---

## 4. Data contracts

Schemas live in [`features.md §9`](features.md) and are normative. Quick notes for agents:

- **General catalog:** `category` must be one of `'90s Classics' | 'Early 2000s Hits' | 'Action & Adventure'` (rows are built by these literal strings).
- **Hub episodes:** `season`/`episode` are integers; `talisman` strings must match existing vocabulary (e.g. `Rooster (Levitation)`; `None (Demon Wards)` / `None (Demon Portals)` are auto-excluded from the dropdown).
- **Tamil dub audio:** adding only `audioUrl` switches the player to dual-element mode automatically — no code change needed.
- **New channel value** in the general catalog: no code change needed; dropdowns derive it.
- **URL encoding:** archive.org filenames with spaces/brackets must be URL-encoded (`%20`, `%28`, `%29`, …). Verify with `curl -I` before committing a URL.

---

## 5. Workflow: from task to merged PR

1. **Pick & claim.** Choose an open item in `pendingworks.md`, set 🟨 with your agent id + branch name.
2. **Branch** from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`.
3. **Implement** in small focused commits (lowercase summary, e.g. `fill season 1 episodes 14-26`).
4. **Verify** (Definition of Done):
   - `npm run lint` clean,
   - `npm run build` succeeds,
   - affected features smoke-tested in `npm run preview` (or dev server),
   - changed media verified to stream from archive.org.
5. **Update the board** — flip your `pendingworks.md` row to ✅ with the PR link, in the same PR.
6. **Open the PR** to `main` with: what changed, why, verification steps, and any follow-ups (new rows in `pendingworks.md`).

---

## 6. Suggested parallel task tracks

Tasks grouped to minimize file conflicts — different agents can take different tracks simultaneously:

| Track | Scope | Touches |
|-------|-------|---------|
| **T1 Content:** placeholder video mapping (P1-1), thumbnails (P1-2), metadata audit (P1-5) | `src/data/*.json` only | No code conflicts |
| **T2 Content:** S1 completion (P1-3), dub audio (P1-4) | `src/data/jackie_chan.json` | Avoid T1 on the same file |
| **T3 Player:** failed-stream UI (P2-6), resume/continue-watching (P2-2) | `VideoModal.jsx` | Run playback tests |
| **T4 Routing:** deep links (P2-1), modal state wiring (P2-4) | `App.jsx` + hooks | Avoid T5 on `App.jsx` |
| **T5 Perf/quality:** debounce (P2-3), cleanup (P3-7), empty-guards (P2-5) | `App.jsx`, `MovieRow.jsx` | Avoid T4 on `App.jsx` |
| **T6 Infra:** PR CI gate (P3-1), PWA (P3-2), sitemap (P3-3), headers (P3-4) | `deploy.yaml`, `public/`, `vercel.json` | Independent |
| **T7 Docs/a11y:** features/README polish (P3-9), docs updates | `*.md`, `index.css` | Independent |

**Never take two tracks that touch the same file at the same time** (noted per track).

---

## 7. Handoff protocol

When your session ends or a task is partially done:

1. Update `pendingworks.md`: leave 🟨 with a short note (what's done, what remains, branch name) — or revert to ⬜ if nothing landed.
2. If you discovered new work, **add a row** (right priority, `⬜ todo`) instead of leaving it implicit.
3. Any decision that affects future agents (naming, schema, guardrail) must be reflected in these docs, not just in code.

---

## 8. Common pitfalls

| Pitfall | Consequence |
|---------|-------------|
| Committing `.vercel/` or `.env` | Leaks project ids / secrets — keep git-ignored |
| Unencoded archive.org URLs (`(`, `)`, spaces) | Episodes 404 in production |
| Editing `VideoModal.jsx` without a playback test | Sync/buffering regressions invisible to builds |
| Duplicate work on claimed tasks | Wasted effort + merge conflicts |
| Adding a router without SPA rewrites check | Deep links 404 on refresh |
| Renaming `vintage_watchlist` / JSON fields | Silent data loss for users |
| Bulk-downloading during content research | Abuse of archive.org — avoid; use the metadata API |

---

## 9. Definition of Done (checklist)

- [ ] Claimed on the board; status updated in the same PR.
- [ ] `npm run lint` and `npm run build` green.
- [ ] UI smoke-tested (rows, search, playback, modal Escape, watchlist persistence).
- [ ] Changed/added media verified streaming from archive.org.
- [ ] JSON follows the normative schemas (`features.md §9`); no new heavy deps.
- [ ] Docs updated if behavior/contracts changed.

---

*Keep this file current — it is the contract between every agent that touches this repo.*
