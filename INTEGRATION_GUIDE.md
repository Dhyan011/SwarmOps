# Frontend-Backend Integration Guide

## Architecture Overview

**SwarmOps** is a full-stack incident response platform:
- **Backend**: FastAPI server (Python) - Orchestrates AI agents for incident analysis
- **Frontend**: React + Vite (TypeScript) - Interactive UI for incident investigation
- **Communication**: RESTful API + WebSockets (Socket.IO)

## API Endpoints

### Core Incident Analysis
```
POST /api/v1/alert
- Description: Submit an incident alert for analysis
- Request Body (AlertModel):
  {
    "incident_id": "INC-20240612-0047",
    "service": "UserService",
    "severity": "P1",
    "alert_type": "memory_leak",
    "alert_message": "Memory usage growing rapidly",
    "time_window": "15m",
    "environment": "production",
    "alert_time": "2024-06-12T10:30:00Z"
  }
- Response (IncidentReport):
  {
    "incident_id": "INC-20240612-0047",
    "root_cause_agent": "LogAgent",
    "root_cause_service": "UserService",
    "root_cause_summary": "Memory leak in object allocation",
    "confidence": "high",
    "confidence_reason": "Consistent signals from logs and metrics",
    "timeline": [...],
    "evidence": [...],
    "recommended_fix": "Restart service and deploy patched version",
    "agents_unavailable": []
  }

POST /api/v1/analyze_target
- Description: Analyze a GitHub repository or live website
- Request Body (TargetRequest):
  {
    "target_url": "https://github.com/owner/repo",
    "target_type": "repo" | "live"
  }
- Response: Same as /api/v1/alert response
```

## Setup Instructions

### Backend Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Add your OpenRouter API key
   echo "OPENROUTER_API_KEY=your_key_here" >> .env
   ```

3. **Start the backend server:**
   ```bash
   cd backend
   uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
   ```
   Backend runs at: `http://localhost:8000`

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Default: VITE_API_URL=http://localhost:8000
   ```

3. **Start development server:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173`

### Target Server Setup (Optional)

The target server simulates a production service with metrics:

```bash
cd target-server
npm install
node index.js
# Runs at: http://localhost:4000
# Exposes: /metrics, /logs endpoints
```

## Frontend-Backend Data Flow

### Incident Submission Flow

1. **User submits incident** in `IncidentInput.jsx`
   - Code snippet, severity level, programming language

2. **Navigate to Dashboard** via `IncidentAnalysisPage.jsx`
   - Frontend calls `/api/v1/alert` with alert payload
   - Backend orchestrates agents (Log, Metric, Trace, Config, KB)

3. **Display Results** 
   - Backend returns `IncidentReport` with root cause analysis
   - Frontend displays timeline, evidence, and recommendations

4. **Approve Fix** in `AutoFixPage.jsx`
   - Frontend can trigger deployment (integrated with CI/CD)

## Key Integration Points

### API Client Configuration
File: `src/api/client.js`
- Configures axios to communicate with backend
- Intercepts responses for error handling
- Uses `VITE_API_URL` environment variable

### Incident Services
File: `src/api/incidents.js`
- `submitIncident(alertPayload)` - Send alert to backend
- `analyzeTarget(targetRequest)` - Analyze repo/website
- `getIncidentReport(incidentId)` - Fetch specific report

### Incident Context
File: `src/IncidentContext.jsx`
- Manages global incident state
- Handles loading, error, and report states
- Used across pages for data sharing

## Environment Configuration

### Development
```
Backend:  http://localhost:8000
Frontend: http://localhost:5173
Target:   http://localhost:4000
```

### Production
Update `VITE_API_URL` to point to deployed backend:
```bash
VITE_API_URL=https://api.swarmops.com
```

## Troubleshooting

### CORS Issues
Backend has CORS middleware enabled for all origins. If issues persist:
```python
# In backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Specify frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API Connection Errors
1. Verify backend is running: `curl http://localhost:8000/docs`
2. Check `VITE_API_URL` in frontend `.env`
3. View browser console for detailed error messages
4. Check backend logs for server-side errors

### WebSocket Connection
Socket.IO is mounted on the same FastAPI instance. Frontend can connect:
```javascript
import io from 'socket.io-client';
const socket = io('http://localhost:8000');
```

## Testing the Integration

1. Start backend: `uvicorn main:socket_app --port 8000`
2. Start frontend: `npm run dev`
3. Open `http://localhost:5173`
4. Click "Start AI Investigation" with sample code
5. Observe real-time agent execution
6. View incident report with root cause analysis

## File Structure

```
SwarmOps/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── models/
│   │   ├── alert.py           # AlertModel schema
│   │   └── report.py          # IncidentReport schema
│   ├── orchestrator/
│   │   └── orchestrator.py    # Agent orchestration logic
│   ├── agents/                # Individual agent implementations
│   ├── tools/                 # Agent tools (logs, metrics, kb)
│   ├── database/
│   │   └── db.py             # ChromaDB knowledge base
│   └── websocket/
│       └── ws_manager.py      # Socket.IO manager
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js      # Axios client
│   │   │   └── incidents.js   # API services
│   │   ├── pages/             # Page components
│   │   └── IncidentContext.jsx # Global state
│   └── vite.config.js
└── target-server/             # Mock target for testing
```

## Next Steps

1. **Configure Agent Models**: Update model selections in `backend/config/settings.py`
2. **Add Real Data Sources**: Integrate actual log aggregation, metrics, and trace systems
3. **Implement Deployment**: Add CI/CD integration for automated fixes
4. **Enhance UI**: Add real-time updates via WebSocket
5. **Add Authentication**: Secure API endpoints with JWT tokens
