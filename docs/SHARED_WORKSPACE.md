# Shared workspace: Olympus and Meridian

Olympus owns `packages/workspace-ui`. Both apps render its `SharedSidebar`, use the same feature evaluator and preference provider, and supply their own navigation, colors and brand. The package contains no application records or server secrets.

## Use

Open **Platformfuncties** in Olympus. Sign in with the existing Meridian owner account. The three initial switches control sidebar width settings, menu search and personal shortcuts independently for Olympus and Meridian. Opening/closing the sidebar remains available so navigation cannot lock someone out.

The feature state is stored in `suite_feature_access` in the existing Meridian Supabase project. Existing open workspaces refresh every 20 seconds and on window focus. A server-side request to save preferences is rejected immediately when the corresponding feature is disabled. A failed configuration read turns optional controls off; normal navigation remains usable.

Only `user_roles.role = owner` may change platform access. This is enforced by RLS and column grants. Feature switches do not grant editorial roles. Personal preferences are keyed by user, platform and feature. The database validates preference shapes, rejects cross-user writes and checks whether the feature is currently enabled. Collapse state is a separate device preference, scoped to the platform and user.

Concurrent switch writes include the last revision. A database trigger advances the revision and stamps the actor/time. A stale update refreshes the view instead of overwriting someone else's choice.

## Shared code updates

Meridian uses the same package through an automatically managed local dependency (`vendor/olympus-workspace-ui`). Do not edit that directory in Meridian. `SOURCE.json` records the exact Olympus commit and SHA-256 of every imported file. This avoids requiring a private package-registry token in either deployment.

The Meridian workflow `sync-olympus-workspace.yml` checks Olympus `main` on a 15-minute schedule or on manual dispatch. GitHub may delay scheduled runs. It imports only the five package files, checks provenance and feature behavior, and builds Meridian before committing to `main`. A successful commit uses the existing Vercel Git integration to rebuild Meridian. Major package versions require an explicit compatibility review. A concurrent change to Meridian `main` causes a normal push failure; the workflow never force-pushes.

Code changes must reach Olympus `main` before automatic propagation. Feature switches themselves do not require deployment. The first installation in Meridian is pinned to the matching Olympus commit.

## Add a feature

1. Implement the shared capability in the package, with project-specific options where needed.
2. Register its stable ID in `model.ts` with its title and supported platforms. Increase the package version.
3. Add the database registration through a new migration. Create access rows only for platforms that implement the feature, initially disabled. Existing unknown feature IDs remain disabled in older app versions.
4. Add server/database checks wherever the capability reads or changes protected data. Hiding a menu button alone is not access control.
5. Test, publish Olympus and let Meridian receive the code. The owner can then turn the capability on in Platformfuncties.

A switch cannot implement new application functionality by itself. The initial integration deliberately shares the sidebar and its preferences; it does not expose Olympus database tools or its analytics credentials to Meridian.

## Project configuration

Olympus uses the existing project's public URL and publishable API key. These are public configuration, with access enforced by RLS. `NEXT_PUBLIC_SUITE_SUPABASE_URL` and `NEXT_PUBLIC_SUITE_SUPABASE_KEY` can override them for another environment. Meridian continues to use its existing Supabase configuration and session. Olympus maintains its own namespaced browser session, using the same user account. The existing Vercel Analytics owner-password session is separate.

The shared controls also work from the GitHub Pages version of Olympus because Supabase handles authentication, storage and authorization directly.

## Verification

`npm test` covers existing Olympus behavior and shared flag evaluation, unsafe preferences, and disabled-feature fallback. `supabase/tests/workspace_access.sql` checks anonymous and member denial, owner access, stale revisions, direct disabled-feature writes, user/platform separation, and invalid values. All database test writes run inside a rolled-back transaction.
