/**
 * TradeX Pro | Runtime Operations Center Logic
 */

let socket;
let latencyChart;
let historyData = {
    latency: [],
    aiInference: [],
    labels: []
};

const UI = {
    auditLedger: document.getElementById('auditLedger'),
    workerGrid: document.getElementById('workerGrid'),
    workerCount: document.getElementById('workerCount'),
    treeContainer: document.getElementById('treeContainer'),
    restartLedger: document.getElementById('restartLedger'),
    memPressure: document.getElementById('memPressure'),
    evtThroughput: document.getElementById('evtThroughput'),
    bbPrice: document.getElementById('bbPrice'),
    bbPos: document.getElementById('bbPos'),
    bbBreakers: document.getElementById('bbBreakers'),
    uptime: document.getElementById('systemUptime'),
    wsStatus: document.getElementById('wsStatus'),
    indicators: {
        redis: document.querySelector('#redisStatus .indicator'),
        qdrant: document.querySelector('#qdrantStatus .indicator'),
        questdb: document.querySelector('#questDbStatus .indicator'),
        eventbus: document.querySelector('#eventBusStatus .indicator')
    }
};

const startTime = Date.now();

function init() {
    setupCharts();
    connectWS();
    startUptimeTimer();
}

function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/trading`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        UI.wsStatus.innerText = 'Connected';
        UI.wsStatus.style.color = '#10b981';
        logLedger('Orchestrator', 'Ops Link Established', 'INFO');
    };

    socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        handleMessage(payload);
    };

    socket.onclose = () => {
        UI.wsStatus.innerText = 'Offline';
        UI.wsStatus.style.color = '#ef4444';
        setTimeout(connectWS, 3000);
    };
}

function handleMessage(msg) {
    if (msg.type === 'runtime_health_update') {
        updateOpsMetrics(msg);
    } else if (msg.type === 'audit_event') {
        logLedger(msg.data.eventType, msg.data.data.msg || JSON.stringify(msg.data.data), msg.data.severity);
        updateServiceIndicators(msg.data);
    }
}

function updateOpsMetrics(msg) {
    const { health, metrics, ops, tree } = msg;

    // 1. Header & Stats
    UI.memPressure.innerText = `${ops.memoryPressure.toFixed(1)}%`;
    UI.evtThroughput.innerText = `${ops.eventThroughput || 0}/s`;
    
    // 2. Blackboard
    UI.bbPrice.innerText = ops.blackboardSummary.price;
    UI.bbPos.innerText = ops.blackboardSummary.activePositions;
    UI.bbBreakers.innerText = ops.blackboardSummary.circuitBreakers;

    // 3. Worker Fleet
    updateWorkerGrid(health);

    // 4. Restart Ledger
    updateRestartLedger(ops.restartCounts);

    // 5. Latency Chart
    const avgLatency = Object.values(health).reduce((acc, h) => acc + (h.latencyMs || 0), 0) / Object.keys(health).length || 0;
    const aiInference = Object.values(health)
        .filter(h => h.type === 'ai_analytics')
        .reduce((acc, h) => acc + (h.latencyMs || 0), 0) / 1 || 0;
        
    updateCharts(avgLatency, aiInference);

    // 6. Tree
    if (tree) updateTree(tree);
}

function updateWorkerGrid(healthMap) {
    const workers = Object.entries(healthMap);
    UI.workerCount.innerText = `${workers.length} ACTIVE`;
    
    workers.forEach(([id, h]) => {
        let card = document.getElementById(`w-${id}`);
        if (!card) {
            card = document.createElement('div');
            card.id = `w-${id}`;
            card.className = 'worker-card';
            UI.workerGrid.appendChild(card);
        }
        card.innerHTML = `
            <div style="font-size:0.6rem; color:#6b7280">${id.substring(0,8)}</div>
            <div style="font-size:0.8rem; font-weight:600">${h.type}</div>
            <div class="cpu-bar-container"><div class="cpu-bar" style="width:${h.cpu}%"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:0.65rem">
                <span>CPU: ${h.cpu.toFixed(1)}%</span>
                <span>${h.latencyMs || 0}ms</span>
            </div>
        `;
    });
}

function updateRestartLedger(counts) {
    Object.entries(counts).forEach(([id, count]) => {
        if (count > 0) {
            let entry = document.getElementById(`restart-${id}`);
            if (!entry) {
                entry = document.createElement('div');
                entry.id = `restart-${id}`;
                UI.restartLedger.appendChild(entry);
            }
            entry.innerHTML = `<span style="color:#f59e0b">●</span> ${id.substring(0,8)}... restarted ${count} times`;
        }
    });
}

function updateTree(tree) {
    UI.treeContainer.innerHTML = '';
    
    // Root
    const root = createNode('ROOT SUPERVISOR', 'PID: Master', '5%', '42%', 'root-node');
    UI.treeContainer.appendChild(root);

    // Market Supervisor
    const market = createNode('MARKET SUPERVISOR', 'Policy: 1-for-1', '35%', '20%', 'supervisor-node');
    UI.treeContainer.appendChild(market);
    tree.market.forEach((id, i) => {
        UI.treeContainer.appendChild(createNode('AGENT', id.substring(0,6), '70%', `${10 + i*10}%`, 'leaf-node'));
    });

    // Execution Supervisor
    const exec = createNode('EXECUTION SUPERVISOR', 'Policy: 1-for-1', '35%', '65%', 'supervisor-node');
    UI.treeContainer.appendChild(exec);
    tree.execution.forEach((id, i) => {
        UI.treeContainer.appendChild(createNode('AGENT', id.substring(0,6), '70%', `${55 + i*10}%`, 'leaf-node'));
    });
}

function createNode(label, sub, top, left, cls) {
    const div = document.createElement('div');
    div.className = `tree-node ${cls}`;
    div.style.top = top;
    div.style.left = left;
    div.innerHTML = `<div style="font-weight:700">${label}</div><div style="font-size:0.6rem; opacity:0.6">${sub}</div>`;
    return div;
}

function updateCharts(latency, ai) {
    const ts = new Date().toLocaleTimeString();
    historyData.labels.push(ts);
    historyData.latency.push(latency);
    historyData.aiInference.push(ai);

    if (historyData.labels.length > 30) {
        historyData.labels.shift();
        historyData.latency.shift();
        historyData.aiInference.shift();
    }
    latencyChart.update('none');
}

function setupCharts() {
    const ctx = document.getElementById('latencyChart').getContext('2d');
    latencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historyData.labels,
            datasets: [
                {
                    label: 'Exec Latency',
                    data: historyData.latency,
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'AI Inference',
                    data: historyData.aiInference,
                    borderColor: '#00f2ff',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, labels: { color: '#6b7280', boxWidth: 10, font: { size: 10 } } } },
            scales: {
                x: { display: false },
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#4b5563', font: { size: 9 } }
                }
            }
        }
    });
}

function logLedger(type, msg, severity) {
    const line = document.createElement('div');
    line.className = `terminal-line severity-${severity}`;
    const ts = new Date().toLocaleTimeString();
    line.innerHTML = `<span style="opacity:0.4; font-size:0.6rem">${ts}</span> [${type}] ${msg}`;
    UI.auditLedger.prepend(line);
    if (UI.auditLedger.children.length > 100) UI.auditLedger.removeChild(UI.auditLedger.lastChild);
}

function updateServiceIndicators(event) {
    const s = event.eventType.toLowerCase();
    const status = event.severity === 'ERROR' ? 'offline' : 'online';
    if (s.includes('redis')) {
        setInd('redis', status);
        setInd('eventbus', status); // EventBus depends on Redis for durability
    }
    if (s.includes('qdrant')) setInd('qdrant', status);
    if (s.includes('questdb')) setInd('questdb', status);
}

function setInd(service, status) {
    const el = UI.indicators[service];
    if (el) el.className = `indicator status-${status}`;
}

function startUptimeTimer() {
    setInterval(() => {
        const diff = Date.now() - startTime;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        UI.uptime.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

init();
