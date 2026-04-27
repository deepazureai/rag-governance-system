const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectionsRoutes = require('./routes/connectionsRoutes');
const applicationsRoutes = require('./routes/applicationsRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const appInsights = require('./utils/appInsights');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { enhancedErrorHandler } = require('./middleware/enhancedErrorHandler');
const { NotFoundError } = require('./utils/enhancedErrors');
const MetricsCollectionJob = require('./jobs/metricsCollectionJob');

const app = express();

// Initialize Application Insights
appInsights.initialize();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging with correlation IDs
app.use(requestLogger);

// Database connection
mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/rag-evaluation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

logger.info('Backend started', { environment: process.env.NODE_ENV });

// Routes
app.use('/api/connections', connectionsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api', metricsRoutes);

// Start scheduled metrics collection (every 5 minutes)
MetricsCollectionJob.startScheduledCollection(5);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res, next) => {
  const error = new NotFoundError('Endpoint', 'The requested endpoint does not exist', {
    method: req.method,
    path: req.path,
  });
  next(error);
});

// Error handling middleware (must be last)
app.use(enhancedErrorHandler);

module.exports = app;
