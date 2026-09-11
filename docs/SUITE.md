# Olympus / Modular suite 0.3

## Scope
The suite is an optional part of the existing workspace, not another admin backend. This iteration replaces placeholder-only shortcuts with a tool library and one reusable side panel. Overview, resource filters, imported snapshots and the newer Vercel Analytics implementation remain in place.

## Use
Open **All tools** in the sidebar, or choose **Layout > Suite sidebar > Manage tools**. All tools stays accessible when the suite is collapsed or every shortcut is hidden.

**Enabled** controls whether a tool can open. **In sidebar** controls its shortcut. A hidden, enabled tool can still open from the library. A disabled shortcut remains visible but cannot open. Hiding or disabling the currently open tool closes its panel without deleting its draft. Opening another tool replaces and unmounts the previous tool.

The scratchpad is a workspace-wide local note, limited to 4,000 characters. Its text survives closing, hiding, disabling and changing platforms. It is stored only in the browser when storage is available; otherwise the UI says session-only. This is not secure storage for private records or secrets.

The Blank test tool provides an intentionally empty panel. Data inspector, API sandbox and Command shelf retain the names already present in the code but are explicitly marked **Placeholder**. They do not query records, send requests or run commands. New placeholders start disabled and hidden.

## Layout and accessibility
The existing primary navigation remains unchanged. Suite shortcuts can be reordered using up/down controls in the library. The suite can collapse without hiding its All tools button.

On desktop the optional panel occupies 380px beside the main workspace. At 1,100px and below it becomes a modal sheet; at phone width it fills the screen. It supports Escape, a close button, a labelled heading and mobile Tab/Shift+Tab containment. Closing returns focus to the opener, or All tools if that opener was hidden or disabled. Desktop remains modeless so the main workspace stays usable. Resizing switches the same dialog between modes without discarding the note.

## Files and extension point
- `lib/features.ts`: typed, allowlisted metadata registry; no executable code or credentials in preferences.
- `lib/suite-preferences.ts`: versioned parsing, defaults, migration, ordering and storage boundaries.
- `components/suite-sidebar.tsx`: shortcuts and permanent library entry.
- `components/tool-library.tsx`: search, enable/visibility controls and ordering.
- `components/feature-panel.tsx`: one panel, focus/lifecycle handling and lazy tool rendering.
- `components/features/`: individual tools; scratchpad is controlled by dashboard-owned state.
- `components/suite.css`: styles isolated from the existing dashboard and analytics CSS.

To add a tool, register an ID and metadata, default experimental additions to disabled/hidden, then implement its component and statically register its renderer in the panel. A new name alone is not a working integration. Larger tools can acquire new placements later; this iteration supports only the side panel. Keep durable draft state outside unmounted tool components. Future timers, subscriptions and requests must have lifecycle cleanup.

## Storage and compatibility
New keys are independent:

| Key | Contents |
| --- | --- |
| `olympus-suite-v1` | Version, collapsed state, enabled/shortcut flags and order |
| `olympus-suite-drafts-v1` | Version and scratchpad text |
| `olympus-layout-v02` | Existing blocks, audience drafts and legacy suite fields |

When no new preference record exists, legacy suite flags are read once. Its previous hidden state becomes a collapsed suite, with All tools still accessible. The migration does not copy or erase block text, audience drafts, imported data or the legacy record. The old layout type/parser remains compatible; new controls no longer depend on its suite fields.

Unknown feature IDs are ignored and newly registered IDs receive safe defaults. Invalid stored suite records are not silently overwritten: the feature uses session-only state until its explicit reset is confirmed. Quota or blocked-storage failures retain the current in-memory text and show an unsaved state. No cross-device or cross-tab synchronisation is implemented; concurrent tabs can overwrite their own last saved preference/note record.

**Reset preferences** changes suite switches, collapse and order only. **Reset this tool** clears only the scratchpad after confirmation. **Reset layout** resets existing workspace blocks/audience drafts, not the new suite preferences or note. Layout export retains the legacy format and does not export the new suite records.

## Boundaries
There are no new tokens, network connections, background polling, database writes, deployments or executable commands in the suite. The existing analytics endpoints are unchanged. Browser switches are not server authorization. The owner label remains a visual identity, not a new authentication system. A later connected feature must enforce authorization on its server and must not rely on these local flags.

## Verification
From the repository, use:

```powershell
npm ci
npm run test:suite
npm test
npm run typecheck
npm run build
npm run dev
```

The new suite test command strictly compiles the registry/preferences model and runs its 20 unit tests. Coverage includes migration, independent resets, validation, hidden-versus-disabled behavior, order, corruption and blocked storage. The included workflow definition runs the existing model/analytics tests, the new suite tests, application typecheck and production build without credentials when installed in GitHub. It has not been installed or run: the connector write request was blocked.

Local development checks: 20 suite tests passed and 14 browser smoke scenarios passed (including keyboard, mobile resize, close/reopen, resets and unsaved recovery). The standalone preview harness transpiles the application source but uses the earlier bundled React 16 runtime and a compatibility loader for dynamic imports, not the production React 19/Next runtime. Storage remount checks use an in-memory storage substitute because local browser navigation is restricted. Full application type/build and native-origin reload verification must be checked separately in the actual Next app/CI; local package installation was blocked by unavailable registry DNS.
