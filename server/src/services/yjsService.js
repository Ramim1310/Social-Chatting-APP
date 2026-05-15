const WebSocket = require('ws');
const Y = require('yjs');
const prisma = require('../config/db');

// ── In-memory document store: roomId -> Y.Doc ────────────────────────────────
const docs = new Map();

// ── Debounce timers for DB persistence: roomId -> NodeJS.Timeout ─────────────
const persistTimers = new Map();

const PERSIST_DEBOUNCE_MS = 5000;

// ── Message type constants (Yjs protocol) ────────────────────────────────────
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_AUTH = 2;

// ── Encoding helpers (Yjs uses variable-length encoding) ─────────────────────
function encodeVarUint(num) {
    const buf = [];
    while (num > 0x7f) {
        buf.push((num & 0x7f) | 0x80);
        num >>>= 7;
    }
    buf.push(num);
    return Buffer.from(buf);
}

function broadcastToDoc(docName, data, excludeWs = null) {
    if (!docs.has(docName)) return;
    const { clients } = docs.get(docName);
    for (const client of clients) {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}

// ── Get or create a Y.Doc for a given room ───────────────────────────────────
async function getOrCreateDoc(docName) {
    if (docs.has(docName)) return docs.get(docName).ydoc;

    const ydoc = new Y.Doc();
    docs.set(docName, { ydoc, clients: new Set() });

    // Load persisted state from DB if it exists
    try {
        const record = await prisma.decisionNode.findUnique({ where: { roomId: docName } });
        if (record && record.state) {
            Y.applyUpdate(ydoc, new Uint8Array(record.state));
            console.log(`[Yjs] Restored state for "${docName}" from DB`);
        }
    } catch (err) {
        console.error(`[Yjs] Failed to load state for "${docName}":`, err.message);
    }

    // Listen for updates and schedule debounced DB write
    ydoc.on('update', (update) => {
        schedulePersist(docName);
    });

    return ydoc;
}

// ── Debounced persistence: write Yjs state to PostgreSQL ─────────────────────
function schedulePersist(docName) {
    if (persistTimers.has(docName)) clearTimeout(persistTimers.get(docName));

    const timer = setTimeout(async () => {
        persistTimers.delete(docName);
        const entry = docs.get(docName);
        if (!entry) return;

        const state = Buffer.from(Y.encodeStateAsUpdate(entry.ydoc));
        try {
            await prisma.decisionNode.upsert({
                where: { roomId: docName },
                update: { state },
                create: { roomId: docName, state },
            });
            console.log(`[Yjs] Persisted state for "${docName}"`);
        } catch (err) {
            console.error(`[Yjs] Failed to persist state for "${docName}":`, err.message);
        }
    }, PERSIST_DEBOUNCE_MS);

    persistTimers.set(docName, timer);
}

// ── Handle an incoming WebSocket connection for a given doc ──────────────────
async function handleConnection(ws, docName) {
    const ydoc = await getOrCreateDoc(docName);
    const entry = docs.get(docName);
    entry.clients.add(ws);

    // Step 1: Send sync step 1 (server's current state vector) to new client
    const stateVector = Y.encodeStateVector(ydoc);
    // Yjs sync step 1 message format: [MSG_SYNC, SYNC_STEP1, stateVector]
    const syncStep1 = Buffer.concat([
        encodeVarUint(MSG_SYNC),
        encodeVarUint(0), // SYNC_STEP1
        Buffer.from(stateVector),
    ]);
    if (ws.readyState === WebSocket.OPEN) ws.send(syncStep1);

    ws.on('message', (rawData) => {
        try {
            const data = rawData instanceof Buffer ? rawData : Buffer.from(rawData);
            const msgType = data[0];

            if (msgType === MSG_SYNC) {
                const syncType = data[1];

                if (syncType === 0) {
                    // Received SYNC_STEP1 from client: send a full state update (SYNC_STEP2)
                    const clientStateVector = new Uint8Array(data.slice(2));
                    const update = Y.encodeStateAsUpdate(ydoc, clientStateVector);
                    const syncStep2 = Buffer.concat([
                        encodeVarUint(MSG_SYNC),
                        encodeVarUint(1), // SYNC_STEP2
                        Buffer.from(update),
                    ]);
                    if (ws.readyState === WebSocket.OPEN) ws.send(syncStep2);
                } else if (syncType === 1 || syncType === 2) {
                    // Received SYNC_STEP2 or UPDATE from client: apply to doc and broadcast
                    const update = new Uint8Array(data.slice(2));
                    Y.applyUpdate(ydoc, update, ws); // 'ws' as origin to avoid re-applying
                    broadcastToDoc(docName, rawData, ws);
                }
            } else if (msgType === MSG_AWARENESS) {
                // Broadcast awareness (cursor positions, user presence) to everyone else
                broadcastToDoc(docName, rawData, ws);
            }
        } catch (err) {
            console.error(`[Yjs] Error processing message for "${docName}":`, err.message);
        }
    });

    ws.on('close', () => {
        entry.clients.delete(ws);
        // If no more clients, we can clean up the in-memory doc to save RAM
        if (entry.clients.size === 0) {
            schedulePersist(docName); // Final persist before eviction
            setTimeout(() => {
                // Double-check still empty before eviction
                if (docs.get(docName)?.clients.size === 0) {
                    docs.delete(docName);
                    console.log(`[Yjs] Evicted doc "${docName}" from memory`);
                }
            }, 10000);
        }
    });

    ws.on('error', (err) => {
        console.error(`[Yjs] WebSocket error for "${docName}":`, err.message);
        entry.clients.delete(ws);
    });
}

// ── Attach Yjs WebSocket handler to the HTTP server ─────────────────────────
function bindYjsServer(server) {
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        // All Yjs connections come in under /yjs/<docName>
        if (!request.url.startsWith('/yjs/')) return;

        wss.handleUpgrade(request, socket, head, (ws) => {
            const docName = decodeURIComponent(request.url.replace('/yjs/', '').split('?')[0]);
            console.log(`[Yjs] New connection for doc: "${docName}"`);
            handleConnection(ws, docName);
        });
    });

    console.log('[Yjs] CRDT WebSocket server attached');
}

module.exports = { bindYjsServer };
