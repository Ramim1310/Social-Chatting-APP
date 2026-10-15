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

The API starts at [http://localhost:5000](http://localhost:5000). Successful startup includes a database connection confirmation. Opening the backend URL returns a short health-check message.

### 6. Start the frontend

Keep the backend terminal running. Open a second terminal in the project root:

```bash
cd client
npm run dev -- --port 5173 --strictPort
```

Open [http://localhost:5173](http://localhost:5173), create an account, and explore Home. Use Discover to find another user, connect through Requests, and start a private chat. Public Square is available immediately from Home or Messages.

Use the same hostname for both local services, such as `localhost` for both, so refresh-cookie behavior remains consistent. Stop either service with `Ctrl+C` in its terminal.

## Link previews in WhatsApp and Messenger

The initial HTML includes Open Graph metadata for **https://nexus-app13.vercel.app/**, plus Twitter card metadata. The shared card uses the Nexus title, description, and a branded 1200 x 630 PNG at `client/public/social-preview-v1.png`. The metadata is available without running React or signing in.

After deploying the frontend, verify that both the website and [preview image](https://nexus-app13.vercel.app/social-preview-v1.png) are publicly accessible. Share the public HTTPS website URL, rather than a localhost address. Preview appearance is controlled by the receiving app and its settings.

To change the domain or wording, edit the canonical URL and social metadata in `client/index.html`. To change the artwork, replace the PNG or regenerate it with the optional image script:

```bash
python -m pip install pillow
python client/scripts/generate-social-card.py
```

Pillow is needed only to regenerate this image; it is not required to install, build, or run Nexus. The generator uses Segoe UI, DejaVu Sans, or Arial from the local system. The PNG is checked in and copied into `client/dist` by Vite.

For a new image version, use a new filename and update the image URLs in the metadata before rebuilding and redeploying. If a shared preview is stale after deployment, you can inspect the URL using Meta's [Sharing Debugger](https://developers.facebook.com/tools/debug/).

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Send a message or save an edit | Enter |
| Insert a new line in a message | Shift + Enter |
| Open or close message search | Ctrl + K / Cmd + K |
| Close dialogs or exit composer reply/edit mode | Escape |
| Move through controls | Tab / Shift + Tab |

## Development commands

Run each command in the directory shown.

| Directory | Command | Purpose |
| --- | --- | --- |
| `server` | `npm run dev` | Start the API with automatic restarts |
| `server` | `npm start` | Start the API without the development watcher |
| `server` | `npx prisma generate` | Regenerate the Prisma client |
| `server` | `npx prisma db push` | Synchronize the development schema |
| `client` | `npm run dev` | Start the Vite development server |
| `client` | `npm run lint` | Run frontend lint checks |
| `client` | `npm run build` | Build the frontend into `client/dist` |
| `client` | `npm run preview` | Preview the built frontend locally |

### Tests

From the project root:

```bash
node --test client/src/services/conversationHistory.test.js
node --test server/tests/messageActions.test.js
```

The tests cover account-specific conversation history, landing behavior, history recovery, message ownership, editing, deletion, and authenticated sender identity. Message-action tests use mocked storage and do not modify the database. The server's `npm test` script is currently a placeholder; use the explicit commands above.

## Build and hosting

Build the frontend with `npm run build` from `client`, then serve `client/dist` using a static host. Set `VITE_API_URL` to the public backend URL **before building**, because Vite embeds it at build time.

Run the backend with `npm start` from `server`, supply its environment variables through your host, set `NODE_ENV=production`, and set `CLIENT_URL` to the frontend origin. The backend host must support persistent HTTP/WebSocket connections, Socket.IO, the `/yjs/` WebSocket path, and the background news job.

Use HTTPS in production. Refresh cookies are HTTP-only, become Secure in production, and use `SameSite=Strict`; frontend/API hosting must account for that cookie policy. `npm run preview` is intended for checking a build locally.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Vite reports an unsupported Node version | Check `node --version` and use a supported version listed above. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd` and `npx.cmd`. |
| Backend responds but login or data requests fail | Check the backend terminal for database errors. Verify `DATABASE_URL`, database availability, and schema setup. The root health route alone does not confirm database access. |
| Prisma reports missing tables or columns | Run `npx prisma generate` and `npx prisma db push` from `server` against your development database. |
| Frontend cannot connect to the API | Start both services and check `client/.env.local`. Restart Vite after changing environment variables. |
| Port 5173 is occupied | Stop the existing process, or choose another port and update `CLIENT_URL` to match. |
| Sessions repeatedly expire | Check both token secrets, cookie/hostname settings, and whether you are switching between `localhost` and `127.0.0.1`. |
| The news panel is empty | Allow the initial RSS fetch to finish and check backend logs and outbound network access. No external AI API key is required for the active RSS news feature. |

## Storage and current behavior

- Accounts, friendships, messages, groups, posts, comments, polls, and shared-note state use PostgreSQL.
- Recent-conversation history and appearance preferences use browser local storage. Conversation history is per account; appearance preferences are shared within the browser. These settings do not automatically sync to another device.
- Online presence and Forum likes are kept in server memory. Forum likes reset when the server restarts; news-card reactions are local UI state.
- Socket.IO room events and in-memory state currently run within a single backend instance. A multi-instance deployment needs shared coordination.
- Shared-note persistence is debounced, so recent edits may take a few seconds to reach the database.

## Project layout

```text
client/
  public/                 Static assets
  src/components/common/  Navigation, Home, authentication layout, settings, dialogs
  src/context/            Theme preferences
  src/features/           Authentication, chat, community, and social screens
  src/layouts/            Dashboard and screen routing
  src/services/           API, sockets, and conversation history
server/
  prisma/                 Database schema and existing migrations
  src/config/             Prisma connection
  src/controllers/        API handlers
  src/middlewares/        Authentication and input sanitization
  src/routes/             HTTP routes
  src/services/           RSS news and shared-note WebSockets
  src/sockets/            Real-time messaging events
  tests/                  Message-action tests with mocked storage
  server.js               Backend entry point
```
