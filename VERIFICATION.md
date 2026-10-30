# Verification — 30 October 2026

## Result

The implemented core passes automated checks. The entire application is not yet production-complete: the legacy dashboard is a demo and several navigation items are placeholders.

## Checks completed

- `npm run build`: passed.
- `npm test`: 59 tests passed across 10 files.
- `npm run lint`: no errors; four existing generated-file warnings.
- `git diff --check`: passed.
- Hosted app loaded in a browser; demo sign-in and project creation worked.
- Dashboard, project list, notifications, settings, and profile pages rendered.
- Local workspace project creation worked.
- Signed-in shared Groq generation, prompt saving, result attachment, and artifact commit creation worked.
- A live Groq GPT OSS 20B request returned HTTP 200 and a nonempty reply.
- Convex tests cover ownership, project isolation, response history, policy citations, immutable commits, designated approvers, concurrent reviews, invitation identity, and email failure handling. Provider/email calls are mocked in automated tests.

## Gaps and limits

- `/login` accepts demo credentials. It does not authenticate the real shared workspace.
- Dashboard metrics, settings integration claims, and profile identity are sample/static values; they should not be treated as live account data.
- `/search`, `/assistant`, `/analytics`, and `/knowledge-graph` redirect to the dashboard.
- Legacy `/api` requests are not backed by the static Vercel deployment; demo login falls back after a 405 response.
- Hosted Clerk uses development keys; the frontend points to a Convex development deployment.
- Signed-in shared browser verification passed: selected Groq GPT OSS 20B in the existing verification project, generated a nonempty reply with Groq provenance, saved the prompt, attached a manual result, and created the immutable commit `Groq launch checklist verification`.
- Live review approval and notification email delivery were not exercised; their permission and workflow behavior is covered by automated tests.
- Real email delivery and local ChatGPT OAuth were not exercised.
- The preview recording tool timed out twice. The demo video is a labeled walkthrough assembled from real browser captures, not a continuous recording.

## Deployment

Frontend: https://artifactos-rho.vercel.app

Backend used by the frontend: dazzling-bobcat-372 (development).


## OpenRouter addition — 30 October 2026

- Full suite: 66 tests passed. Added free-catalog filtering, zero-price transport enforcement, OpenRouter provenance/credential isolation, paid/removed model rejection, catalog outage, and chat ownership tests.
- Live SDK request using the configured server key and enforced zero maximum provider pricing succeeded through `openrouter/free`; provider reported `nvidia/nemotron-3.5-lightning:free` with a nonempty response.
- Catalog snapshot: 16 free chat entries. The picker refreshes from the API and groups Groq, OpenRouter, and Gemini; backend revalidates current free eligibility on every OpenRouter generation.
- Full browser workflow for OpenRouter and inference on every catalog model were not exercised. The earlier shared Groq browser workflow passed.

## PDF replies, direct commits, and account welcome page

- 75 tests pass; build passes; lint has no errors (four generated-file warnings remain).
- A real four-page PDF was generated with the app's PDF renderer, then rendered using macOS PDFKit and visually inspected across all pages. Headings, lists, table, code, and footers were readable without clipping.
- Tests cover PDF request detection, valid PDF output, attachment validation, direct AI-response commit provenance, manual edit provenance, project access, immutable PDF snapshots, submission retention, and local persistence.
- Document replies show downloadable PDF cards. The commit dialog defaults the project, attaches the PDF only for document requests, or exposes editable text for chat replies, and retains the commit message.
- The account welcome page uses an embedded Clerk login/registration widget and two-column introduction. Login/signup verification remains governed by the configured Clerk development instance; a new account was not created during testing.
