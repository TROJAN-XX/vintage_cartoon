# 🚀 Deployment Guide — Vintage Cartoon

The app is a **static single-page build** (React + Vite) with **no runtime secrets**: videos stream directly from the Internet Archive and the watchlist lives in the browser's `localStorage`. That makes deployment trivial — any static host works, and **Vercel** is configured as the primary target.

There are two supported paths; both end at the same production URL.

| Path                          | Best for                            | Config needed                    |
| ----------------------------- | ----------------------------------- | -------------------------------- |
| **A. Vercel Git integration** | Zero-config continuous deploys      | Connect repo in Vercel dashboard |
| **B. GitHub Actions (`deploy.yaml`)** | Instant, controlled deploys from CI | 3 repo secrets              |

> **Note:** Running *both* is fine. The Git integration builds on Vercel's servers on every push; the Actions workflow builds deterministically in CI and uploads prebuilt artifacts. If you only want one source of truth, pick **A** (simplest) or **B** (fastest + lint gate). Prefer not to have both race on the same push — see "Avoiding double deploys".

---

## A. Vercel Git integration (zero config)

1. Push the repo to GitHub (`TROJAN-XX/vintage_cartoon`).
2. Go to https://vercel.com/new, import the GitHub repo.
3. Vercel auto-detects **Vite**: build command `npm run build`, output `dist`. Confirm (defaults are also pinned in `vercel.json`).
4. Click **Deploy**. Done — every future push to `main` deploys automatically; every PR gets its own preview URL.

No environment variables are required — the app needs none.

---

## B. GitHub Actions instant deploy (`.github/workflows/deploy.yaml`)

The workflow builds the app (install → lint → build → prebuilt Vercel artifacts) and uploads to **Vercel production** on **every push to `main`**, plus on demand via **Run workflow**.

### B.1 One-time setup — get the three values

1. **`VERCEL_TOKEN`**
   - Vercel dashboard → **Account Settings → Tokens → Add** (scope: full account, generous expiry).
   - Copy the token — it is shown once.
2. **`VERCEL_ORG_ID`** and **`VERCEL_PROJECT_ID`**
   - Easiest: from your machine, run `npx vercel link` once inside the repo (answer yes to "link to existing project" and pick it).
   - This writes `.vercel/project.json` locally — read the two IDs from it (this file is git-ignored and must stay ignored):
     ```jsonc
     // .vercel/project.json
     { "projectId": "prj_…", "orgId": "team_…" }
     ```
3. In GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret**, add:
   - `VERCEL_TOKEN` (required)
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
4. Trigger it: push to `main` (automatic) or **Actions → Deploy to Vercel → Run workflow**.
5. The live URL is printed in the "Deploy to Vercel" step output; the canonical production URL is `https://<project>.vercel.app`.

### B.2 What the workflow does (pipeline)

```
push to main / manual run
  └─ job: deploy (ubuntu-latest, Node 22)
      ├─ npm ci                    deterministic install
      ├─ npm run lint              fail fast on lint errors
      ├─ npm run build             vite production build
      ├─ vercel pull               fetch production env/settings (uses ORG/PROJECT ids)
      ├─ vercel build --prod       prebuilt artifact assembly
      └─ vercel deploy --prebuilt  instant upload → production
```

- **Concurrency guard:** only one production deploy runs at a time; a newer push **cancels** the older in-flight deploy (last commit wins).
- `permissions: contents: read` — least privilege; no repo write, no cloud role assumptions.
- The `vercel pull` step is skipped-free but requires all three secrets; if `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` are missing the pull/deploy steps fail with a clear linking error — add them per B.1.

### B.3 Local deploy via Vercel CLI (optional)

```bash
npx vercel          # preview deployment (per-branch URL)
npx vercel --prod   # promote to production immediately
```

---

## Vercel configuration files

### `vercel.json` (repo root)

Pins the build so no deploy ever depends on dashboard settings drift:

