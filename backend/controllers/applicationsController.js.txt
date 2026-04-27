const applicationsService = require('../services/applicationsService');
const { ApiError } = require('../utils/errors');

exports.createApplication = async (req, res, next) => {
  try {
    const { name, description, type, metadata } = req.body;
    
    if (!name || !type) {
      throw new ApiError(400, 'Missing required fields: name, type');
    }

    const application = await applicationsService.createApplication({
      name,
      description,
      type,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

exports.getApplications = async (req, res, next) => {
  try {
    const applications = await applicationsService.getApplications();
    
    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

exports.getApplication = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const application = await applicationsService.getApplication(appId);
    
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateApplication = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const updateData = req.body;

    const application = await applicationsService.updateApplication(appId, updateData);
    
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteApplication = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const result = await applicationsService.deleteApplication(appId);
    
    if (!result) {
      throw new ApiError(404, 'Application not found');
    }

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
