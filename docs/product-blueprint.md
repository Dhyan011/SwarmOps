# SwarmOps Product Blueprint

**Status:** product and capability audit, 12 October 2026
**Product promise:** **From incident evidence to a reviewable fix.**
**Supporting message:** Investigate faster. Fix with evidence. Keep humans in control.

## Product north star

SwarmOps is an AI-assisted incident investigation and remediation workspace for developers and small engineering/SRE teams. It helps a responder turn a reported application problem and available evidence into a reviewable diagnosis and, where the repository and permissions allow it, a human-approved GitHub pull request.

The value is the evidence trail, useful engineering context, and safer next action—not the fact that several agents run behind the scenes.

### Primary user and use case

- **Primary user:** developer or on-call engineer responsible for diagnosing an application failure and preparing a code change.
- **Primary use case:** provide symptoms and available logs/code/repository context; review the evidence and AI-generated findings; inspect a proposed diff and its actual validation state; then authorize a GitHub PR if eligible.

### Secondary users

- **Engineering/SRE lead:** review investigation quality, access boundaries, and proposed remediation.
- **GitHub maintainer:** assess changes against repository policies; use an issue/PR workflow only when GitHub permissions and explicit review support it.
- **First-time developer:** understand what SwarmOps can and cannot do, connect identity and repository access separately, and start with manual evidence if optional integrations are unavailable.

### User pain points

- Incident details, logs, code, and repository context are scattered.
- Responders spend time assembling context before they can test a cause.
- AI-generated explanations can be difficult to verify without linked evidence.
- A proposed patch can be mistaken for a tested or deployed fix.
- Provider failures and permission errors often look like empty or successful screens.

### Differentiation

SwarmOps combines a structured investigation record, bounded evidence intake, model-assisted synthesis, deterministic policy checks, and an authorized human-to-GitHub handoff. It must present provenance and uncertainty as product features.

## Product boundaries

SwarmOps is **not** a replacement for alerting, monitoring, on-call management, CI, source control, or production deployment. It does not autonomously merge or deploy generated code. A created PR is not proof that an incident is resolved. AI output is a hypothesis unless independently supported. Generated tests are suggestions until a sandbox actually runs them and records the result.

## Current capability audit

Classifications are based on source inspection and local tests. “Provider-unverified” means code paths and mocked/unit behavior exist, but no live provider operation was performed.

| Capability | Classification | Evidence and boundary |
| --- | --- | --- |
| Supabase session guard and backend JWT/tenant checks | Implemented and verified | `frontend/src/App.jsx`, `frontend/src/services/supabase.js`, `backend/auth.py`, owner-scoped DB methods in `backend/db.py`; backend tests cover token/tenant behavior. Live OAuth configuration was not verified. |
| Identity provider | Partial / provider-unverified | Google sign-in and callback are wired in `frontend/src/pages/LoginPage.jsx`; the live Supabase provider and redirect configuration were not verified. GitHub identity login is distinct from the GitHub App installation used for repository access. |
| Incident intake and persistence | Implemented and verified | FastAPI routes and async SQLAlchemy/Alembic persistence; PostgreSQL and migrations must be configured for deployment. |
| Model-assisted orchestration | Implemented; provider-unverified | Orchestrator and OpenRouter-compatible agent client exist. Model behavior, provider credentials, latency, and cost were not live-tested. |
| Metrics/traces/security/root-cause specialist work | Partial | Multiple roles are model prompts, not dedicated telemetry queries or deterministic scanners. Azure Logs has a provider-backed code path but deployment credentials are not provisioned by the current Render blueprint. |
| Public/GitHub context fetching | Implemented and verified at unit level | Bounded HTTPS/public-DNS fetcher, GitHub archive/content readers, and SSRF tests exist. Contribution scans persist an exact commit SHA and filter/redact common credentials; incident-context fetch failures and revisions are not yet a first-class evidence manifest. |
| Strict output/policy/human approval gates | Implemented and verified in tests | Strict validation schema, deterministic patch policy, reviewer/admin gate, and explicit `tests_executed=false` exist. They do not prove that a change works. |
| GitHub App installation and incident PR creation | Implemented; provider-unverified | Signed installation flow, owner-linked installation, repository-scoped tokens, patch application, and verified PR response are implemented and mocked in tests. No live provider mutation was performed. Branch-protection preflight is incomplete. |
| Public open-source contribution scan and publication | Implemented; provider-unverified | Public-only pinned-commit snapshot, sensitive-path exclusion/common-secret redaction, AI proposal, context-applicable diff and deterministic policy gate, owner-scoped persistence, reviewer/admin gate, separate issue/PR token scopes, exact-payload preview, atomic claim, and retry-safe partial state. No live GitHub write was performed. Private repositories, semantic duplicate-issue search, automatic issue↔PR cross-linking, fork flow, CI/test execution, and branch-rule preflight remain unsupported. |
| Incident-linked GitHub issue workflow | Not implemented | Contribution mode creates an issue and PR for the same scan, but incident actions still create only a PR and there is no general issue picker/association workflow. |
| Generated test execution | Not implemented | Tests are generated as suggestions; they are never run. |
| Google login | Implemented in frontend; provider-unverified | Google sign-in and callback are wired through Supabase, while live Supabase provider credentials, redirect allow-list, and OAuth completion were not tested. |
| Deployed realtime updates | Partial / unverified | Socket auth and owner rooms exist, but Docker starts `main:app` instead of `socket_app`; room state is in-process and no shared Socket.IO adapter exists. |
| Historical memory | Not a supported capability | UI is hard-coded/offline; backend helper is local JSON, not in the normal flow, and not tenant-scoped. Keep it out of the active product until redesigned safely. |
| Frontend operational states | Partial | Investigation and contribution pages expose loading/error/partial states. Legacy analytics/memory screens remain unlinked and are not routed. No frontend route/auth/action tests exist. |
| Frontend quality gates | Local checks pass | Production build and ESLint pass. No frontend route/auth/action tests exist. |

