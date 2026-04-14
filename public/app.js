const socket = io();

// DOM Elements
const logContainer = document.getElementById('logContainer');
const emptyState = document.getElementById('emptyState');
const statusIndicator = document.querySelector('.status-indicator');
const socketStatus = document.getElementById('socketStatus');
const clientInfo = document.getElementById('clientInfo');
const searchInput = document.getElementById('searchInput');
const filterChips = document.querySelectorAll('.filter-chip');
const clearBtn = document.getElementById('clearBtn');

// State
let currentlyConnected = false;
let currentFilterLevel = 'all'; // all, 1, 2, 4
let currentSearchQuery = '';

// Socket Handlers
socket.on('connect', () => {
    statusIndicator.classList.add('connected');
    socketStatus.textContent = 'Server Connected';
});

socket.on('disconnect', () => {
    statusIndicator.classList.remove('connected');
    socketStatus.textContent = 'Disconnected...';
});

socket.on('sysinfo', (data) => {
    const mdnsNameSpan = document.querySelector('.mdns-name');
    if (mdnsNameSpan) {
        mdnsNameSpan.innerHTML = `Hostname: <strong>${data.hostname}</strong>`;
    }
});

socket.on('log', (msg) => {
    // Hide empty state on first message
    if (!currentlyConnected) {
        currentlyConnected = true;
        emptyState.style.display = 'none';
        clientInfo.textContent = 'Client Active';
    }

    if (msg.type === 0) { // LOGMSG_TYPE_LOG
        appendLog(msg);
    } else if (msg.type === 3) { // LOGMSG_TYPE_CLIENTINFO
        const infoString = Object.values(msg.parts || {}).join(' ');
        clientInfo.textContent = `Client: ${infoString}`;
    }
});

// Logic
function appendLog(msg) {
    const d = new Date((msg.timestampS || 0) * 1000 + (msg.timestampMs || 0));
    const timeStr = d.toISOString().split('T')[1].slice(0, 12);
    
    const threadTag = `[${msg.threadId || 'Main'}${msg.tag ? `|${msg.tag}` : ''}]`;
    
    let content = '';
    if (msg.message && typeof msg.message === 'object' && msg.message.type === 'Buffer') {
        content = `<Binary Data: ${msg.message.data.length} bytes>`;
    } else {
        content = msg.message || '';
    }

    // Determine Level class
    let levelClass = 'level-1'; // Default
    if (msg.level >= 4) levelClass = 'level-4';
    else if (msg.level >= 2) levelClass = 'level-2';
    else if (msg.level === 0) levelClass = 'level-0';

    const row = document.createElement('div');
    row.className = `log-row ${levelClass}`;
    
    row.dataset.level = msg.level || 0;
    row.dataset.searchtext = `${threadTag} ${content}`.toLowerCase();

    row.innerHTML = `
        <div class="col col-time">${timeStr}</div>
        <div class="col col-thread" title="${threadTag}">${threadTag}</div>
        <div class="col col-msg">${escapeHtml(content)}</div>
    `;

    applyFiltersToRow(row);
    
    // Check if user is near the bottom BEFORE we add the new row
    const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 100;

    logContainer.appendChild(row);

    // Auto-scroll only if they were already at the bottom
    if (isAtBottom) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Filtering
searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase();
    refilterAll();
});

filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilterLevel = chip.dataset.level;
        refilterAll();
    });
});

clearBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
    logContainer.appendChild(emptyState);
    currentlyConnected = false;
    emptyState.style.display = 'flex';
    clientInfo.textContent = 'No active client';
});

function refilterAll() {
    const rows = document.querySelectorAll('.log-row');
    rows.forEach(row => applyFiltersToRow(row));
}

function applyFiltersToRow(row) {
    const isSearchMatch = currentSearchQuery === '' || row.dataset.searchtext.includes(currentSearchQuery);
    
    const level = parseInt(row.dataset.level) || 0;
    let isLevelMatch = true;
    
    if (currentFilterLevel !== 'all') {
        const filterTarget = parseInt(currentFilterLevel);
        if (filterTarget === 1 && level > 1) isLevelMatch = false;
        if (filterTarget === 2 && (level < 2 || level >= 4)) isLevelMatch = false;
        if (filterTarget === 4 && level < 4) isLevelMatch = false;
    }

    row.style.display = isSearchMatch && isLevelMatch ? 'flex' : 'none';
}
