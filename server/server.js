const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const sanitize = require('./src/middlewares/sanitize');

// Load environment variables early on
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Configuration for CORS to keep things secure but accessible for our development
const rawOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "https://nexus-app13.vercel.app",
    process.env.CLIENT_URL,
];

// Clean up origins (remove trailing slashes and nulls)
const allowedOrigins = [...new Set(rawOrigins
    .filter(Boolean)
    .map(url => url.replace(/\/$/, "")))];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        
        // Check if origin (without trailing slash) is allowed
        const cleanOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(cleanOrigin)) return callback(null, true);
        
        // Development fallback
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        
        callback(new Error(`CORS Error: Origin ${origin} not allowed.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
};

// Initialize Socket.io with the same clean CORS logic
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : true, // true means allow all in dev if list is empty
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'] // Ensure both transports are enabled
});

// We'll use these to track who's online and map user IDs to their socket connections
const userSockets = new Map();
const onlineUsers = new Map();

// Attach these to the app instance so we can grab them in our route controllers
app.set('io', io);
app.set('userSockets', userSockets);

// Real-time collaboration engine (Yjs) for things like shared whiteboards or notes
const { bindYjsServer } = require('./src/services/yjsService');
bindYjsServer(server);

// Background job for fetching the latest news feeds
const { initNewsCron } = require('./src/services/newsService');
initNewsCron();

// Middleware stack
app.use(helmet()); // Basic security headers
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for profile pics
app.use(cookieParser());
app.use(sanitize); // Sanitize incoming request bodies, queries, and params against XSS

// Custom request logger for easier debugging during professional review
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Health check route
app.get('/', (req, res) => {
    res.send('Nexus Backend API is live and kicking!');
});

// Modular Routes - Each feature area has its own file to keep this file clean
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const communityRoutes = require('./src/routes/communityRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/community', communityRoutes);

// Main entry point for our real-time messaging logic
require('./src/sockets/socketHandler')(io, userSockets, onlineUsers);

server.listen(PORT, async () => {
    console.log(`>>> Server is humming along on port ${PORT}`);
    try {
        const prisma = require('./src/config/db');
        await prisma.$connect();
        console.log('>>> Database connection established successfully.');
    } catch (err) {
        console.error('>>> CRITICAL: Database connection failed!', err.message);
    }
});

