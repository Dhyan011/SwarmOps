# SwarmOps 🐝

**SwarmOps** is an advanced, multi-agent AI incident response and root-cause analysis platform. It leverages a swarm of specialized AI agents that automatically investigate backend incidents, analyze system metrics, diagnose code-level bugs, and generate deployable Git patches in real-time.

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

## 🛠 Tech Stack

### Backend (AI Pipeline & API)
* **Python 3.11+**
* **FastAPI**: High-performance async web framework for the API and WebSocket server.
* **Socket.IO**: Real-time event streaming.
* **OpenRouter / AsyncOpenAI**: The LLM engine powering the agents (configurable to use Claude, GPT-4, etc.).
* **Docker**: Containerized deployment environment with `git` built-in.

### Frontend (Real-time Dashboard)
* **React + Vite**: Blazing fast frontend build tool.
* **Tailwind CSS**: Utility-first styling for a sleek, modern, glassmorphism UI.
* **Framer Motion**: Smooth, high-performance animations and layout transitions.
* **Socket.IO-Client**: Listening to live agent events.

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
```ini
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Run the FastAPI server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Deployment
The project includes a `render.yaml` Blueprint for one-click deployment on [Render](https://render.com). Simply connect your GitHub repository and Render will automatically spin up the containerized FastAPI backend and the static Vite frontend.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