## Core journeys

### 1. First visit to an incident

Public home → explore a clearly labelled synthetic sample or sign in → establish SwarmOps identity → connect GitHub App separately if a repository action is needed → explain permissions and choose an authorized repository → create an investigation with any available manual evidence → inspect evidence/findings/uncertainty → review proposed diff and validation state → explicit reviewer approval → verify PR URL/status → track resolution separately.

Google is the SwarmOps identity provider; GitHub App installation is separate repository authorization. Google provider setup, redirect allow-list, and end-to-end OAuth remain deployment prerequisites and provider-unverified until tested against the configured Supabase project.

### 2. Manual-evidence fallback

If GitHub or observability is unavailable, a user can submit symptoms and supported manual logs/stack traces/code context. The workspace identifies that content as **user supplied**, distinguishes it from **retrieved source**, and lists integrations that were unavailable. The product must not describe manual evidence as live telemetry.

### 3. Failed or partial investigation

Keep the incident record and completed evidence; show which provider/phase failed, what remains unknown, and a safe retry/recovery action. Do not translate a failed fetch or model call into a successful empty report.

### 4. Open-source contribution mode (implemented, provider-unverified)

Scan a canonical public GitHub repository read-only at a pinned commit. Filter sensitive files, redact common credential patterns, include contribution guidance where it fits the bounded source snapshot, and require a context-applicable deterministic-policy-cleared diff. A `security_reviewer` or `administrator` must inspect the source SHA, issue/PR text, and full patch and explicitly confirm publication. The GitHub App requests issue-only write scope for issue creation and a separate repository-scoped contents/PR token for PR creation. A PR may exist if the subsequent issue write fails; that partial outcome is persisted and can be retried with the same payload. Public visibility alone does not grant write access. Current limitations: public repositories only, no semantic duplicate-issue detection or automatic issue↔PR cross-link, no fork workflow, branch protection is left to GitHub, and tests are not run.

## Information architecture

### Public website

- **Home:** concise product promise, sample workflow, contribution mode, actual boundaries, security/permissions, CTA to sign in.
- **How it works:** evidence → findings → proposed fix → validation → human-approved GitHub handoff.
- **Security & permissions:** Supabase identity, GitHub App access, model-provider data flow, and human action boundary.
- **GitHub repository:** link to the project itself.
- Avoid empty documentation/product routes; add them only when their content is real and maintained.

### Authenticated workspace

- **Investigations:** active/recent work, true statuses, required setup, and the primary “Investigate an incident” action.
- **New investigation:** symptoms plus optional service, severity, repository URL, logs/stack trace/code; permit incomplete context and disclose source types.
- **Investigation detail:** overview, evidence, findings, proposed remediation, validation, activity and authorized actions.
- **Report:** exportable record of the actual investigation and outcomes.
- **Settings & integrations:** identity session, GitHub App state/permissions, server-configured model provider status where the backend can truthfully report it.
- Do not expose nonfunctional Analytics, Memory, issue, or repository pages until they have real scoped data and workflows.

## Page purposes and essential states

| Surface | Purpose | Required states |
| --- | --- | --- |
| Public home | Explain value and boundaries; offer demo/sign-in | normal, labelled sample, configuration-unavailable, responsive/keyboard |
| Login/callback | Establish verified SwarmOps identity | loading, no Supabase config, OAuth pending, callback success, denied/expired session, retry |
| Investigations | Help users find the next action | loading, first-use empty, filtered empty, API failure/retry, real active/recent records |
| New investigation | Accept partial symptoms and optional evidence | validation, submitting, provider/backend failure, created and navigated; no fake token estimate |
| Investigation detail | Explain progress/evidence/findings/patch and safe next action | loading, not found/unauthorized, integration failure, partial completion, not enough evidence, validation states, action pending/failed/succeeded |
| Settings & integrations | Separate identity from repository/model access | connected, not connected, insufficient permissions, revoked, reconnect, provider unavailable |
| Report | Preserve shareable evidence and verified outcomes | loading, unavailable, export success/failure; no claim of resolution without verification |

