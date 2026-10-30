# QoL phase 2 integration

This phase adds query-string routes (`/workspace?page=chat&project=…&chat=…`, plus `artifact` and `prompt` identities), popstate restoration, a shared access-checking destination gate, and explicit unavailable/loading states. `/chat` remains supported. Missing or revoked destinations offer a return to Overview without silently opening a new chat.

Unified search is available on every workspace page; Cmd/Ctrl+K focuses it and Escape clears it. Local search covers local data. Shared search uses access-scoped full-text indexes for chat titles, prompt text, and artifact titles/bodies, plus project name/description matching. Results navigate to the project/chat/artifact; prompt results fetch and highlight the specific prompt even outside the first history page. Shared search is bounded to 100 active memberships, 10 matches per type/index per project, and 100 returned results; the UI discloses these limits. Full-text token/prefix matching differs from local substring matching.

Preferences use `artifactos.preferences.v1:<account>:<mode>:<project-or-personal>` (components encoded). Only model ID/name/provider and Google Search grounding are persisted. API keys and policy selections are excluded, including on restoration. Old demo-only model preferences are superseded. Model filtering keeps the current selection visible. The local notebook is its own anonymous account, separate from signed-in accounts.

## Integration with other phases

- Main overlap: Session.tsx, Workspace.tsx, AIControls.tsx and shared/workspace.ts. Search and preference helpers are separate modules to keep conflict resolution small.
- Preserve Session's URL-backed `setRoute` and RemoteGate when merging routing changes. The gate may unmount Remote while a different destination is checked; phase 1 draft restoration should remain keyed by account/workspace/chat, not depend on a mounted composer.
- Preserve phase 1's composer draft behavior when merging Reuse prompt (`setText`, then focus). Reuse never submits; draft state should update through the same setter as typing.
- No send function, mutation lifecycle, generation, cancellation, review, or version-selection implementation was changed. The ChatView AI prop attaches the in-memory Gemini key to the scoped nonsecret preference at render time. Copy actions use independent feedback state and never take the shared busy lock.
- `Route.promptId` and optional `Actions.searchWorkspace` are additive. The search API only exists in shared mode; local actions need no change.
- Deploy the four new search indexes and `convex/navigation.ts` together before shipping the frontend. Regenerate Convex API declarations against the integration deployment; the local API declaration includes the new module.

## Verification and limitations

- `npm test`: 15 files, 79 tests pass, including URL serialization/restoration sequences, credential exclusion, account/workspace preference isolation, search isolation, targeted prompt fetch, malformed destinations, artifact access, and revoked memberships.
- `npm run build`: passes; bundle-size warning remains.
- `npm run lint`: passes with four generated-file unused-disable warnings.
- `npx tsc --noEmit -p convex/tsconfig.json`: passes.
- `git diff --check`: passes.
- `npx convex codegen` could not run because this worktree has no CONVEX_DEPLOYMENT. Backend deployment is explicitly owned by the main thread. No real browser/history/clipboard exercise or live authenticated smoke test was performed. URL restoration tests exercise the serialization and restoration logic rather than browser automation.
- Ignored guidance was absent in this worktree. Before committing, read the original AGENTS.md and convex/_generated/ai/guidelines.md under /Users/akshayav/Documents/artifactos, and verified backend changes against them and the Convex expert/reviewer skills. Public functions authenticate through the existing canonical token-identity helper; membership/ownership checks precede returned data; URL strings are normalized to typed IDs for graceful malformed-link recovery. Reads are indexed and bounded; queries use no wall clock or writes. Added a regression for personal chat IDs combined with unrelated project IDs.
- On large integration tables, account for search-index backfill before releasing the frontend; use a staged backend-only index deployment first if needed, then enable the indexes and deploy these queries.
