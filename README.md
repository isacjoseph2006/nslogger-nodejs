# NSLogger Node.js Server

A lightweight, custom Node.js backend server designed to seamlessly replace the official Mac [NSLogger](https://github.com/fpillet/NSLogger) Desktop Viewer. 

It implements the NSLogger Binary Protocol from scratch and uses Apple's Bonjour (mDNS) to automatically advertise its presence over your local network. Your iOS applications can instantly discover this server and begin streaming logs—no manual IP or port configuration required on the client devices!

## Features

- **Zero iOS Code Changes Required**: Leverages Bonjour (`_nslogger._tcp`) so your iOS device automatically finds the server.
- **Dynamic Port Allocation**: Defaults to port 52000 but can easily bind to any port.
- **Smart Formatting**: Converts the proprietary binary stream payload into beautiful, column-aligned logs right in your terminal.
- **Color-Coded Severity**: Automatically colors logs based on severity (e.g. Info, Warning, Error strings).
- **Multi-line Support**: Perfectly indents block messages and JSON traces without ruining the strict column-layout.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your operating system.

### Setup & Run
1. Navigate to the project directory:
   ```bash
   cd /Users/isac/Documents/ios_samples/nodejs/nslogger-nodejs
   ```
2. Install the necessary dependencies (we use `bonjour-service` for mDNS publishing):
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node nslogger.js
   ```
4. If everything is successful, you'll see:
   ```
   NSLogger server listening on 0.0.0.0:52000
   Bonjour service published: _nslogger._tcp on port 52000
   ```

## Usage

1. Start your iOS/MacOS application that leverages the `NSLogger` framework.
2. Assuming both your desktop computer and your iOS device are on the **same LAN/Wi-Fi network**, the iOS app will automatically detect this server and establish a direct connection.
3. Your terminal will begin populating with rich, beautifully colored logs.

## Troubleshooting

- **EADDRINUSE Error on macOS**: Newer versions of macOS run an **"AirPlay Receiver"** service which automatically reserves port 50000. You can disable "AirPlay Receiver" in your Mac's System Settings under `General > AirDrop & Handoff` to free up this port. Alternatively, modify `PORT` inside `nslogger.js` to 52000 or 0 (dynamic port).
