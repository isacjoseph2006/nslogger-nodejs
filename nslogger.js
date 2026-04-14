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

    // Notify Web Dashboard of Connection
    io.emit('log', {
        type: 0, level: 1, threadId: 'System', tag: 'Network',
        timestampS: Math.floor(Date.now() / 1000), timestampMs: Date.now() % 1000,
        message: `[+] Client connected: ${clientId}`
    });

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
        
        // Notify Web Dashboard
        io.emit('log', {
            type: 0, level: 2, threadId: 'System', tag: 'Network',
            timestampS: Math.floor(Date.now() / 1000), timestampMs: Date.now() % 1000,
            message: `[-] Client disconnected: ${clientId}`
        });
    });

    socket.on('error', (err) => {
        console.error(`\n[\x1b[31mx\x1b[0m] Socket Error from ${clientId}:`, err.message);
        activeClients.delete(clientId);
        
        // Notify Web Dashboard
        io.emit('log', {
            type: 0, level: 4, threadId: 'System', tag: 'Network',
            timestampS: Math.floor(Date.now() / 1000), timestampMs: Date.now() % 1000,
            message: `[x] Socket error from ${clientId}: ${err.message}`
        });
    });

    parser.on('message', (msg) => {
        
        // Broadcast the log message to web viewers immediately!
        io.emit('log', msg);

        // Only print actual LOG messages explicitly to the console
        if (msg.type === 0 /* LOGMSG_TYPE_LOG */) {
            // Keep the terminal clean since the dashboard handles the heavy rendering
            console.log(`[\x1b[36m>\x1b[0m] Log message received and forwarded to Web Dashboard`);
        } else if (msg.type === 3 /* LOGMSG_TYPE_CLIENTINFO */) {
            console.log(`\n[\x1b[34mi\x1b[0m] Client Info: ${Object.values(msg.parts).join(' ')}`);
        }
    });
});

const { execSync } = require('child_process');

function killPort(port) {
    try {
        const pid = execSync(`lsof -ti :${port}`).toString().trim();
        if (pid) {
            console.log(`[\x1b[33m!\x1b[0m] Port ${port} is already in use by PID ${pid}. Terminating process...`);
            execSync(`kill -9 ${pid}`);
            execSync('sleep 0.5'); // Give the OS time to release the socket
        }
    } catch (err) {
        // lsof throws an error if no process is found, which is exactly what we want!
    }
}

// Ensure our ports are free before binding
killPort(PORT);
killPort(WEB_PORT);

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
    const url = `http://localhost:${WEB_PORT}`;
    console.log(`Web Dashboard listening on ${url}`);
    try {
        execSync(`open ${url}`); // Automatically opens default browser on macOS
    } catch (err) {
        console.error(`Could not automatically open browser. Navigate manually to ${url}`);
    }
});

process.on('SIGINT', () => {
    console.log('\nShutting down servers...');
    server.close();
    httpServer.close();
    process.exit(0);
});
