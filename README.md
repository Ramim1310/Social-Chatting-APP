# Live Demo:
https://nexus-app13.vercel.app/

# Nexus

A high-performance real-time social platform combining persistent community forums with low-latency WebSocket messaging.

## Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React, Vite, Tailwind CSS | SPA architecture with hardware-accelerated animations (Framer Motion) and optimistic state management (React Query). |
| **Backend** | Node.js, Express, Socket.io | Event-driven server handling RESTful APIs and bidirectional real-time data streams. |
| **Database** | PostgreSQL (Neon DB), Prisma | Relational data persistence with connection pooling optimized for serverless environments. |

## Core Features

*   **Real-Time Bi-directional Messaging**
    *   *Technical implementation:* Built on `Socket.io`, utilizing room-based namespaces for public and private channels. Implements localized state reconciliation to handle out-of-order message delivery and network drops.
*   **Optimistic UI Reconciliation**
    *   *Technical implementation:* Leverages `React Query` mutations to instantly reflect user actions (likes, sending messages, polling) on the client, gracefully rolling back state if the server validation fails.
*   **Event-Driven Presence System**
    *   *Technical implementation:* In-memory tracking of connected socket clients mapped to database user IDs. Broadcasts typing indicators and online/offline statuses with localized debounce to prevent network flood.
*   **Asynchronous Community Feed & Cron Jobs**
    *   *Technical implementation:* Integrates `node-cron` with `rss-parser` to periodically fetch and parse remote data feeds on a background thread, mitigating main event loop blocking. 

## Key Technical Challenges & Solutions

### 1. Connection Pooling with Serverless PostgreSQL (Neon DB)
**The Challenge:** Traditional PostgreSQL struggles with the rapid connection cycling typical of serverless or highly concurrent WebSocket environments, often leading to connection exhaustion.

**The Solution:** Integrated `@prisma/adapter-neon` with `@neondatabase/serverless` to utilize WebSocket-based database connections. This ensures connection multiplexing and significantly reduces the overhead of establishing new TCP connections during high-traffic message broadcasting.

### 2. State Synchronization Across WebSocket Reconnections
**The Challenge:** Users on unstable mobile networks experience brief disconnects. Resyncing chat state without pulling the entire message history is critical for bandwidth and performance.

**The Solution:** Implemented client-side caching via React Query combined with a temporary ID (`tempId`) system for optimistic message delivery. Upon reconnection, the client only fetches deltas, and the server deduplicates incoming messages using the `tempId` signature.

### 3. XSS Prevention in a Rich Text Environment
**The Challenge:** Supporting rich markdown, collaborative notes, and user-generated content opens vectors for Cross-Site Scripting (XSS).

**The Solution:** Implemented a robust dual-layer sanitization pipeline. The backend utilizes a recursive traversal middleware leveraging the `xss` library to sanitize all string primitives in `req.body`, `req.query`, and `req.params`. The frontend enforces strict DOM purification during Markdown rendering.

## Local Environment Setup

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL database (or a Neon DB connection string)

### Installation Guide

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ramim1310/chat.git
   cd chat
   ```

2. **Server Setup:**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   DATABASE_URL="postgres://user:password@host/dbname"
   ACCESS_TOKEN_SECRET="your_access_secret"
   REFRESH_TOKEN_SECRET="your_refresh_secret"
   CLIENT_URL="http://localhost:5173"
   ```
   Run database migrations and start the server:
   ```bash
   npx prisma db push
   npm run dev
   ```

3. **Client Setup:**
   ```bash
   cd ../client
   npm install
   ```
   Create a `.env.local` file in the `client` directory:
   ```env
   VITE_API_URL="http://localhost:5000"
   ```
   Start the Vite development server:
   ```bash
   npm run dev
   ```

## Security & Best Practices
*   **Authentication & Authorization:** Secure, stateless authentication utilizing short-lived JWT access tokens paired with HttpOnly, Secure-flagged refresh cookies to mitigate XSS and CSRF token extraction.
*   **Data Sanitization:** Global recursive XSS sanitization middleware intercepts all incoming requests to clean malicious payloads before they hit business logic.
*   **SQL Injection Prevention:** Strict usage of Prisma ORM's parameterized query builder ensures all dynamic user input is properly escaped at the database driver level.
*   **CORS Configuration:** Strictly typed origin arrays filtering allowed domains, dynamically stripping trailing slashes to prevent arbitrary domain mirroring.
