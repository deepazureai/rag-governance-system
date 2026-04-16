const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');

// Create new connection for an application
router.post('/', connectionsController.createConnection);

// Get all connections for an application
router.get('/app/:appId', connectionsController.getConnectionsByApp);

// Get specific connection
router.get('/:connectionId', connectionsController.getConnection);

// Update connection
router.put('/:connectionId', connectionsController.updateConnection);

// Delete connection
router.delete('/:connectionId', connectionsController.deleteConnection);

// Test connection
router.post('/:connectionId/test', connectionsController.testConnection);

// Get connection status
router.get('/:connectionId/status', connectionsController.getConnectionStatus);

module.exports = router;
