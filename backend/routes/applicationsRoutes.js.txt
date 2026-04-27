const express = require('express');
const router = express.Router();
const applicationsController = require('../controllers/applicationsController');

// Create new application
router.post('/', applicationsController.createApplication);

// Get all applications
router.get('/', applicationsController.getApplications);

// Get specific application
router.get('/:appId', applicationsController.getApplication);

// Update application
router.put('/:appId', applicationsController.updateApplication);

// Delete application
router.delete('/:appId', applicationsController.deleteApplication);

module.exports = router;