At every point answer: **What is happening? What evidence exists? What did we learn? What remains uncertain? What is safe next?**

## Integrations and authorization

| Integration | Role | User-facing boundary |
| --- | --- | --- |
| Supabase Auth | SwarmOps identity | One authenticated identity; provider setup and callback allow-list must be configured server-side. |
| GitHub App | Repository read/write authorization | Installation is distinct from login. Read permission does not imply issue/branch/PR write permission. Re-check repository and required permission for each action. |
| OpenRouter-compatible LLM | AI investigation | Backend configuration or explicit supported per-user credential; never treat its key as identity or claim provider verification without an actual call. Explain that submitted evidence is sent to the configured model provider. |
| Azure Log Analytics | Optional external logs | Only show as connected when backend configuration and query path can be verified; otherwise support manual log input. |
| Metrics/tracing providers | Future integrations | Do not show connected badges or imply live queries until an actual integration exists. |

## Trust and security requirements

- Preserve verified Supabase identity and server-side tenant/role checks.
- Keep GitHub App private key and installation tokens server-side; use least-privilege, repository-scoped credentials.
- Never store provider access tokens or API keys in browser `localStorage`.
- Show provider data flow and evidence provenance; treat repository content/logs as untrusted input.
- Keep external writes behind server-side ownership, permission, policy, and human-approval checks.
- Record external actions and verify provider responses before displaying success.
- Distinguish AI-generated conclusions from externally verified facts and tests.
- Do not enable cross-user historical memory without owner-scoped durable storage and regression tests.

## Design system

- **Aesthetic:** restrained editorial engineering workspace: quiet charcoal surfaces, precise typography, visible dividers, purposeful monospace for evidence and diffs.
- **Principles:** evidence before decoration; status colors carry meaning; uncertainty is visible; actions are explicit and reversible where possible.
- **Palette:** neutral ink/slate base; cool blue for links and active navigation; amber for review/warning; green only for verified success; red for error/critical state.
- **Layout:** public pages use an editorial left-aligned narrative; the workspace uses a persistent, labelled navigation rail with a readable main column and optional evidence side panel. Mobile collapses navigation rather than shrinking desktop columns.
- **Signature motifs:** provenance tags (`Supplied`, `Retrieved`, `AI-generated`, `Verified`), a compact investigation timeline, and a clear status strip separating evidence from conclusions.
- **Interaction:** immediate visible pending state, one safe next action at a time, inline retry after recoverable failures, and a confirmation summary before external writes.
- **Motion:** subtle state transitions only; respect reduced-motion preferences; no simulated live telemetry or parallax backgrounds.
- **Typography:** system sans for navigation/body, system monospace for logs/code; strong 32/24/18/14 hierarchy with readable line lengths.
- **Brand essence:** an evidence-first incident workspace for developers who need an explainable path from symptom to reviewable code change. Personality: precise, calm, accountable.
- **Voice:** “Here is the evidence we could retrieve.” “This patch has not been run against your test suite.”
- **Wordmark:** retain the existing simple branching-node mark, remove the generic swarm/command-center spectacle.
- **Signature color:** muted electric blue used sparingly for active focus and links—not for success or severity.

## Product roadmap

### Overhaul baseline

1. Remove fabricated provider badges, confidence, token estimates, analytics, and memory data.
2. Align UI status/actions to backend states; fix approve copy to say “Create pull request,” never deploy.
3. Add user-visible loading/error/not-found/partial states and robust login/logout recovery.
4. Reframe public home around evidence-to-reviewable-fix and label all sample content.
5. Make accessible, responsive workspace navigation and truthful investigation intake.

### Next capability releases

1. Google identity OAuth with real Supabase provider/redirect configuration and tests; GitHub App remains separate.
2. Evidence manifest with source, timestamp/revision, retrieval result, truncation, and missing-data fields.
3. Incident issue association and contribution issue↔PR cross-linking; semantic duplicate detection; branch-protection preflight and richer recovery for ambiguous provider timeouts.
4. Isolated, bounded test execution with persisted logs/results; until then, generated tests remain suggestions only.
5. One real observability provider selected by target users, then additional providers.
6. Extend contribution mode with private-repository authorization (only if users require it), a permission-aware fork workflow, and isolated test execution before publication.
7. Tenant-scoped audit read/export, CI, deployment smoke tests, and shared Socket.IO adapter before multi-instance scaling.

## Audit limitations

The audit used repository inspection plus local backend tests, frontend production build/lint, and a production-dependency audit. The current local run passed **87 backend tests** (one pytest collection warning for the application class `TestGeneratorAgent`), the frontend production build, and frontend lint; `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities. No live Supabase OAuth/JWKS, OpenRouter, Azure, GitHub App mutation, PostgreSQL deployment migration, or deployed Socket.IO flow was executed. These results are source-level/test-double evidence, not proof of production-provider operation.
