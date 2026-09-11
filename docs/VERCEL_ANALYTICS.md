# Vercel Analytics in Olympus

Open **Audiences → Vercel Analytics** for visitors, page views, daily traffic, popular pages and traffic sources. The first version reads one configured Vercel project; the supplied settings identify Phosphoros. All reports use production traffic and the same UTC date range. Refresh retrieves a new report; there is no background polling.

## Set up on your computer

1. Confirm that [Phosphoros Analytics](https://vercel.com/esmeevanleeuwens-projects/phosphoros/analytics?environment=production) is collecting traffic.
2. Create a [Vercel access token](https://vercel.com/account/tokens) with access to the team containing Phosphoros.
3. Open the Olympus folder in VS Code. Create `.env.local` **beside `package.json`**. If the file exists, add or update the following variables without deleting other settings. `.env.example` is the template.

```env
OLYMPUS_VERCEL_TOKEN=PASTE_YOUR_TOKEN_HERE
OLYMPUS_VERCEL_TEAM_ID=team_g8FQNV2esuTUoOgLnAHQfbwX
OLYMPUS_VERCEL_PROJECT_ID=prj_91APFM04pYdIsQMUcgqiydHJs3H7
OLYMPUS_OWNER_PASSWORD=
```

Replace the token placeholder with the token from Vercel. Set `OLYMPUS_OWNER_PASSWORD` to a unique password or passphrase of 20–256 characters. The owner password is what you enter in Olympus. Keep it separate from your Vercel token and Vercel account password. Do not commit `.env.local` or share its contents.

4. Restart the local server from the Olympus terminal: stop it with **Ctrl+C**, then run `npm run dev`.
5. Open **Audiences → Vercel Analytics**, enter the Olympus owner password and click **Unlock analytics**.
6. Check the 7-day report against Vercel using **Production** and the same dates. All periods include today, which is still in progress. The 30-day option depends on the reporting history available on your Vercel plan.

For a hosted Olympus installation, add the same four variables to **Olympus’s** hosting environment settings and deploy the updated code. A local `.env.local` file does not configure a hosted application. Use HTTPS for the hosted owner session.

## How it works

The browser calls Olympus’s `/api/vercel-analytics` route. Only the server reads the Vercel token. It requests the configured project and four grouped Web Analytics reports: production totals, daily traffic, pages and referrers. The browser cannot override the configured project or team.

Totals use one production-environment aggregation for the entire selected period. Daily and per-page visitors are not summed, because that could count the same visitor more than once. Zero counts, missing metrics, no reported rows and request errors have separate states. Daily gaps remain unknown. The breakdowns preserve Vercel’s `Others` grouping.

The owner password opens a signed, four-hour `HttpOnly`, `SameSite=Strict` cookie. It is also `Secure` in production. Every data request checks the session; an unset/short owner password leaves the API closed. Changing the owner password invalidates existing sessions. **Lock analytics** clears the browser’s session cookie. Invalid sign-in attempts have a per-server-instance throttle, not a shared distributed limiter.

The Vercel analytics section has owner access; the rest of the existing layout/reference workspace remains a prototype. Imported Supabase snapshots continue to work separately. Analytics reports and credentials are not saved to localStorage or included in layout exports. The connector makes read requests only.

## Troubleshooting

| Message | Next step |
|---|---|
| Owner setup needed | Add a unique `OLYMPUS_OWNER_PASSWORD` of at least 20 characters and restart Olympus. |
| Connection setup needed | Check the three `OLYMPUS_VERCEL_*` settings and restart. |
| Vercel denied access | Check the token’s scope, team, project and Analytics settings. |
| No traffic reported | Confirm Analytics is enabled and the selected production period has traffic. |
| Report unavailable for the period | Try 7 days and check the plan’s reporting window. |
| Unexpected response format | Keep the error visible; inspect the API response server-side before changing the parser. |

## Validation and limits

`npm test` covers the existing snapshot model plus authentication, project restrictions, period handling, upstream failures and rendering of missing values. Production compilation is checked with `npm run build`. Analytics tests use synthetic responses. Real visitor figures cannot be verified until the runtime has valid Vercel credentials; no live-success claim follows from fixture tests.

API reference: [Vercel Web Analytics](https://vercel.com/docs/analytics/web-analytics-api). Queries use `/v1/query/web-analytics/visits/aggregate`; the token is transmitted only to `https://api.vercel.com` by the server.
