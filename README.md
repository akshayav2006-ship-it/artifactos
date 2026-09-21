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
- **Prompt** opens a project picker, then the project's prompt history with author, time, result, and the most recent reviewed result's trust score.
- **Artifact** opens a project picker, then pushed artifacts with review status. A commit alone does not publish an artifact.
- **Pinned** stores shortcuts to projects and chats for the current local user or signed-in account.
- **Projects** has a create button. A project shows its name, description, invitations, collaborators, chats, prompts, and pushed artifacts.

In chat, attach a result, create one or more immutable commits, then push individual commits. A different project owner or admin can verify a pushed artifact or request changes, entering a trust score from 0 to 100 and review notes. Contributors, reviewers, and viewers cannot verify. Scores are human review scores, not automatically generated confidence estimates.

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

Chat currently saves prompts and contributor-attached results. No live model is configured, and no AI response or trust score is fabricated. Shared chat history is persisted using the Convex Agent component. The UI explicitly shows that live AI is not connected.

The earlier frontend is preserved in `previous-app/` as text files. The existing project/team backend remains available alongside the new workflow.

### Sending from Gmail without a custom domain

Set `EMAIL_PROVIDER=gmail`, `GMAIL_USER` to the real sending Gmail account, and `GMAIL_APP_PASSWORD` to a Google App Password (not the account's normal password). Keep credentials in Convex environment settings. `APP_URL` must point to the app recipients can access. Gmail sends from the authenticated account and does not use the Resend test sender. Enable 2-Step Verification and generate the App Password through the account's Google security settings. Email sending remains unavailable until these settings are complete.
