const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectionsRoutes = require('./routes/connectionsRoutes');
const applicationsRoutes = require('./routes/applicationsRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Database connection
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/rag-evaluation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.use('/api/connections', connectionsRoutes);
app.use('/api/applications', applicationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      status: 404,
      message: 'Route not found',
    },
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
