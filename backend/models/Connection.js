const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  appId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['database', 'azure-logs', 'azure-blob', 'splunk', 'datadog'],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  credentials: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'inactive',
  },
  lastTested: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for faster lookups
connectionSchema.index({ appId: 1, type: 1 });

const Connection = mongoose.model('Connection', connectionSchema);

module.exports = Connection;
