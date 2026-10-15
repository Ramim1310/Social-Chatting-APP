# Live Demo:
https://nexus-app13.vercel.app/

# Nexus

Nexus is a social app for private conversations, group chats, and community discussions. It combines a React frontend with an Express API, Socket.IO messaging, and PostgreSQL storage.

## Features

### Home and navigation

- A personal Home screen with recent conversations, friends, group shortcuts, and pending friend requests.
- New users start on Home. Returning users reopen their most recently selected conversation.
- Conversation history is stored per account in the current browser and survives logout.
- One consistent sidebar across Home, Messages, Forum, Discover, Requests, and Settings, plus bottom navigation on mobile.

### Messaging and connections

- Public Square, private chats between friends, and group creation with friend invitations.
- User discovery, friend requests, and online presence.
- Optimistic message sending, delivery/read indicators, typing indicators, and reconnect feedback.
- Markdown messages, quoted replies, multiline entry, and an emoji picker.
- Saved message edits and deletions, with ownership checks and real-time updates.
- Retry controls for failed messages and a conversation filter in the inbox.
- Message search across conversations or within the current room.

### Forum and live news

- Create posts, add comments, like posts, and copy post content to share.
- Search posts and filter by Gaming, Sports, Movies, Anime, or Politics.
- Sort the feed by Newest or Top.
- A Live Thread news panel backed by Google News RSS feeds for gaming, sports, anime, and movies. The server fetches news on startup and every three hours.

### Collaboration and personalization

- Room polls with live vote updates.
- Shared rich-text notes using Tiptap and Yjs, with database-backed document state.
- Room analytics with activity and contributor information.
- Profile name and avatar updates.
- Light, Dark, and OLED themes, plus high-contrast and Zen preferences.
- Optional message sounds and browser notifications, keyboard focus states, and reduced-motion support.
- Heavier notes and analytics tools load on demand.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 7, Tailwind CSS 4, Framer Motion |
| Client data | TanStack Query, Axios |
| Backend | Node.js, Express 5, Socket.IO |
| Database | PostgreSQL, Prisma 5 |
| Collaboration | Tiptap, Yjs, WebSockets |
| News | RSS Parser, node-cron |
| Authentication | JWT access tokens, refresh cookies, bcrypt |

The active database configuration uses the standard Prisma PostgreSQL client. You can use a local PostgreSQL database or a hosted PostgreSQL connection, including Neon.

## Installation

### 1. Prerequisites

Install:

- **Node.js 22.12+ or Node.js 24**, with npm. Node.js 24 was used for local verification. The Vite frontend requires Node.js 20.19+ or 22.12+; Node.js 18 is too old.
- **Git**, if cloning the repository.
- **PostgreSQL**, locally or through a hosted service, with an empty development database and its connection string.

### 2. Get the project and install dependencies

```bash
git clone https://github.com/Ramim1310/chat.git
cd chat

cd server
npm ci

cd ../client
npm ci
cd ..
```

If you already have the project, start from its root directory and skip the clone commands. There is no root-level npm start script: the client and server run separately.

On Windows PowerShell, use `npm.cmd` and `npx.cmd` in place of `npm` and `npx` if your execution policy blocks the PowerShell wrappers.

### 3. Configure environment variables

From the project root, copy the example files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

`cp` works in Bash and as a PowerShell alias. You can also copy the files manually.

Edit **server/.env**:

```dotenv
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nexus?schema=public"
ACCESS_TOKEN_SECRET="replace-with-a-long-random-access-token-secret"
REFRESH_TOKEN_SECRET="replace-with-a-different-long-random-refresh-token-secret"
CLIENT_URL="http://localhost:5173"
```

- Replace `DATABASE_URL` with your actual PostgreSQL connection string. For a hosted database, preserve any provider-required options such as `sslmode=require`.
- Replace both token-secret placeholders with different, long random values.
- Keep local credentials in `server/.env`; the example files contain placeholders only.

Edit **client/.env.local**:

```dotenv
VITE_API_URL="http://localhost:5000"
```

`VITE_API_URL` points to the backend origin without an `/api` suffix. The frontend derives both its HTTP and WebSocket connections from this URL. Variables prefixed with `VITE_` are visible in the frontend bundle; keep database credentials and token secrets on the server.

### 4. Initialize the development database

Create an empty database first. For example, if PostgreSQL's command-line tools are available:

```bash
createdb -U postgres nexus
```

For a hosted database, create it through your provider and use its connection string instead.

Then run:

```bash
cd server
npx prisma generate
npx prisma db push
cd ..
```

`prisma generate` creates the client used by the backend. `prisma db push` synchronizes the development database with [schema.prisma](server/prisma/schema.prisma).

**Database setup note:** the checked-in migrations currently cover only part of the schema. Running `prisma migrate deploy` alone will not create every table and column required by the current app. Use the schema synchronization command above for a fresh development database. For a production database, prepare and review a complete migration history before deploying schema changes; do not use destructive reset options on existing data.

### 5. Start the backend

Open a terminal in the project root:

```bash
cd server
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