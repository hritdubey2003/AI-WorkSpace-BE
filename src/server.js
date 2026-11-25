require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const documentRoutes = require('./routes/document.routes');
const aiRoutes = require('./routes/ai.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { setupDocumentSockets } = require('./sockets/document.socket');

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL ,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);

// Socket setup
setupDocumentSockets(io);

// Error handler
app.use(errorHandler);

// On Vercel the platform accepts connections itself and calls the exported server,
// so only start listening when running anywhere else (local dev, Render, etc.).
if (!process.env.VERCEL) {
  const PORT = process.env.PORT;
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready`);
  });
}

// Vercel requires the default export to be a function or an HTTP server.
// Exporting the HTTP server (not just `app`) keeps Socket.IO reachable too.
module.exports = httpServer;