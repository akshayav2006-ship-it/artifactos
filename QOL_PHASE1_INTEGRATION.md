# Phase 1 integration notes

## Draft/send contract for phase 3

- `Actions.sendPrompt(chatId, text, ai?, onPersisted?)` now accepts an optional callback. Invoke it **after durable prompt creation**, before provider work; do not invoke it when prompt persistence fails. It must not mean “provider succeeded.” Existing adapters without the callback remain compatible.
- `localActions.sendPrompt` invokes the callback immediately after its initial persisted prompt update. Preserve this placement when integrating cancellation/send changes.
- `ChatView` calls `draft.begin(id, message)` after chat creation and passes the returned callback to `sendPrompt`. It also calls the callback after successful completion for adapters that do not implement it yet. Calls are idempotent for the submitted text and preserve subsequent edits.
- `useChatDraft` / `drafts.ts` own persistence. Keys include local/shared mode, user, chat; new-chat drafts additionally distinguish the initial project context. On chat creation the draft transfers to the new chat before navigation. Existing ChatView keys now also include mode and user.
- Pending drafts record the submitted text and previously known prompt IDs. A newly observed matching prompt from the same user/chat acknowledges persistence even if its provider status is failed or generating. Explicit “Retry prompt” text has no submission marker and stays unsent until the user sends it.
- Draft storage errors preserve the in-memory draft for navigation and expose retry/download actions. Browser storage denial cannot provide recovery after the process closes; copy/download before leaving. Malformed stored drafts are not overwritten on mount.

## Session/URL handoff for phase 2

- Session changes are deliberately small: include `promptPages.status === "LoadingFirstPage"` in Workspace loading, preventing pending shared drafts from appearing before persisted prompt history loads; adjust the connection boundary recovery wording/button. Preserve these when applying the Session URL work.
- The dashboard topbar submits to `/search?q=<encoded query>`. This is a functional search page over actual saved local workspace projects/chats/prompts/artifacts. It labels its local scope and links to `/workspace` for shared search. Result rows currently show matches; they do not deep-link individual items.
- Once phase 2's URL contract is integrated, main can route the topbar directly to its canonical `/workspace?view=...` search URL (with its query parameter) and replace result rows with the canonical project/chat/artifact links. No unconfirmed Session URL format is encoded here.
- `/notifications` now lists actual saved local invitations/pending artifacts, labels the scope, and links to the workspace for shared approvals/invitations. Topbar count uses that data instead of the legacy fabricated unread count.
- App-shell search is separate from phase 2's Workspace search/preferences/quick actions. No changes to those controls were made.

## Other changes and boundaries

- Notices dismiss parent errors independently from transient notices; reload and current-data download provide recovery actions. A dismissed parent error does not reappear merely because its notice state was empty.
- Settings removes fabricated connected-provider and workspace-default claims, and directs users to chat connection controls.
- Assistant, analytics, knowledge graph, and unknown destinations show explicit availability pages instead of silently redirecting to the dashboard.
- Legacy dashboard overview/project/artifact fixture pages remain outside this phase. This phase replaces the topbar controls and destination behavior, not those underlying views.
- No backend/schema changes, dependency updates, server startup, browser verification, pushes, PRs, or merges were performed.

## Verification

- `npm test -- --reporter=dot`: 87 tests pass (75 baseline plus 12 added).
- `npm run build`: passes; existing large-chunk advisory remains.
- `npm run lint`: passes with the four baseline generated-file unused-disable warnings.
- Added coverage: draft scope separation, pending prompt acknowledgement including provider failure, explicit retry/old prompt distinction, edits during send, storage failure memory preservation, corrupt draft validation, real local search data, notification recovery, unsupported destinations, and send persistence callback ordering/failure behavior.
- Main should browser-check refresh/navigation/new chat recovery, shared-history loading, storage quota/denial recovery, and the integrated phase 2/3 flow on its existing localhost:5173 server.
