const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const pantryRoutes = require('./routes/pantries');
const messageRoutes = require('./routes/messages');
const donationRoutes = require('./routes/donations');
const telemetryRoutes = require('./routes/telemetry');
const wishlistRoutes = require('./routes/wishlist');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint for quick manual checks
app.get('/', (req, res) => {
  res.status(200).send('Pantry Map Backend is running. Try /api/health');
});

// API Routes
app.use('/api/pantries', pantryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});

module.exports = app;


