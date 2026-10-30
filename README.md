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

Each person selects their own model and chats in Artifactos. Use **Save prompt** on selected turns to add them to the prompt library. Saving a prompt never attaches its AI reply. In chat, manually paste and attach a result, create one or more immutable commits, then push individual commits. Before submitting, select required approvers from other project owners, admins, and reviewers. Every selected approver must approve before the submission is verified; a request for changes stops approval. Each review records a trust score from 0 to 100 and notes; the final score is the rounded average of approval scores. Contributors and viewers cannot approve, and authors cannot approve their own work. Existing submissions retain their original one-approval requirement. Scores are human review scores, not automatically generated confidence estimates.

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

## Google Search citations

Select a Gemini model in chat and enable **Ground with Google Search** before sending. The model searches when useful and returns clickable inline citations, a source list, and Google Search suggestions. Search usage may incur charges under your Google AI project. The option works in both the local development workspace and the shared Convex workspace.

Source metadata is retained with the original AI reply and its response history. Manually attached or edited results do not inherit the original reply's citations. Existing replies remain readable without source metadata. Gemini API keys remain in session memory and are not saved with responses.

This uses the [AI SDK Google Search tool](https://ai-sdk.dev/providers/ai-sdk-providers/google) and [Google grounding metadata](https://ai.google.dev/gemini-api/docs/google-search). Deploy the Convex changes to enable grounding in the hosted workspace.

## Company policy sheets

In a project chat, open **Company policy sheets**, import a CSV or TSV export, search the policy text, and select up to eight rows before sending an AI prompt. Both the local development workspace and shared Gemini workspace support this flow. Imports retain the file name and original spreadsheet row number, including blank rows and quoted multiline cells. Each import accepts up to 200 nonempty rows, 6,000 characters per row, and a 300 KB file. Reimporting adds another copy; native Excel files and live Google Sheets syncing are not supported.

AI replies can cite selected excerpts using `[P1]` markers. Expand **Company policy citations** below the reply or in response history to see the exact excerpt, sheet name, and row. Only markers referring to supplied rows receive source metadata. These citations identify source excerpts; they do not independently verify the model's interpretation. Manually attached results do not inherit AI citations. Shared search is project-scoped full-text search; local search matches all entered words. Project members can read policies; owners, admins, and members can import them. Deploy the Convex schema and functions to enable shared policy sheets.

## Hosted Groq chat

Signed-in shared workspaces can select GPT OSS 120B, GPT OSS 20B, or Qwen 3.8 27B (preview) through Groq. Speech and safety-classification models use different workflows and are excluded from the chat picker. Configure `GROQ_API_KEY` in the Convex deployment used by `VITE_CONVEX_URL`, then deploy the backend and Vercel frontend. The key stays server-side. Groq replies use the existing conversation, policy citations, and response provenance flow. Generation disables automatic retries, caps output at 2,048 tokens, and displays a retry delay when a 429 response supplies `retry-after`. Organization quotas are shared across users; exact quotas depend on the Groq account.


## OpenRouter free chat catalog

Signed-in workspaces group chat choices under Groq, OpenRouter, and Gemini. Configure `OPENROUTER_API_KEY` on the Convex deployment; it never goes into browser storage, source, or prompt records. OpenRouter's public models API refreshes the picker when the shared workspace opens; **AI connections → Refresh free models** refreshes it again. The dated bundled snapshot is used when catalog refresh fails, with a visible notice. The server fetches current pricing again before every OpenRouter generation and fails closed if the catalog is unavailable or the model is no longer free.

Eligible entries accept text, produce only text, and have explicit zero input/output prices and no nonzero listed price fields. Dedicated safety classifiers and audio generation are excluded. Requests set zero maximum prompt/completion/request prices and disable provider fallback. There is no automatic paid-model fallback. Free-model quotas, provider capacity, and account privacy settings still apply. Replies retain OpenRouter attribution in response history and use the existing project access and policy citation flow.

Catalog checked 2026-10-30: 16 free OpenRouter chat entries (including the free router), three Groq chat choices, and eight Gemini free-tier-eligible presets. The Gemini list follows Google's published pricing; API key access and quotas depend on the Google account, and using a billed key or optional Google Search may incur charges. Custom Gemini IDs remain available.

Sources: [OpenRouter models API](https://openrouter.ai/api/v1/models), [free model variants](https://openrouter.ai/docs/guides/routing/model-variants/free), [provider pricing filters](https://openrouter.ai/docs/guides/routing/provider-selection), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), and [Groq models](https://console.groq.com/docs/models).


## PDF replies and direct commits

Ask chat to create a document, report, or PDF. The app formats the model's reply into a downloadable PDF card. PDF creation runs in the browser with bundled fonts. Supported formatting includes headings, emphasis, lists, tables, code, and links. Remote images and raw HTML are excluded. PDF attachments are limited to 550 KB and stored with the immutable commit snapshot; document content remains in the original response history.

Every completed reply has **Commit artifact**. The dialog defaults to the chat's project, or lets you select one for an unassigned chat. Document replies attach the PDF only. Text replies prefill an editable text attachment and offer a formatted preview. Enter the artifact name and commit message, then create the commit; no separate Attach result step is required. Unchanged replies retain their AI source version and model attribution. Edited text becomes a contributor revision. Submit the selected final commit through the existing approver flow.

## Account welcome page

The login and shared-workspace welcome screens use a two-column introduction and embedded Clerk login form. **Create account** switches to Clerk registration. This replaces the legacy demo-credential login at `/login`; real account access leads to `/workspace`. Available email/password fields, social providers, verification, and recovery follow the configured Clerk instance.
