// API Routes for metrics
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

// Get aggregated metrics for an application
router.get('/applications/:applicationId/metrics', metricsController.getApplicationMetrics.bind(metricsController));

// Get metrics for multiple applications
router.post('/metrics/batch', metricsController.getMultipleAppMetrics.bind(metricsController));

// Trigger manual metrics fetch
router.post('/applications/:applicationId/metrics/fetch', metricsController.triggerMetricsFetch.bind(metricsController));

// Get metrics history for date range
router.get('/applications/:applicationId/metrics/history', metricsController.getMetricsHistory.bind(metricsController));

module.exports = router;
