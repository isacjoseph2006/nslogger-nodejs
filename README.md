# NSLogger Web Viewer

A modern, cross-platform Node.js alternative to the official macOS-only [NSLogger](https://github.com/fpillet/NSLogger) desktop viewer. This application operates as a background TCP server, collecting iOS logs over local WiFi via Bonjour, and instantly streams them to a gorgeous browser-based **Web Dashboard**.

It is specifically tailored with a clean, fully accessible corporate branding UI (ANZ Theme) to ensure high readability. 

## Features
- **Cross-Platform**: Run the viewer natively on Windows, Mac, or Linux using Node.js.
- **Bonjour Over TCP**: Auto-publishes itself as an `_nslogger._tcp` service. Nothing hardcoded on the iOS app!
- **Real-Time Web Dashboard**: Socket.io streams live logs to the browser in real-time.
- **Auto Launching**: Immediately launches your default browser straight to the dashboard (`http://localhost:3000`) on boot.
- **Dynamic Filtering & Search**: Cleanly filter between Debug, Warning, and Error logs. Includes live keyword search to eliminate noise.
- **Offline / Enterprise Ready**: Does not require `npm install`! Dependencies are checked into the repository intentionally so it can be deployed within secure, offline office networks.
- **Auto Port Management**: Automatically terminates existing hanging Node instances on `52000` to prevent `EADDRINUSE` port-conflict errors.

## Quick Start

### 1. Starting the Server
Since this branch has `node_modules` pre-packaged to work around local office firewall limitations, **no `npm install` is required**.

1. Clone or copy this repository to your machine.
2. Inside the project directory, run:
   ```bash
   node nslogger.js
   ```

### 2. Auto-Browser Connection
When you start the server, two things happen automatically:
- It steals port `52000` and publishes the Bonjour mDNS service.
- It automatically opens up your default web browser to: **http://localhost:3000** 

### 3. Start iOS Application
Simply build and run your iOS application that has the `NSLogger` client library installed.
The app will automatically discover `Node.js NSLogger Viewer` on the network and begin streaming connection info and logs. 

Watch the web dashboard instantly light up with your payload!

## Architecture Note
The TCP server runs quietly in the background without flooding your terminal with logs. All output formatting, decoding of binary chunks (Log Parts), multi-line indentations, and exception mapping is forwarded and handled elegantly by the HTML/CSS layout of the web frontend.

---
*Created dynamically for custom iOS log interception and dashboard visualization.*
