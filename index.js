const net = require('net');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { Bonjour } = require('bonjour-service');
const NSLoggerParser = require('./parser');

const PORT = 52000; // Hardcoded port as requested
const HOST = '0.0.0.0';
const WEB_PORT = 3000;

// Setup Express and Socket.IO
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`[\x1b[35mWeb\x1b[0m] Dashboard viewer connected`);
});

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
        
        // Broadcast the log message to web viewers immediately!
        io.emit('log', msg);

        // Only print actual LOG messages explicitly to the console
        if (msg.type === 0 /* LOGMSG_TYPE_LOG */) {
            // Format Timestamp
            const d = new Date((msg.timestampS || 0) * 1000 + (msg.timestampMs || 0));
            const timeStr = d.toISOString().split('T')[1].slice(0, 12); // HH:MM:SS.MMM
            
            // Fixed width Thread and Tag (Max 20 chars)
            const rawTag = `[${msg.threadId || 'Main'}${msg.tag ? `|${msg.tag}` : ''}]`;
            const threadTag = rawTag.length > 20 ? rawTag.substring(0, 17) + '...]' : rawTag.padEnd(20);

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
                    // Offset: Time(12) + Space(1) + Tag(20) + Space(1) = 34
                    const indent = '\n' + ' '.repeat(34); 
                    outputMsg += indent + lines.slice(1).join(indent);
                }
            }

            console.log(`\x1b[90m${timeStr}\x1b[0m \x1b[32m${threadTag}\x1b[0m ${color}${outputMsg}\x1b[0m`);
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

httpServer.listen(WEB_PORT, () => {
    console.log(`Web Dashboard listening on http://localhost:${WEB_PORT} \x1b[35m(Try it!)\x1b[0m`);
});

process.on('SIGINT', () => {
    console.log('\nShutting down servers...');
    server.close();
    httpServer.close();
    process.exit(0);
});
