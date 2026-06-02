# 🐝 SwarmOps

**SwarmOps** is an autonomous, multi-agent AI system built to instantly debug, analyze, and root-cause software incidents. Instead of manually digging through logs and metrics during an outage, SwarmOps unleashes a swarm of specialized AI agents that collaborate to investigate any target (live websites or GitHub repositories) and synthesize a comprehensive Incident Report.

---

## ✨ Features

- **Dynamic Target Scanning:** Simply feed the swarm a Live Website URL or a public GitHub Repository. The agents will automatically fetch the HTML, read HTTP headers, analyze repo metadata, and read source files.
- **7 Specialized AI Personas:**
  1. **LogAgent:** Scans and pattern-matches application logs.
  2. **MetricAgent:** Analyzes time-series data and spots statistical anomalies.
  3. **TraceAgent:** Traces distributed requests to find bottlenecks and timeouts.
  4. **VisualAgent:** Uses a headless browser to scrape live websites or take dashboard screenshots to visually spot UI errors.
  5. **ConfigAgent:** Analyzes GitHub repositories for recent commits, language stats, and configuration drift.
  6. **KBAgent:** Retrieves matching runbooks and past incidents from a ChromaDB knowledge base.
  7. **SecurityAgent:** Hunts for missing HTTP security headers on live sites and exposed `.env` secrets or outdated dependencies in GitHub repos.
- **Cost-Efficient Orchestration:** Implements sequential agent execution to bypass rate limits on free-tier LLMs (like OpenRouter's Llama 3.3).
- **Auto-Synthesized Root Cause Analysis:** A dedicated "Manager" agent aggregates the raw findings from the swarm and compiles a structured JSON RCA report.

---

## 🏗️ Architecture

- **Framework:** FastAPI (Python)
- **AI Orchestration:** PyAutoGen
- **LLM Provider:** OpenRouter (OpenAI-compatible)
- **Scraping & Tooling:** Playwright (async), BeautifulSoup4, httpx
- **Vector DB:** ChromaDB (for Knowledge Base runbooks)

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.11+
- Node.js (if you want to run the dummy local target server)

### 2. Backend Setup
Clone the repository and install the dependencies:
```bash
git clone https://github.com/Dhyan011/SwarmOps.git
cd SwarmOps/backend

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
playwright install chromium
```

### 3. Environment Variables
Create a `.env` file in the `backend` directory:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 4. Run the API
Start the FastAPI server:
```bash
export PYTHONPATH=$PWD
uvicorn main:app --port 8000 --reload
```

---

## 📡 API Usage

### Analyze a Target
To unleash the Swarm, send a POST request to the `/api/v1/analyze_target` endpoint.

**Request:**
```bash
curl -X POST http://localhost:8000/api/v1/analyze_target \
     -H "Content-Type: application/json" \
     -d '{
           "target_url": "https://github.com/microsoft/autogen",
           "target_type": "repo"
         }'
```

**Response:** (Wait ~2 minutes for the Swarm to finish investigating)
```json
{
  "incident_id": "TARGET-20260602-abcdef",
  "root_cause_analysis": {
    "summary": "...",
    "severity": "P1",
    "contributing_factors": ["..."],
    "recommended_actions": ["..."]
  }
}
```

*Note: The `target_type` can be either `"repo"` (for GitHub repositories) or `"live"` (for generic websites).*

---

## 🛠️ Roadmap (Upcoming)
- **High-Contrast 3D Frontend:** A React Three Fiber + Framer Motion UI that visually renders the AI agents as orbiting 3D spheres while they investigate the target.
- **Real-Time WebSockets:** Stream agent thoughts and tool executions directly to the frontend instead of waiting for a single synchronous HTTP response.
