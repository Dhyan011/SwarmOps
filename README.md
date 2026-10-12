# SwarmOps 🐝

**SwarmOps** is an evidence-first engineering workspace for investigating reported software failures and preparing reviewed code changes. It keeps supplied evidence, model hypotheses, deterministic checks, and verified GitHub outcomes distinct. It does not claim to replace monitoring, execute the user's test suite, merge a change, or deploy software.

🚀 **Live Demo:** [https://swarmops-1.onrender.com](https://swarmops-1.onrender.com)

---

## Product promise

SwarmOps helps a developer or on-call responder move from a reported symptom and the evidence they can provide to a reviewable investigation record. It can retrieve bounded public GitHub context, ask an AI model to analyze the supplied material, and—where permissions and policy allow—prepare a human-reviewed pull request. Findings remain hypotheses until independently verified. Suggested tests are **not run** by the current product.

---

## 🧠 Concept & Architecture

When an incident is reported, SwarmOps runs a **sequential model-assisted workflow** over the supplied description, optional user evidence, and supported public repository context:

1. **Triage Agent**: Initially classifies the incident and determines the optimal investigation strategy.
2. **Log Analyzer Agent**: Analyzes available log text; this is not a live log-provider query unless a deployment explicitly configures one.
3. **Metrics Agent**: Interprets supplied metrics/context; it does not currently query a connected metrics backend.
4. **Trace Agent**: Interprets supplied trace context; it does not currently query a connected tracing backend.
5. **Security Agent**: Provides model-assisted security analysis; it is not a deterministic vulnerability scanner.
6. **Root Cause Agent**: Synthesizes all findings from the previous agents into a definitive root cause analysis.
7. **Fix Generator Agent**: Proposes a patch; a proposal is not proof of a fix.
8. **Validation Agent**: Returns a structured model verdict. Separate deterministic checks can reject unsafe patch patterns, but the workflow does not run tests or prove correctness.

As agents work, they send progress events in **real time** over authenticated WebSockets. Raw model token streams and unrestricted chain-of-thought are not exposed.

### 🗺 Detailed System Architecture

```mermaid
graph TD
    %% Define Styles
    classDef frontend fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef backend fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef ai fill:#4c1d95,stroke:#8b5cf6,stroke-width:2px,color:#fff;
    classDef external fill:#78350f,stroke:#f59e0b,stroke-width:2px,color:#fff;
    classDef storage fill:#0f172a,stroke:#94a3b8,stroke-width:2px,color:#fff;

    subgraph Browser Client
        UI[React Dashboard UI]:::frontend
        WS_Client[Socket.IO Client]:::frontend
        Reviewer[Human Security Reviewer]:::frontend
        SessionStore[(Tab-scoped Auth Session)]:::storage
    end

    subgraph Server [FastAPI Backend Container]
        subgraph FastAPI [Backend Services]
            Static[Static Asset Server]:::backend
            API[REST API Router]:::backend
            WS_Server[Socket.IO Server]:::backend
            DB[(Tenant-scoped PostgreSQL)]:::storage
            Orchestrator[AI Orchestrator Engine]:::backend
        end

        subgraph Swarm [Autonomous Agent Swarm]
            Agent1[Triage Agent]:::ai
            Agent2[Log Analyzer]:::ai
            Agent3[Metrics Agent]:::ai
            Agent4[Trace Agent]:::ai
            Agent5[Security Agent]:::ai
            Agent6[Root Cause Analyst]:::ai
            Agent7[Fix Generator]:::ai
            Agent8[Validation Agent]:::ai
        end
    end

    subgraph External Dependencies
        GitHub[(GitHub Repositories)]:::external
        OpenRouter[OpenRouter API / LLMs]:::external
    end

    %% Authentication Flow
    UI -- "Supabase Auth session" --> API
    
    %% API Requests
    UI -- "POST /incident (verified JWT)" --> API
    API -- "Stores Reports" --> DB
    
    %% WebSockets
    WS_Client -- "Real-time Live Feed" <--> WS_Server

    %% Server Internal Workings
    API -- "Triggers Investigation" --> Orchestrator
    Orchestrator -- "Reads supplied public URL context" --> GitHub
    
    %% Orchestrator to Agents (Workflow)
    Orchestrator --> Agent1
    Agent1 --> Agent2 & Agent3 & Agent4 & Agent5
    Agent2 & Agent3 & Agent4 & Agent5 --> Agent6
    Agent6 --> Agent7
    Agent7 --> Agent8

    %% AI Actions
    Swarm -- "Sends Context & Prompts" --> OpenRouter
    Swarm -- "Emits Real-time Logs" --> WS_Server
    Reviewer -- "Creates PR via owner-linked GitHub App" --> GitHub
```

### ⚙️ Technical Deep Dive

SwarmOps is built with a meticulously designed architecture that balances high performance with strict security:

1. **Flexible deployment**: The Dockerfile can serve the Vite/React UI and API from one container; the included Render blueprint instead deploys a backend web service and a separate static frontend.
2. **Verified identity and tenant isolation**: Supabase access-token signatures, issuer, audience, and expiry are verified by the backend. Incident rows, database queries, and realtime events are scoped to the authenticated owner.
3. **Fail-closed AI validation**: The validation agent must satisfy a strict JSON schema. A separate deterministic patch policy rejects secrets and protected paths; generated tests are marked as unexecuted and do not count as proof.
4. **Human-controlled GitHub actions**: A reviewer or administrator can request a PR only through their linked GitHub App installation. Incident patches and contribution patches are policy-checked, and success is shown only after GitHub returns a verified link. Contribution scans are public-only, pinned to a commit, and never write until an explicit review action.
5. **Bounded reliability controls**: Provider calls use limited retries and timeouts. Investigation admission has a configurable queue wait, concurrency cap, and end-to-end deadline; `/ready` checks database connectivity. The concurrency cap is per backend process.

---

## 📖 Usage Guide

Using SwarmOps is designed to be as seamless as possible:

1. **Sign in to SwarmOps**: Use Google through Supabase Auth. The frontend needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the backend independently verifies the resulting access token. Google is the identity provider; it does not grant repository access.
2. **Connect GitHub when needed**: Install the configured GitHub App separately. Repository access is limited by the installation and per-operation checks; no personal access token is stored. GitHub connection is optional for manual-evidence investigations.
3. **Report an incident**: Start an investigation with a short description and any available service, logs/stack trace/code, and optional public GitHub URL. A public repository URL is context, not write permission; manual evidence is not live telemetry.
4. **Watch the Swarm**: Authenticated Socket.IO progress events are delivered to the user's private room; raw model token streams are not sent.
5. **Review findings**: Treat model output as a hypothesis. Check the evidence, policy findings, proposed patch, and `tests_executed` state (currently false; generated tests have not been executed).
6. **Request a PR**: Only a `security_reviewer` or `administrator` role in trusted Supabase `app_metadata.roles` can approve a policy-cleared proposal. SwarmOps creates a pull request, not a deployment; a PR does not prove that an incident is resolved.
7. **Scan for an open-source contribution**: Open **Contributions**, enter a public `github.com/owner/repository` URL, inspect the pinned-commit finding and exact issue/PR text and diff, then explicitly confirm. A linked GitHub App needs repository metadata read, Issues write, Contents write, and Pull requests write. SwarmOps creates an issue and PR but does not merge, run CI, or claim tests passed. A failed second write is shown as partial; retry with the same reviewed payload.

---

## 🔒 Data and credential handling

SwarmOps is built with a **Privacy First** mindset:
- **Verified account identity:** Supabase user IDs are used for ownership; incident records, audit events, and GitHub installation links are stored in PostgreSQL.
- **Separate access:** Supabase establishes identity, while the GitHub App authorizes repository operations. GitHub App private keys and short-lived installation tokens remain on the backend. The browser uses tab-scoped Supabase session storage; retired browser model-key settings are cleared.
- **Model processing:** Incident descriptions, code, and supplied evidence may be sent to the deployment-configured OpenRouter-compatible model provider. Operators must review the provider's data-handling terms; do not submit secrets or personal data unnecessarily.
- **Contribution scans:** Only canonical public GitHub repositories are supported. Bounded source snapshots are pinned to a commit; common credential patterns and sensitive file paths are filtered before model analysis, but automated redaction is not a guarantee. The scan and generated proposal are persisted for the authenticated owner. External issue/PR text and code are public once confirmed.
- **Production persistence:** Configure a PostgreSQL `DATABASE_URL` and run Alembic migrations. Incident and audit data are not stored in a JSON fallback.

---

## 🛠 Tech Stack

### Backend (AI Pipeline & API)
* **Python 3.11+**
* **FastAPI**: High-performance async web framework.
* **Socket.IO**: Real-time event streaming (`python-socketio`).
* **Pydantic**: Strict data validation.
* **OpenRouter**: The LLM engine powering the agents (dynamic client initialization per request).

### Frontend (Real-time Dashboard)
* **React + Vite**: Blazing fast frontend build tool.
* **Tailwind CSS**: Utility styling for a restrained, evidence-first engineering workspace.
* **React Router**: Public landing, authentication callback, and authenticated investigation routes.

---

## 🚀 Getting Started (Local Development)

### 1. Setup Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Setup Frontend
```bash
cd frontend
npm ci
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the build environment.
# Enable Google in Supabase Auth and allow http://localhost:8000/auth/callback.
npm run build
```

### 3. Run the Monolith
The FastAPI backend is configured to serve the compiled React frontend automatically.
```bash
cd backend
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```
Open `http://localhost:8000` after configuring Supabase Auth, PostgreSQL, CORS, the public base URL, and the Google OAuth provider/redirect URL. For local development, use the environment examples and allow the matching callback URL in Supabase. Model credentials are configured on the backend; they are not entered into the browser.

---

## ☁️ Deployment

The multi-stage Dockerfile can build a **single-container deployment**. The included `render.yaml` instead deploys the backend as a Docker web service and the React app as a separate static site.

To deploy on Render:
1. Apply the Render Blueprint from `render.yaml`, or create the backend web service and static frontend separately.
2. Configure the backend values `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_AUDIENCE`, `APP_STATE_SECRET`, and `OPENROUTER_API_KEY`. Point `PUBLIC_BASE_URL` and `CORS_ALLOWED_ORIGINS` at the frontend's public URL/origin.
3. Configure frontend build values `VITE_API_URL` (the backend URL), `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
4. For GitHub PR and contribution support, configure `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_APP_PRIVATE_KEY`. Set the GitHub App setup URL to `https://<backend-host>/api/v1/github/installation/callback`; grant Metadata read, Issues write, Contents write, and Pull requests write. Runtime tokens are further restricted to one repository and to the permission subset needed by each operation. Existing installations may need their owner to approve the new Issues permission.
5. Enable Google as a Supabase Auth provider and allow `https://<frontend-host>/auth/callback` as a redirect destination. GitHub App installation is configured separately and is not used for SwarmOps login.
6. Apply schema changes with `cd backend && alembic upgrade head` before marking the backend ready.
7. Capacity defaults are 3 concurrent investigations per process, a 5-second queue wait, and a 900-second execution deadline; tune with the matching `MAX_CONCURRENT_INVESTIGATIONS`, `INVESTIGATION_QUEUE_WAIT_SECONDS`, and `INVESTIGATION_TIMEOUT_SECONDS` environment variables.

The backend is unavailable for authenticated operations if its required JWT or database configuration is missing. Approval roles must be assigned through trusted Supabase `app_metadata.roles`; user-editable metadata is not accepted.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
