const express = require('express');
const cors = require('cors');

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// State for chaos testing
let memoryLeak = false;
let ddos = false;
let dbTimeout = false;
let crashed = false;

// Mock logs array
const mockLogs = [];
const addLog = (level, message, service = 'payment_gateway') => {
    mockLogs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        service
    });
    if (mockLogs.length > 50) mockLogs.shift();
};

app.get('/health', (req, res) => {
    if (crashed) return res.status(503).json({ status: 'DOWN', error: 'Service Unavailable' });
    if (ddos) {
        // simulate massive latency
        setTimeout(() => res.json({ status: 'UP', uptime: process.uptime() }), 5000);
        return;
    }
    res.json({ status: 'UP', uptime: process.uptime() });
});

app.get('/metrics', (req, res) => {
    if (crashed) return res.status(503).json({ error: 'Service Unavailable' });
    
    // Normal baseline metrics
    let cpu = 15 + Math.random() * 10;
    let memory = 40 + Math.random() * 5;
    let responseTime = 45 + Math.random() * 20;
    let errorRate = Math.random() * 0.1;

    // Apply chaos modifiers
    if (memoryLeak) {
        memory = Math.min(99, 40 + (Date.now() % 60000) / 1000); // Ramps up over 60s
        if (memory > 85) cpu += 30; // GC thrashing
    }
    if (ddos) {
        cpu = Math.min(99, cpu + 60);
        responseTime = 1500 + Math.random() * 3000;
        errorRate = 15 + Math.random() * 10;
    }
    if (dbTimeout) {
        responseTime = 800 + Math.random() * 400;
        errorRate = 5 + Math.random() * 5;
    }

    res.json({
        cpu_percentage: cpu,
        memory_percentage: memory,
        response_time_ms: responseTime,
        error_rate_percentage: errorRate,
        timestamp: new Date().toISOString()
    });
});

app.get('/logs', (req, res) => {
    if (crashed) return res.status(503).json({ error: 'Service Unavailable' });
    
    // Generate some contextual logs just in time
    addLog('INFO', 'Health check OK', 'api_gateway');
    
    if (memoryLeak) addLog('WARN', 'High heap memory usage detected. GC overhead limit near', 'payment_gateway');
    if (ddos) addLog('ERROR', 'Rate limit exceeded for IP range', 'auth_service');
    if (dbTimeout) addLog('ERROR', 'Connection pool timeout waiting for available connection', 'database');
    
    res.json(mockLogs);
});

// Chaos endpoints
app.post('/trigger/memory-leak', (req, res) => {
    memoryLeak = true;
    addLog('WARN', 'Simulated memory leak started', 'payment_gateway');
    res.json({ message: 'Memory leak triggered' });
});

app.post('/trigger/ddos', (req, res) => {
    ddos = true;
    addLog('WARN', 'Simulated DDoS attack started', 'api_gateway');
    res.json({ message: 'DDoS triggered' });
});

app.post('/trigger/db-timeout', (req, res) => {
    dbTimeout = true;
    addLog('WARN', 'Simulated DB timeout started', 'database');
    res.json({ message: 'DB timeout triggered' });
});

app.post('/trigger/crash', (req, res) => {
    crashed = true;
    res.json({ message: 'Service crashed' });
});

app.post('/trigger/reset', (req, res) => {
    memoryLeak = false;
    ddos = false;
    dbTimeout = false;
    crashed = false;
    res.json({ message: 'All systems normal' });
});

app.listen(port, () => {
    console.log(`Target Server running on http://localhost:${port}`);
    // add some initial logs
    for (let i = 0; i < 10; i++) {
        addLog('INFO', 'System operating normally');
    }
});
