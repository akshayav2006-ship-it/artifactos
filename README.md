# Artifactos

A Codex-style workspace for project conversations, prompt provenance, artifact commits, and review.

## Run

```sh
npm install
npm run dev
```

Open the address printed by Vite. `npm run build` checks the frontend and builds it; `npm test` runs the workflow and permission tests. Backend changes can be deployed with `npx convex dev --once` to the configured development deployment.

## Workspace flow

- **Overview** keeps the dashboard layout.
- **New chat** starts without a project. Select a project before or after sending prompts; the project is locked after the first commit so provenance cannot change.
- **Prompt** opens a project picker, then the project's selected saved prompts with author, time, result, and the most recent reviewed result's trust score.
- **Artifact** opens a project picker, then pushed artifacts with review status. A commit alone does not publish an artifact.
- **Pinned** stores shortcuts to projects and chats for the current local user or signed-in account.
- **Projects** has a create button. A project shows its name, description, invitations, collaborators, chats, prompts, and pushed artifacts.

Each person selects their own model and chats in Artifactos. Use **Save prompt** on selected turns to add them to the prompt library. Saving a prompt never attaches its AI reply. In chat, manually paste and attach a result, create one or more immutable commits, then push individual commits. A different project owner or admin can verify a pushed artifact or request changes, entering a trust score from 0 to 100 and review notes. Contributors, reviewers, and viewers cannot verify. Scores are human review scores, not automatically generated confidence estimates.

## Local and shared workspaces

The default local workspace saves to this browser. Existing v1 browser data is migrated on first use; original browser data remains intact. Previously saved artifacts become commit snapshots in imported chats. They must be explicitly pushed before appearing in project artifact libraries. Local work does not automatically transfer into a signed-in workspace.

Use the account control at the bottom of the sidebar to sign in to the shared Convex workspace. Local and shared work are kept separate. Cloud project access, writing, pushes, and reviews are checked on the server, with author identity derived from the signed-in account.

Normal workspace access uses the authenticated Clerk identity and does not require email claims. Viewing or accepting email-addressed invitations additionally requires signed `email` and `email_verified` claims. A client-supplied profile email cannot claim invitations. Existing `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CONVEX_URL` configure the client; `CLERK_FRONTEND_API_URL` configures the backend issuer.

## Email invitations

Owners and admins can invite collaborators by email. Recipients accept pending invitations after signing in with the invited email. Delivery is queued on the server and its status appears under Collaborators. For actual delivery, configure these server-side Convex environment variables:

- `RESEND_API_KEY`: the email provider credential.
- `INVITE_FROM_EMAIL`: an approved sender on your verified email domain.
- `APP_URL`: the address recipients should open to sign in.

Without these settings, Send invitation shows a setup error and does not create a new invitation. After configuration, submitting the same email and role retries an existing unsent invitation. No fake delivery success is shown.

## AI connection

Select a model in **New chat → Model**, then open **AI connections**.

- **Gemini:** paste your own [Google AI Studio key](https://aistudio.google.com/apikey). Gemini 2.5 Flash and Flash-Lite are included; you can also enter another Gemini model ID. Free-tier eligibility and quotas depend on your model, region, and Google project billing. Keys remain in React memory and are sent with generation requests, never persisted in browser storage or application tables. In local development, requests pass through the Vite backend; signed-in workspaces use the Convex Agent component for durable conversation context. Deploy backend changes with `npx convex dev --once`.
- **ChatGPT plan:** run `npm run dev` on `localhost` or `127.0.0.1`, open the local workspace, and choose **Continue with ChatGPT**. The official open-source OAuth flow uses PKCE, state, nonce, signature-verified ID tokens, a loopback callback, and separately authorized plan-usage scopes. Eligible accounts provide their available model catalog. Select a ChatGPT model after authorization. Saved registrations can be reconnected individually; disconnect clears local tokens and attempts remote revocation. Manage app limits in ChatGPT Settings.
- **Notebook:** saves a prompt without contacting any provider. AI replies stay in the conversation. Results must be manually attached before committing and reviewing them.

ChatGPT credentials and the stable host ID live outside this repository at `~/.config/artifactos/chatgpt.json` (owner-only permissions). Access tokens refresh on demand. Do not run multiple Artifactos dev-server processes against this credential file. The local AI endpoints reject non-loopback hosts and cross-origin requests. They are development-only and are not included in static production hosting.

The ChatGPT connection authorizes local AI usage; it does not replace Clerk sign-in for shared project access. Hosted website ChatGPT sign-in requires registered partner credentials and is not enabled here. See the [OpenAI website integration requirements](https://developers.openai.com/siwc/website) and [open-source plan-usage flow](https://developers.openai.com/siwc/token-sharing-open-source/sign-in).

Provider replies display generating, completed, or failed states. Retry restores the failed prompt to the composer. No provider credentials are included in saved prompt records. Real account authorization and provider inference require your own account/key; automated tests cover the workflow with mocked provider responses.

The earlier frontend is preserved in `previous-app/` as text files. The existing project/team backend remains available alongside the new workflow.

### Sending from Gmail without a custom domain

Set `EMAIL_PROVIDER=gmail`, `GMAIL_USER` to the real sending Gmail account, and `GMAIL_APP_PASSWORD` to a Google App Password (not the account's normal password). Keep credentials in Convex environment settings. `APP_URL` must point to the app recipients can access. Gmail sends from the authenticated account and does not use the Resend test sender. Enable 2-Step Verification and generate the App Password through the account's Google security settings. Email sending remains unavailable until these settings are complete.

The routed dashboard, projects, artifacts, profile, and settings pages are preserved. Open `/chat` from the dashboard’s AI Chat navigation for the connected AI composer, or `/workspace` for the complete local/shared contribution workspace. Workspace styling is scoped to avoid changing the routed dashboard pages.

## Response versions and model provenance

New AI replies and manual result edits automatically create immutable response versions in both local and shared workspaces. Open **Response history** below a chat prompt to inspect earlier bodies, contributor attribution, and capture times. Shared history is access-controlled with the chat and paginated through **Load more**. Prompt authorship stays unchanged; manual commits remain separate immutable snapshots and retain their source response ID and source model metadata when available.

AI versions record the provider, requested model ID, and provider-reported model/version when supplied. **Not provided** means the provider did not expose a distinct version; an SDK fallback to the requested alias is not treated as a resolved version. Manually attaching a result leaves the conversational reply and its model attribution intact. The attached result is attributed to the contributor, not to the AI model. Late replies are preserved without overwriting a manual revision.

Existing workspaces remain compatible. An older result is preserved as an **Earlier saved result** before its first edit or commit; its original source and response time cannot be reconstructed. Previously overwritten results cannot be recovered. Response history stores no provider credentials. The Convex Agent component continues to manage provider conversation context; response versions record the application's result revision history.
