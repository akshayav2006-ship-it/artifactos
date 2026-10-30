# QoL integration verification

## Automated checks

Run `npm test`, `npm run build`, `npm run lint`, and `npx tsc -p convex/tsconfig.json --noEmit` after integrating all phase commits. Check the configured development deployment with `npx convex dev --once`.

## Browser scenarios

Use a separate browser profile and disposable local workspace data. Never replace an existing user's workspace for verification.

1. Create a project and conversation. Enter an unsent message, reload, and verify its text and destination survive. Navigate away and back, then submit; verify the saved prompt appears once and the draft clears.
2. Start a second draft and verify it does not leak into another chat or a new chat in another project.
3. Open a conversation through its URL, reload, and use Back/Forward between destinations. An invalid or inaccessible destination must show recovery controls.
4. Search for a project, chat, prompt, and artifact. Open results and verify the correct destination, including older targeted prompts.
5. Filter model choices, select a model, reload, and verify its preference survives. Confirm browser storage contains no API keys.
6. Copy a response and reuse a prompt. Reuse must populate an editable draft without sending automatically.
7. Compare two response versions. Check source labels and unchanged immutable snapshots.
8. Start generation and perform an unrelated workspace action. Cancel generation and verify the terminal state remains cancelled even after the provider would have completed. Provider behavior can be covered with deterministic test doubles; distinguish that evidence from a real account invocation.
9. Check the review inbox, disabled-action explanations, dismissible notices, truthful integration statuses, and recovery controls.
10. Inspect desktop and narrow-screen layouts for overflow, unreachable controls, and readable dialogs.

Save screenshots and/or a screen recording under `output/qol/` and record actual outcomes and limitations after execution.

## Executed results — 2026-10-30

All three phase branches were committed independently and cherry-picked into `main`. Integration preserves phase 1's durable-send acknowledgement, phase 2's URL and access gates, and phase 3's cancellation/pending state. Integration additionally routes legacy search, settings, and notifications into the live workspace; exposes Inbox and Settings navigation; fixes dark/mobile settings contrast and heading layout; separates recovery controls from success notices; and prevents expired generations from accepting late replies.

- Automated suite: **99 tests across 19 files passed** (75 baseline).
- Production build: passed. Existing large-bundle advisory remains.
- Lint: zero errors, four existing warnings in generated Convex files.
- Convex TypeScript check: passed.
- Configured **development** deployment: `npx convex dev --once` passed, including all four new search indexes; rerun after the final backend guard also passed. Production frontend was not published.
- Browser: created a disposable project and chat in an incognito profile. Reload restored the new-chat draft and project URL. Save created exactly one prompt and cleared the composer.
- Browser: an existing-chat draft survived leaving the chat, search-result navigation, Back/Forward, and reload. Prompt search opened and highlighted the correct turn.
- Browser: searched models, selected Gemini 2.5 Flash, reloaded, and observed the restored selection. The in-memory test key never appeared in browser storage.
- Browser: attached and revised a result, compared both immutable versions, copied the result successfully, and reused the prompt without automatically submitting it.
- Browser: intercepted the provider fetch with a deterministic pending request. During generation, Create project opened successfully. Cancel aborted the request signal and persisted the cancelled status. This verifies the UI/transport path without making a paid or credentialed external call. Backend tests separately verify authorization, provider abort, duplicate claims, and late-result rejection.
- Browser: `/notifications` opened the workspace Inbox, `/settings` opened Settings, and an unknown chat showed destination recovery. At 390 CSS pixels, document width remained 390 and all six navigation actions fit in two rows. Screenshots exposed and guided fixes for settings contrast and header overlap.

Evidence (local, intentionally git-ignored):

- `output/qol/walkthrough.mp4`: project creation, draft reload/save, manual result edits, version comparison, copy and reuse.
- `output/qol/response-comparison.png`: side-by-side versions with source attribution.
- `output/qol/cancellation.png`: cancelled prompt in the workspace.
- `output/qol/mobile-settings.png`: narrow-screen settings layout after contrast/header fixes.

Limits: no real provider inference or live authenticated shared-account walkthrough was performed. Shared authorization, targeted access, search isolation, and review eligibility are covered by tests. Browser capture timed out during an extra final settings recapture; previously saved screenshots and the recording remain available. The settings screenshot precedes the final addition of session configuration text, while including the final contrast/header fixes. Search returns bounded results, not an exhaustive cross-project export; its UI explains the limits. Cancellation cannot undo an upstream request that already completed.
