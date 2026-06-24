// Main Express server entry point
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import API routes
const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const bidRoutes = require('./routes/bids');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const { startCronJobs } = require('./cron');

// Initialize express app and wrap it in HTTP server for socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Save socket.io instance on express app so we can use it in routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json()); // to parse JSON bodies
app.use(morgan('dev')); // to log HTTP requests in console

// Map API endpoints to route files
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/auctions/:id/bids', bidRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Handle real-time WebSockets connections
io.on('connection', (socket) => {
  // Join a room for a specific bike auction
  socket.on('join_auction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
  });

  // Leave room when navigating away
  socket.on('leave_auction', (auctionId) => {
    socket.leave(`auction_${auctionId}`);
  });
});

// Default error handler middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start cron jobs and listen to port if we are not running unit tests
if (process.env.NODE_ENV !== 'test') {
  startCronJobs();

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Socket.io enabled for real-time bid updates');
  });
}

module.exports = app;
