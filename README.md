# Eboncraft.dev

A developer-first World of Warcraft addon directory. Developers sign in with GitHub and link a repository; Eboncraft pulls the README, the latest release and the supported game versions straight from GitHub, and scans every download with VirusTotal. There is no upload step and no separate description to maintain.

**Stack:** Next.js 16 (App Router) on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) · Supabase (GitHub OAuth + one `addons` table) · Tailwind CSS 4 + shadcn/ui, dark first.

## How it works

| Piece | Where |
| --- | --- |
| Sign in with GitHub | `src/app/auth/*`, session refresh in `src/proxy.ts` |
| Link a repo, ownership check, sync, delete | `src/app/dashboard/actions.ts` |
| GitHub API calls, cached in Cloudflare's edge cache | `src/lib/github.ts` |
| README, release and `.toc` → addon row | `src/lib/sync.ts` |
| `.toc` parsing (`## Interface: 110002, 40400, 11505` → Retail, Cataclysm Classic, Classic Era) | `src/lib/toc.ts` |
| VirusTotal scan of the release `.zip` | `src/lib/virustotal.ts` |
| Schema and row-level security | `supabase/migrations/0001_addons.sql` |

- **Release download:** the first `.zip` asset on the latest GitHub release (skipping `-nolib` builds). Without one it falls back to GitHub's source archive and tells players they may need to rename the folder.
- **Game versions:** every `.toc` at the repo root (or one folder deep) is read, including multi-version `## Interface:` lines and `## Interface-Cata:` style keys. Interface `1xxxx` is Classic Era, `2` TBC, `3` Wrath, `4` Cataclysm, `5` Mists, `10+` Retail.
- **Staying fresh:** when someone opens an addon page that was last synced more than 6 hours ago, it re-syncs after the response is sent. Developers can also hit sync in the dashboard.
- **VirusTotal:** the zip is hashed and looked up; new files are uploaded (up to 32 MB) and show "Scanning" until the next sync picks up the report. "Clean" means no engine flagged it as malicious.
- **Who can list a repo:** its owner, or a *public* member of the organization that owns it.
- **Security model:** the public anon key can only read. All writes go through server actions that check ownership and then use the service role key, so nobody can fake a release or a "Clean" badge.

## Try it locally without Supabase (demo mode)

With no Supabase variables set, the site runs in demo mode: browsing shows sample addons, and the dashboard lets you add any public GitHub repo without signing in. Those repos are really fetched from GitHub (README, release, `.toc` files) and kept in memory until you restart the dev server.

```bash
npm install
npm run dev        # then open http://localhost:3000
```

Optional: put `GITHUB_TOKEN` (and `VIRUSTOTAL_API_KEY` to try scanning) in `.env.local`. Without a token GitHub allows 60 API requests an hour, and each added repo uses about four.

## Setup

1. **Supabase**: create a project, then run `supabase/migrations/0001_addons.sql` in the SQL editor (or `supabase db push`).
2. **GitHub OAuth app**: on GitHub go to Settings › Developer settings › OAuth Apps › New. Set the callback URL to `https://<your-project>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase › Authentication › Providers › GitHub.
3. In Supabase › Authentication › URL Configuration, set the Site URL to your domain and add `http://localhost:3000/auth/callback` and `https://eboncraft.dev/auth/callback` to the redirect allow list.
4. Copy `.env.example` to `.env.local` and fill it in.
5. `npm install` then `npm run dev`.

### Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Build-time, public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Build-time, public. `sb_publishable_...`; the legacy anon key also works, as `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Secret. All writes use it |
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `https://eboncraft.dev` |
| `GITHUB_TOKEN` | recommended | Fine-grained token, public repo read only. Raises the limit from 60 to 5,000 requests/hour |
| `VIRUSTOTAL_API_KEY` | optional | Turns on scanning. The free key allows 4 requests/minute, 500/day |

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put VIRUSTOTAL_API_KEY
# NEXT_PUBLIC_* values are inlined at build time, so have them in .env.local (or the CI env) when you run:
npm run deploy
```

**Deploy from Linux or macOS, not Windows.** OpenNext's Cloudflare build is not fully compatible with Windows: it builds and deploys, but the Worker can then fail at runtime with "Worker threw exception". On Windows, deploy from WSL with a fresh `npm install` inside WSL (the Windows `node_modules` has Windows-only binaries).

`npm run preview` runs the production Worker locally (put the secrets in `.dev.vars`). Session refresh runs in `src/proxy.ts`, which OpenNext supports on Cloudflare but still labels experimental.

## Scripts

- `npm run dev`: local dev server
- `npm run build`: Next.js production build
- `npm test`: unit tests for `.toc` parsing and repo-link parsing
- `npm run preview` / `npm run deploy`: OpenNext build, then local Worker or deploy
