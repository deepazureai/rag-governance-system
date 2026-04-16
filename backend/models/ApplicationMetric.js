// MongoDB/Mongoose Schema for storing application metrics
const mongoose = require('mongoose');

const applicationMetricSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    index: true,
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Connection',
    required: true,
  },
  metrics: [{
    name: {
      type: String,
      required: true, // e.g., "Groundedness", "Relevance Score"
    },
    value: {
      type: Number,
      required: true, // e.g., 92.5
    },
    unit: String, // e.g., "%"
    category: String, // e.g., "quality", "relevance", "safety"
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
    },
    trendPercentage: Number,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  lastFetchedAt: Date,
  fetchStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending',
  },
  fetchError: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

applicationMetricSchema.index({ applicationId: 1, createdAt: -1 });

module.exports = mongoose.model('ApplicationMetric', applicationMetricSchema);
