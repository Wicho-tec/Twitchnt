const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const db = require('./db');
const { router: authRoutes } = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const mediamtxRoutes = require('./routes/mediamtx');
const { setupChatSockets } = require('./sockets/chat');
const { authenticateToken } = require('./routes/auth');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  if (req.path !== '/health') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint for Kubernetes probes (liveness & readiness)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'twitchnt-backend',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/mediamtx', mediamtxRoutes);
app.get('/api/following', authenticateToken, async (req, res, next) => {
  try {
    const ids = await db.following(req.user.id);
    const channels = await db.listChannels();
    res.json(channels.filter(c => ids.includes(c.id)).map(({ streamKey, ...c }) => c));
  } catch (err) { next(err); }
});
app.use('/vod', express.static(process.env.RECORDINGS_PATH || path.join(__dirname, '../../recordings'), { dotfiles: 'deny' }));
app.use('/thumbnails', express.static(path.join(process.env.RECORDINGS_PATH || path.join(__dirname, '../../recordings'), 'thumbnails')));

// Socket.io Chat Setup
setupChatSockets(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Server bootstrap
async function startServer() {
  try {
    await db.initDb();
    mediamtxRoutes.startPolling(io);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Twitchnt Backend escuchando en http://0.0.0.0:${PORT}`);
      console.log(`💬 Socket.io habilitado para chat en tiempo real`);
      console.log(`🩺 Health check disponible en http://0.0.0.0:${PORT}/health`);
    });
  } catch (err) {
    console.error('❌ Error al inicializar servidor:', err);
    process.exit(1);
  }
}

startServer();
