const net = require('net');
const { Bonjour } = require('bonjour-service');
const NSLoggerParser = require('./parser');

const PORT = 52000; // Hardcoded port as requested
const HOST = '0.0.0.0';

// Store all active client components
const activeClients = new Map();

const server = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n[\x1b[32m+\x1b[0m] Client connected: ${clientId}`);

    const parser = new NSLoggerParser();
    activeClients.set(clientId, { socket, parser });

    socket.on('data', (data) => {
        try {
            parser.addData(data);
        } catch (err) {
            console.error(`\n[\x1b[31mx\x1b[0m] Parser crash for ${clientId}:`, err.message);
        }
    });

    socket.on('end', () => {
        console.log(`\n[\x1b[31m-\x1b[0m] Client disconnected: ${clientId}`);
        activeClients.delete(clientId);
    });

    socket.on('error', (err) => {
        console.error(`\n[\x1b[31mx\x1b[0m] Socket Error from ${clientId}:`, err.message);
        activeClients.delete(clientId);
    });

    parser.on('message', (msg) => {
        // Only print actual LOG messages
        if (msg.type === 0 /* LOGMSG_TYPE_LOG */) {

            // Format Timestamp
            const d = new Date((msg.timestampS || 0) * 1000 + (msg.timestampMs || 0));
            const timeStr = d.toISOString().split('T')[1].slice(0, 12); // HH:MM:SS.MMM
            
            // Fixed width Thread and Tag (Max 20 chars)
            const rawTag = `[${msg.threadId || 'Main'}${msg.tag ? `|${msg.tag}` : ''}]`;
            const threadTag = rawTag.length > 20 ? rawTag.substring(0, 17) + '...]' : rawTag.padEnd(20);
            
            // Fixed width Location (Max 25 chars)
            const fileBase = msg.filename ? msg.filename.split('/').pop() : '';
            const rawLoc = fileBase ? `${fileBase}:${msg.lineNumber || '?'}` : '';
            const locationStr = rawLoc.length > 25 ? rawLoc.substring(0, 22) + '...' : rawLoc.padEnd(25);

            // Determine Message Color based on Level
            // Typically: 0-1 (Debug/Info), 2-3 (Warning), 4+ (Error)
            let color = '\x1b[0m'; // Default
            if (msg.level >= 4) color = '\x1b[31m'; // Red for Errors
            else if (msg.level >= 2) color = '\x1b[33m'; // Yellow for Warnings
            else if (msg.level === 1) color = '\x1b[36m'; // Cyan for Info/Debug

            // Format message and properly indent multi-line strings
            let outputMsg = '';
            if (Buffer.isBuffer(msg.message)) {
                outputMsg = `<Binary Data: ${msg.message.length} bytes>`;
            } else if (msg.message) {
                const lines = msg.message.trim().split('\n');
                outputMsg = lines[0];
                if (lines.length > 1) {
                    // Offset: Time(12) + Space(1) + Tag(20) + Space(1) + Loc(25) + Space(1) = 60
                    const indent = '\n' + ' '.repeat(60); 
                    outputMsg += indent + lines.slice(1).join(indent);
                }
            }

            console.log(`\x1b[90m${timeStr}\x1b[0m \x1b[32m${threadTag}\x1b[0m \x1b[90m${locationStr}\x1b[0m ${color}${outputMsg}\x1b[0m`);
        } else if (msg.type === 3 /* LOGMSG_TYPE_CLIENTINFO */) {
            console.log(`\n[\x1b[34mi\x1b[0m] Client Info: ${Object.values(msg.parts).join(' ')}`);
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`NSLogger server listening on ${HOST}:${PORT}`);

    // Publish Bonjour service
    const bonjour = new Bonjour();
    bonjour.publish({
        name: 'Node.js NSLogger Viewer',
        type: 'nslogger',
        protocol: 'tcp',
        port: PORT
    });
    console.log(`Bonjour service published: _nslogger._tcp on port ${PORT}`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        process.exit(0);
    });
});