- `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`
- `cleanUrls: true` — `/foo` instead of `/foo.html` (no .html routes today, harmless)
- **Rewrites** `/(.*) → /index.html`: SPA fallback so any future client route/deep link resolves. Vercel checks the filesystem first, so `/assets/...`, `/favicon.svg` etc. are unaffected.
- **Headers:**
  - `/assets/(.*)`: 1-year immutable cache (hashed filenames) + `nosniff`
  - Global: `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`

### `.github/workflows/deploy.yaml`

See §B.2. Trigger set: `push → main` + `workflow_dispatch`.

### `.gitignore` (deploy-related)

- `.vercel/` — local link state (contains project ids; never commit)
- `.env`, `.env.*` (except `.env.example`) — reserved for any future secrets
- `dist/`, `node_modules/` — build artifacts

---

## Avoiding double deploys

If both the Git integration and the Actions workflow are active, a single push to `main` can trigger two production builds (one remote, one prebuilt). Options:

1. **Recommended:** keep both but let them coexist — Vercel deduplicates identical deployment sources in practice, and the Actions `concurrency` guard collapses rapid pushes.
2. **Pick one:** disable one trigger — either ignore the repo in Vercel Git settings, or set `on.push` to `workflow_dispatch`-only in `deploy.yaml`.
3. If you enable Actions-only deploys, remember PR preview URLs come from the Git integration — decide which trade-off you want.

---

## Rollbacks & hotfixes

- **Vercel dashboard → Deployments → ⋯ → Promote to Production** — instantly re-promote any previous prebuilt deployment (seconds, no rebuild).
- **Git revert + push to `main`** — standard route; the workflow redeploys automatically.
- **Hotfix branch** → `fix/<topic>` → PR → merge; or for urgent fixes commit directly to `main` (the workflow deploys on push).

---

## Custom domains (optional)

1. Vercel project → **Settings → Domains → Add** (e.g. `vintagecartoon.in`).
2. Add the DNS records Vercel suggests (A/CNAME) at your registrar.
3. HTTPS is automatic (Vercel-managed certificates). The production domain becomes the canonical URL; `vercel.app` remains as an alias.

---

## Post-deploy checklist

- [ ] Site loads at the production URL; title/meta render (check `view-source:` for SEO tags).
- [ ] Hero image + thumbnails load (archive.org reachable from the browser).
- [ ] Play any episode → **streams from archive.org**, audio/video in sync; ±10s seek works.
- [ ] Escape closes the modal; fullscreen on/off works; background scroll is locked.
- [ ] Search (English + Tamil) and channel/season filters render the grid.
- [ ] Add a favorite → reload page → watchlist persisted (`vintage_watchlist`).
- [ ] Keyboard: `←`/`→`/`↑`/`↓`/Enter move and activate cards.
- [ ] Lighthouse: performance ≥ 90, no console errors.

---

## Troubleshooting

| Symptom                                        | Fix                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Actions step "vercel pull" fails: "no token"   | `VERCEL_TOKEN` secret missing/expired — recreate per B.1                                 |
| "Project not found" during pull/deploy         | `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` wrong or project never linked — rerun `vercel link`   |
| Deploy succeeds but site 404s on a path        | `rewrites` removed from `vercel.json` — restore the SPA fallback                         |
| New deploys keep 404ing assets                 | `outputDirectory` not `dist` (dashboard override) — delete the override or pin via `vercel.json` |
| Thumbnails/videos fail in production only      | Browser/region blocking archive.org, or CSP from an added header — check DevTools network |
| Build fails in CI but passes locally           | Node version mismatch (CI pins 22) or lockfile drift — run `npm ci` locally to reproduce  |
| Two production deploys per push                | See "Avoiding double deploys"                                                           |

---

## Related docs

[`README.md`](README.md) · [`features.md`](features.md) · [`developement.md`](developement.md) · [`pendingworks.md`](pendingworks.md) · [`AGENTS.md`](AGENTS.md)
