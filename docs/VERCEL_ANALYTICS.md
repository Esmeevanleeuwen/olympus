# Vercel Analytics in Olympus

Open **Audiences → Vercel Analytics** for visitors, page views, daily traffic, popular pages and traffic sources. Choose a project from your connected Vercel team. The list uses the actual Vercel project names; Meridian may appear as `perspectief` if that is still its project name. The supplied optional default identifies Phosphoros. All reports use production traffic and the same UTC date range. Refresh retrieves the current project list and a new report; there is no background polling.

No snapshot or export is needed for Vercel. Supabase snapshots remain a separate feature under **Audiences → Supabase**.

## Set up on your computer

1. Confirm that Web Analytics is collecting visits on each platform you want to view. Follow [Vercel's quickstart](https://vercel.com/docs/analytics/quickstart) for a platform that has no collection set up yet.
2. Create a [Vercel access token](https://vercel.com/account/tokens) with access to the team containing your platforms. The same token can read the projects it has permission to access within that team.
3. Open the Olympus folder in VS Code. Create `.env.local` **beside `package.json`**. If the file exists, add or update the following variables without deleting other settings. `.env.example` is the template.

```env
OLYMPUS_VERCEL_TOKEN=PASTE_YOUR_TOKEN_HERE
OLYMPUS_VERCEL_TEAM_ID=team_g8FQNV2esuTUoOgLnAHQfbwX
# Optional: start on Phosphoros until you choose another project.
OLYMPUS_VERCEL_PROJECT_ID=prj_91APFM04pYdIsQMUcgqiydHJs3H7
OLYMPUS_OWNER_PASSWORD=
```

Replace the token placeholder with the token from Vercel. Set `OLYMPUS_OWNER_PASSWORD` to a unique password or passphrase of 20–256 characters. The owner password is what you enter in Olympus. Keep it separate from your Vercel token and Vercel account password. Do not commit `.env.local` or share its contents.

`.env.example` is a committed template, not a settings file. Leave its token and password blank. If you previously committed a real password there, choose a new one in `.env.local`; deleting the value from the latest file does not remove it from Git history.

4. Restart the local server from the Olympus terminal: stop it with **Ctrl+C**, then run `npm run dev`.
5. Open **Audiences → Vercel Analytics**, enter the Olympus owner password and click **Unlock analytics**.
6. Select a platform using **Vercel project**. Olympus remembers the last selection on this browser, separately for each team. If that project is removed or becomes inaccessible, the selector falls back to the configured default or the first available project.
7. Check the 7-day report against that project's Analytics in Vercel using **Production** and the same dates. All periods include today, which is still in progress. The 30-day option depends on the reporting history available on your Vercel plan.

For a hosted Olympus installation, add the same settings to **Olympus’s** hosting environment and deploy the updated code. The project ID is optional; token, team ID and owner password are required. A local `.env.local` file does not configure a hosted application. Use HTTPS for the hosted owner session.

Existing installations can keep their current private settings. Pull the update, restart Olympus, unlock analytics and select another project. You do not need a new token or a new set of IDs for each platform in the same accessible team.

## How it works

The browser first calls the protected `/api/vercel-analytics/projects` route. The server reads `/v10/projects` with the configured team, follows pagination and exposes only project IDs/names, the team ID and a default selection. Raw project metadata, environment variables and credentials never reach the browser. The list is bounded to ten pages of 100 projects and fails visibly if it cannot finish.

The report route accepts a selected `projectId` and a 7- or 30-day period. Before any analytics requests, the server checks that the ID belongs to a project currently accessible in the configured team. The browser cannot override the team. It then requests four grouped Web Analytics reports for that one project: production totals, daily traffic, pages and referrers.

Totals use one production-environment aggregation for the entire selected period. Daily and per-page visitors are not summed, because that could count the same visitor more than once. Zero counts, missing metrics, no reported rows and request errors have separate states. Daily gaps remain unknown. The breakdowns preserve Vercel’s `Others` grouping.

The owner password opens a signed, four-hour `HttpOnly`, `SameSite=Strict` cookie. It is also `Secure` in production. Every data request checks the session; an unset/short owner password leaves the API closed. Changing the owner password invalidates existing sessions. **Lock analytics** clears the browser’s session cookie. Invalid sign-in attempts have a per-server-instance throttle, not a shared distributed limiter.

The Vercel analytics section has owner access; the rest of the existing layout/reference workspace remains a prototype. Imported Supabase snapshots continue to work separately. Only the selected project ID is saved as a browser preference. Analytics reports and credentials are not saved to localStorage or included in layout exports. Switching projects clears the previous report and ignores canceled requests. The connector makes read requests only.

## Troubleshooting

| Message | Next step |
|---|---|
| Owner setup needed | Add a unique `OLYMPUS_OWNER_PASSWORD` of at least 20 characters and restart Olympus. |
| Connection setup needed | Check `OLYMPUS_VERCEL_TOKEN` and `OLYMPUS_VERCEL_TEAM_ID` in `.env.local`, then restart. |
| No projects available | Check that the token can access projects in the configured team. Refresh also picks up newly added projects. |
| Project no longer available | Refresh to load the current list, or select another project. |
| Vercel denied access | Check the token’s scope, team, project and Analytics settings. |
| No traffic reported | Confirm Analytics is enabled and the selected production period has traffic. |
| Report unavailable for the period | Try 7 days and check the plan’s reporting window. |
| Unexpected response format | Keep the error visible; inspect the API response server-side before changing the parser. |

## Validation and limits

`npm test` covers the existing snapshot model plus authentication, project restrictions, period handling, upstream failures and rendering of missing values. Production compilation is checked with `npm run build`. Analytics tests use synthetic responses. Real visitor figures cannot be verified until the runtime has valid Vercel credentials; no live-success claim follows from fixture tests.

API references: [Vercel Web Analytics](https://vercel.com/docs/analytics/web-analytics-api) and [project discovery](https://vercel.com/docs/rest-api/projects/retrieve-a-list-of-projects). Queries use `/v1/query/web-analytics/visits/aggregate`; the token is transmitted only to `https://api.vercel.com` by the server.
