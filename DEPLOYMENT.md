# Deployment Guide

This app is a **TanStack Start SSR** application. It builds to two folders:

- `dist/client/` — static assets (JS, CSS, images)
- `dist/server/index.js` — SSR worker entry (Web Fetch API style)

The same build works on every platform that can run a JS server runtime
(Node.js, Cloudflare Workers, Netlify Functions, Vercel Functions, etc.).

---

## Required Environment Variables

Set these on every hosting platform **before** deploying:

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Public, baked into the client bundle at build time |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | Public anon key, baked into the client bundle |
| `VITE_SUPABASE_PROJECT_ID` | yes | Public project ref |
| `SUPABASE_URL` | recommended | Server-side equivalent |
| `SUPABASE_PUBLISHABLE_KEY` | recommended | Server-side equivalent |
| `SUPABASE_SERVICE_ROLE_KEY` | only if used | **Never** expose to the client |

> Because these are read at **build time** (Vite replaces `import.meta.env.*`),
> you must trigger a rebuild after changing them.

---

## Netlify

`netlify.toml` and `netlify/functions/ssr.mjs` are already in the repo.

1. Connect the repo in Netlify.
2. Add the env vars above (Site → Settings → Environment).
3. Deploy. Netlify will run `npm install --legacy-peer-deps && npm run build`
   and serve `dist/client/` with the SSR function as fallback.

---

## Vercel

`vercel.json` and `api/ssr.mjs` are already in the repo.

1. Import the project in Vercel.
2. Framework preset: **Other** (do not pick a framework — `vercel.json` controls it).
3. Add the env vars above.
4. Deploy. Vercel will use Node.js 20 to run the SSR function.

---

## Cloudflare Pages / Workers

`wrangler.jsonc` is already configured. The SSR worker entry is
`@tanstack/react-start/server-entry` and the build emits a Worker bundle at
`dist/server/index.js`.

For Cloudflare Pages, set:
- Build command: `npm install --legacy-peer-deps && npm run build`
- Output directory: `dist/client`
- Node compatibility flag: `nodejs_compat` (already in `wrangler.jsonc`)

---

## Hostinger (and other shared hosts)

Hostinger shared hosting only serves static files — there is no SSR runtime.
This app **requires a server runtime**, so use either:

- **Hostinger VPS / Node.js hosting**: run `npm install --legacy-peer-deps && npm run build`,
  then start the SSR worker with a Node adapter (e.g. wrap `dist/server/index.js`
  the same way `api/ssr.mjs` does and serve via Express/Fastify).
- **Or deploy to Netlify / Vercel / Cloudflare** (recommended — free tier covers most apps)
  and point your Hostinger-managed domain at it via DNS.

---

## Custom Domain & OAuth

After deploying, add your production domain to:

1. **Lovable Cloud → Authentication → URL Configuration**: add the domain to
   the allowed redirect list.
2. **Google Cloud Console** (if using your own Google OAuth credentials):
   add `https://YOUR-DOMAIN/` to Authorized redirect URIs.

The app's sign-in code uses `window.location.origin`, so it works on any
domain automatically as long as that origin is allowlisted in the auth provider.

---

## Local Production Test

```bash
npm install --legacy-peer-deps
npm run build
npm run preview
```
