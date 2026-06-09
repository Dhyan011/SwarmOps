# SwarmOps 🐝

**SwarmOps** is an advanced, multi-agent AI incident response and root-cause analysis platform. It leverages a swarm of specialized AI agents that automatically investigate backend incidents, analyze system metrics, diagnose code-level bugs, and generate deployable Git patches in real-time.

🚀 **Live Demo:** [https://swarmops-1.onrender.com](https://swarmops-1.onrender.com)

---

## 🧠 Concept & Architecture

When a production system throws an alert or an incident is reported, the traditional approach requires on-call engineers to manually sift through logs, metrics, traces, and code. SwarmOps automates this entirely using a **Sequential AI Swarm Pipeline**:

1. **Triage Agent**: Initially classifies the incident and determines severity.
2. **Log Analyzer Agent**: Scans application logs for exceptions, stack traces, and anomalies.
3. **Metrics Agent**: Analyzes CPU, Memory, and application latency metrics.
4. **Trace Agent**: Investigates distributed traces to find network bottlenecks or database deadlocks.
5. **Security Agent**: Checks if the incident is a result of a vulnerability or malicious attack.
6. **Root Cause Agent**: Synthesizes all findings from the previous agents into a definitive root cause analysis.
7. **Fix Generator Agent**: Writes the actual code to fix the bug (generates a `git` patch).
8. **Validation Agent**: Ensures the proposed fix is logical and passes basic sanity checks.

As the agents work, they stream their progress in **real-time** over WebSockets to the SwarmOps React Dashboard, giving the user a live view of the AI "thinking" through the problem.

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
        LocalStorage[(Browser localStorage)]:::storage
    end

    subgraph Server [Monolithic FastAPI Docker Container]
        subgraph FastAPI [Backend Services]
            Static[Static Asset Server]:::backend
            API[REST API Router]:::backend
            WS_Server[Socket.IO Server]:::backend
            DB[(Persistent JSON Database)]:::storage
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
    UI -- "1. OAuth Login" --> OpenRouter
    OpenRouter -- "2. Returns API Key" --> LocalStorage
    
    %% API Requests
    UI -- "3. POST /incident (X-API-Key)" --> API
    API -- "Stores Reports" --> DB
    
    %% WebSockets
    WS_Client -- "Real-time Live Feed" <--> WS_Server

    %% Server Internal Workings
    API -- "Triggers Investigation" --> Orchestrator
    Orchestrator -- "Clones repo via Git Tool" --> GitHub
    
    %% Orchestrator to Agents (Workflow)
    Orchestrator --> Agent1
    Agent1 --> Agent2 & Agent3 & Agent4 & Agent5
    Agent2 & Agent3 & Agent4 & Agent5 --> Agent6
    Agent6 --> Agent7
    Agent7 --> Agent8

    %% AI Actions
    Swarm -- "Sends Context & Prompts" --> OpenRouter
    Swarm -- "Emits Real-time Logs" --> WS_Server
    Agent7 -- "Auto-Creates PR on Approval" --> GitHub
```

## 🔒 Privacy & Data Collection

SwarmOps is built with a **Privacy First** mindset:
- **No Personal Data Stored:** We do not track users or store personal emails/passwords.
- **Secure API Key Management:** Your OpenRouter API key is securely stored in your browser's `localStorage`. The backend only receives the key via headers on a per-request basis and never saves it to the database.
- **Persistent Analytics:** Incident reports and generated patches are permanently stored in a lightweight JSON database (`data/incidents.json`) to power the Dashboard Analytics without requiring complex external database connections.

## 🛠 Tech Stack

### Backend (AI Pipeline & API)
* **Python 3.11+**
* **FastAPI**: High-performance async web framework.
* **Socket.IO**: Real-time event streaming (`python-socketio`).
* **Pydantic**: Strict data validation.
* **OpenRouter**: The LLM engine powering the agents (dynamic client initialization per request).

### Frontend (Real-time Dashboard)
* **React + Vite**: Blazing fast frontend build tool.
* **Tailwind CSS**: Utility-first styling with custom Dark Cosmic Glassmorphism UI.
* **Framer Motion**: Smooth, high-performance animations and 3D parallax effects.

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
npm install
npm run build
```

### 3. Run the Monolith
The FastAPI backend is configured to serve the compiled React frontend automatically.
```bash
cd backend
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```
Open `http://localhost:8000` in your browser. 

*Note: You do not need an `.env` file! Just click "Sign In with OpenRouter" on the local frontend to authenticate.*

## ☁️ Deployment

SwarmOps is configured as a **Single-Container Monolith** using a multi-stage Dockerfile. This means the React frontend and Python backend are built and hosted together in the exact same container.

To deploy on Render:
1. Create a new **Web Service**.
2. Connect your GitHub repository.
3. Set the **Root Directory** to `backend`.
4. Set the **Dockerfile Path** to `Dockerfile`.
5. *No environment variables are required for deployment since it uses OAuth!*

Render will automatically run the multi-stage build (compiling the React app and installing the Python dependencies) and serve the unified application.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
